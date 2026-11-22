import type { SaleResolution } from "../entities/sale";
import type { SellerRegistry } from "../entities/seller";

export interface CsvBatchSnapshot {
  id: string;
  name: string;
  csvText: string;
  uploadedAt: string;
}

export interface WorkspaceSnapshot {
  version: number;
  batches: CsvBatchSnapshot[];
  resolutions: Record<string, SaleResolution>;
  sellerRegistry: SellerRegistry;
}

export interface WorkspaceRepositoryPort {
  load(): WorkspaceSnapshot | null;
  save(snapshot: WorkspaceSnapshot): void;
  clear(): void;
}
