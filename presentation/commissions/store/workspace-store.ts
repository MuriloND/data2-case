import type { CommissionReport } from "@/domain/commissions/entities/ledger";
import type {
  ParsedSaleRecord,
  SaleResolution,
} from "@/domain/commissions/entities/sale";
import {
  addAliasToRegistry,
  addSellerToRegistry,
  createDefaultSellerRegistry,
  type SellerRegistry,
} from "@/domain/commissions/entities/seller";
import type {
  CsvBatchSnapshot,
  WorkspaceSnapshot,
} from "@/domain/commissions/ports/workspace-repository.port";
import {
  WORKSPACE_SNAPSHOT_VERSION,
} from "@/infrastructure/persistence/local-storage-workspace.repository";
import {
  SYNTHETIC_SAMPLE_CSV,
  SYNTHETIC_SAMPLE_FILENAME,
} from "@/infrastructure/demo/synthetic-sample-csv";
import type { DefaultCsvPayload } from "@/infrastructure/server/default-csv.loader";
import type { CommissionServices } from "../composition";

export type WorkspaceSourceMode = "default" | "custom" | "empty";

export interface UploadBatchFeedback {
  batchId: string;
  fileName: string;
  mode: "replace" | "append";
  addedRowsCount: number;
  pendingCount: number;
  missingColumns: string[];
}

export interface WorkspaceState {
  batches: readonly CsvBatchSnapshot[];
  resolutions: Readonly<Record<string, SaleResolution>>;
  sellerRegistry: SellerRegistry;
  sourceMode: WorkspaceSourceMode;
  hasDefaultAvailable: boolean;
  rows: readonly ParsedSaleRecord[];
  report: CommissionReport;
  lastUploadFeedback: UploadBatchFeedback | null;
  hydrated: boolean;
}

type StoreListener = () => void;

const DEFAULT_BATCH_ID = "default-jul-out";

function buildBatchId(prefix: string, index: number): string {
  const slug = prefix
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `${slug || "lote"}-${index}`;
}

export class WorkspaceStore {
  private readonly listeners = new Set<StoreListener>();
  private readonly serverSnapshot: WorkspaceState;
  private snapshot: WorkspaceState;
  private hasHydrated = false;
  private batchCounter = 1;

  constructor(
    private readonly services: CommissionServices,
    private readonly initialCsv: DefaultCsvPayload | null
  ) {
    const initialBatches: CsvBatchSnapshot[] = initialCsv
      ? [
          {
            id: DEFAULT_BATCH_ID,
            name: initialCsv.fileName,
            csvText: initialCsv.csvText,
            uploadedAt: "initial",
          },
        ]
      : [];

    const initialMode: WorkspaceSourceMode = initialCsv ? "default" : "empty";

    this.serverSnapshot = this.computeState({
      batches: initialBatches,
      resolutions: {},
      sellerRegistry: createDefaultSellerRegistry(),
      sourceMode: initialMode,
      lastUploadFeedback: null,
      hydrated: false,
    });
    this.snapshot = this.serverSnapshot;
  }

  subscribe = (listener: StoreListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): WorkspaceState => this.snapshot;

  getServerSnapshot = (): WorkspaceState => this.serverSnapshot;

  hydrateFromRepository(): void {
    if (this.hasHydrated) {
      return;
    }
    this.hasHydrated = true;

    const persisted = this.services.workspaceRepository.load();
    if (!persisted) {
      this.snapshot = { ...this.snapshot, hydrated: true };
      this.emit();
      return;
    }

    const isDefaultSingleBatch =
      persisted.batches.length === 1 &&
      persisted.batches[0]?.id === DEFAULT_BATCH_ID;
    const sourceMode: WorkspaceSourceMode =
      persisted.batches.length === 0
        ? "empty"
        : isDefaultSingleBatch
          ? "default"
          : "custom";

    this.batchCounter = Math.max(this.batchCounter, persisted.batches.length + 1);

    this.snapshot = this.computeState({
      batches: persisted.batches,
      resolutions: persisted.resolutions,
      sellerRegistry: persisted.sellerRegistry,
      sourceMode,
      lastUploadFeedback: null,
      hydrated: true,
    });
    this.emit();
  }

  replaceWithCsv(fileName: string, csvText: string): UploadBatchFeedback {
    const batchId = buildBatchId(fileName, this.batchCounter);
    this.batchCounter += 1;

    const batch: CsvBatchSnapshot = {
      id: batchId,
      name: fileName,
      csvText,
      uploadedAt: new Date().toISOString(),
    };

    const { rows, missingColumns } = this.ingestBatches(
      [batch],
      this.snapshot.sellerRegistry
    );

    const feedback: UploadBatchFeedback = {
      batchId,
      fileName,
      mode: "replace",
      addedRowsCount: rows.length,
      pendingCount: rows.filter((row) => row.issues.length > 0).length,
      missingColumns,
    };

    this.commitState(
      {
        batches: [batch],
        resolutions: {},
        sellerRegistry: this.snapshot.sellerRegistry,
        sourceMode: "custom",
        lastUploadFeedback: feedback,
        hydrated: true,
      },
      true
    );

    return feedback;
  }

  appendCsv(fileName: string, csvText: string): UploadBatchFeedback {
    if (this.snapshot.batches.length === 0) {
      return this.replaceWithCsv(fileName, csvText);
    }

    const batchId = buildBatchId(fileName, this.batchCounter);
    this.batchCounter += 1;

    const newBatch: CsvBatchSnapshot = {
      id: batchId,
      name: fileName,
      csvText,
      uploadedAt: new Date().toISOString(),
    };

    const existingResult = this.ingestBatches(
      this.snapshot.batches,
      this.snapshot.sellerRegistry
    );
    const appendedIngest = this.services.ingestSalesUseCase.execute({
      input: csvText,
      batchId,
      sellerRegistry: this.snapshot.sellerRegistry,
      existingRows: existingResult.rows,
    });

    const feedback: UploadBatchFeedback = {
      batchId,
      fileName,
      mode: "append",
      addedRowsCount: appendedIngest.rows.length,
      pendingCount: appendedIngest.pendingRows.length,
      missingColumns: appendedIngest.missingColumns,
    };

    this.commitState(
      {
        batches: [...this.snapshot.batches, newBatch],
        resolutions: this.snapshot.resolutions,
        sellerRegistry: this.snapshot.sellerRegistry,
        sourceMode: "custom",
        lastUploadFeedback: feedback,
        hydrated: true,
      },
      true
    );

    return feedback;
  }

  resolveRow(resolution: SaleResolution): void {
    const nextResolutions: Record<string, SaleResolution> = {
      ...this.snapshot.resolutions,
      [resolution.rowId]: {
        ...resolution,
        resolvedAt: resolution.resolvedAt ?? new Date().toISOString(),
      },
    };

    this.commitState(
      {
        batches: this.snapshot.batches,
        resolutions: nextResolutions,
        sellerRegistry: this.snapshot.sellerRegistry,
        sourceMode: this.snapshot.sourceMode,
        lastUploadFeedback: this.snapshot.lastUploadFeedback,
        hydrated: true,
      },
      true
    );
  }

  undoResolution(rowId: string): void {
    if (!(rowId in this.snapshot.resolutions)) {
      return;
    }

    const nextResolutions = { ...this.snapshot.resolutions };
    delete nextResolutions[rowId];

    this.commitState(
      {
        batches: this.snapshot.batches,
        resolutions: nextResolutions,
        sellerRegistry: this.snapshot.sellerRegistry,
        sourceMode: this.snapshot.sourceMode,
        lastUploadFeedback: this.snapshot.lastUploadFeedback,
        hydrated: true,
      },
      true
    );
  }

  addSeller(canonicalName: string, aliases: string[] = []): void {
    const nextRegistry = addSellerToRegistry(
      this.snapshot.sellerRegistry,
      canonicalName,
      aliases
    );

    this.commitState(
      {
        batches: this.snapshot.batches,
        resolutions: this.snapshot.resolutions,
        sellerRegistry: nextRegistry,
        sourceMode: this.snapshot.sourceMode,
        lastUploadFeedback: this.snapshot.lastUploadFeedback,
        hydrated: true,
      },
      true
    );
  }

  mapAlias(rawAlias: string, canonicalName: string): void {
    const nextRegistry = addAliasToRegistry(
      this.snapshot.sellerRegistry,
      rawAlias,
      canonicalName
    );

    this.commitState(
      {
        batches: this.snapshot.batches,
        resolutions: this.snapshot.resolutions,
        sellerRegistry: nextRegistry,
        sourceMode: this.snapshot.sourceMode,
        lastUploadFeedback: this.snapshot.lastUploadFeedback,
        hydrated: true,
      },
      true
    );
  }

  dismissUploadFeedback(): void {
    if (!this.snapshot.lastUploadFeedback) {
      return;
    }
    this.snapshot = {
      ...this.snapshot,
      lastUploadFeedback: null,
    };
    this.emit();
  }

  loadSyntheticSample(): UploadBatchFeedback {
    return this.replaceWithCsv(
      SYNTHETIC_SAMPLE_FILENAME,
      SYNTHETIC_SAMPLE_CSV
    );
  }

  resetToDefault(): void {
    this.services.workspaceRepository.clear();

    const defaultBatches: CsvBatchSnapshot[] = this.initialCsv
      ? [
          {
            id: DEFAULT_BATCH_ID,
            name: this.initialCsv.fileName,
            csvText: this.initialCsv.csvText,
            uploadedAt: "initial",
          },
        ]
      : [];

    this.commitState(
      {
        batches: defaultBatches,
        resolutions: {},
        sellerRegistry: createDefaultSellerRegistry(),
        sourceMode: this.initialCsv ? "default" : "empty",
        lastUploadFeedback: null,
        hydrated: true,
      },
      false
    );
  }

  private ingestBatches(
    batches: readonly CsvBatchSnapshot[],
    sellerRegistry: SellerRegistry
  ): { rows: ParsedSaleRecord[]; missingColumns: string[] } {
    const accumulated: ParsedSaleRecord[] = [];
    const missingColumnsSet = new Set<string>();

    for (const batch of batches) {
      const ingested = this.services.ingestSalesUseCase.execute({
        input: batch.csvText,
        batchId: batch.id,
        sellerRegistry,
        existingRows: accumulated,
      });
      accumulated.push(...ingested.rows);
      for (const col of ingested.missingColumns) {
        missingColumnsSet.add(col);
      }
    }

    return {
      rows: accumulated,
      missingColumns: Array.from(missingColumnsSet),
    };
  }

  private computeState(params: {
    batches: readonly CsvBatchSnapshot[];
    resolutions: Readonly<Record<string, SaleResolution>>;
    sellerRegistry: SellerRegistry;
    sourceMode: WorkspaceSourceMode;
    lastUploadFeedback: UploadBatchFeedback | null;
    hydrated: boolean;
  }): WorkspaceState {
    const { rows } = this.ingestBatches(params.batches, params.sellerRegistry);
    const report = this.services.calculateCommissionsUseCase.execute({
      rows,
      resolutions: params.resolutions,
      sellerRegistry: params.sellerRegistry,
    });

    return {
      batches: params.batches,
      resolutions: params.resolutions,
      sellerRegistry: params.sellerRegistry,
      sourceMode: params.sourceMode,
      hasDefaultAvailable: this.initialCsv !== null,
      rows,
      report,
      lastUploadFeedback: params.lastUploadFeedback,
      hydrated: params.hydrated,
    };
  }

  private commitState(
    params: {
      batches: readonly CsvBatchSnapshot[];
      resolutions: Readonly<Record<string, SaleResolution>>;
      sellerRegistry: SellerRegistry;
      sourceMode: WorkspaceSourceMode;
      lastUploadFeedback: UploadBatchFeedback | null;
      hydrated: boolean;
    },
    persist: boolean
  ): void {
    this.snapshot = this.computeState(params);

    if (persist) {
      const snapshotToPersist: WorkspaceSnapshot = {
        version: WORKSPACE_SNAPSHOT_VERSION,
        batches: [...params.batches],
        resolutions: { ...params.resolutions },
        sellerRegistry: params.sellerRegistry,
      };
      this.services.workspaceRepository.save(snapshotToPersist);
    }

    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export function createWorkspaceStore(
  services: CommissionServices,
  initialCsv: DefaultCsvPayload | null
): WorkspaceStore {
  return new WorkspaceStore(services, initialCsv);
}
