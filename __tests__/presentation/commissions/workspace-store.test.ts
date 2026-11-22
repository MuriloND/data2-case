import { describe, expect, it } from "vitest";
import { createDefaultSellerRegistry } from "@/domain/commissions/entities/seller";
import type {
  WorkspaceRepositoryPort,
  WorkspaceSnapshot,
} from "@/domain/commissions/ports/workspace-repository.port";
import { createCommissionServices } from "@/presentation/commissions/composition";
import { createWorkspaceStore } from "@/presentation/commissions/store/workspace-store";

function createInMemoryRepo(): WorkspaceRepositoryPort {
  let saved: WorkspaceSnapshot | null = null;
  return {
    load: () => saved,
    save: (snapshot) => {
      saved = snapshot;
    },
    clear: () => {
      saved = null;
    },
  };
}

describe("WorkspaceStore", () => {
  const sampleCsv = [
    "data,vendedor,cliente,valor,tipo,status,obs",
    "01/11/2025,Rafa,Cliente Alpha,20000,nova,fechado,",
    "02/11/2025,NovoConsultor,Cliente Beta,10000,,fechado,",
  ].join("\n");

  it("initializes, resolves pending items, supports undo, and recalculates totals immediately", () => {
    const repo = createInMemoryRepo();
    const services = createCommissionServices(repo);
    const store = createWorkspaceStore(services, {
      fileName: "base.csv",
      csvText: sampleCsv,
    });

    expect(store.getSnapshot().report.pendingRows).toHaveLength(1);
    expect(store.getSnapshot().report.grandTotalCents).toBe(100_000);

    const pendingRow = store.getSnapshot().report.pendingRows[0];
    store.resolveRow({
      rowId: pendingRow.id,
      action: "resolve",
      sellers: ["Bruno Sá"],
      type: "nova",
    });

    expect(store.getSnapshot().report.pendingRows).toHaveLength(0);
    expect(store.getSnapshot().report.resolvedRows).toHaveLength(1);
    expect(store.getSnapshot().report.grandTotalCents).toBe(150_000);
    expect(repo.load()?.resolutions[pendingRow.id]).toBeDefined();

    store.undoResolution(pendingRow.id);
    expect(store.getSnapshot().report.pendingRows).toHaveLength(1);
    expect(store.getSnapshot().report.grandTotalCents).toBe(100_000);
  });

  it("re-ingests batches when mapping an alias or adding a new seller and resolves unknown seller tokens", () => {
    const repo = createInMemoryRepo();
    const services = createCommissionServices(repo);
    const store = createWorkspaceStore(services, {
      fileName: "base.csv",
      csvText: [
        "data,vendedor,cliente,valor,tipo,status,obs",
        "02/11/2025,NovoConsultor,Cliente Beta,10000,nova,fechado,",
      ].join("\n"),
    });

    expect(store.getSnapshot().report.pendingRows).toHaveLength(1);

    store.mapAlias("NovoConsultor", "Camila Teixeira");
    expect(store.getSnapshot().report.pendingRows).toHaveLength(0);
    expect(
      store.getSnapshot().report.sellerTotals["Camila Teixeira"]
    ).toBe(50_000);

    store.resetToDefault();
    expect(store.getSnapshot().report.pendingRows).toHaveLength(1);

    store.addSeller("João Silva", ["NovoConsultor"]);
    expect(store.getSnapshot().report.pendingRows).toHaveLength(0);
    expect(store.getSnapshot().report.sellerTotals["João Silva"]).toBe(50_000);
  });

  it("supports incremental batch append with cross-batch duplicate detection and synthetic sample loading", () => {
    const repo = createInMemoryRepo();
    const services = createCommissionServices(repo);
    const store = createWorkspaceStore(services, null);

    expect(store.getSnapshot().sourceMode).toBe("empty");
    expect(store.getSnapshot().batches).toHaveLength(0);

    store.replaceWithCsv(
      "nov.csv",
      [
        "data,vendedor,cliente,valor,tipo,status,obs",
        "01/11/2025,Rafa,Empresa X,10000,nova,fechado,",
      ].join("\n")
    );

    const appendFeedback = store.appendCsv(
      "nov-extra.csv",
      [
        "data,vendedor,cliente,valor,tipo,status,obs",
        "01/11/2025,Rafael Moura,Empresa X,10000,nova,fechado,",
      ].join("\n")
    );

    expect(store.getSnapshot().batches).toHaveLength(2);
    expect(appendFeedback.pendingCount).toBe(1);
    expect(store.getSnapshot().report.pendingRows[0].issues[0].code).toBe(
      "DUPLICATE_SUSPECT"
    );

    store.loadSyntheticSample();
    expect(store.getSnapshot().batches).toHaveLength(1);
    expect(store.getSnapshot().rows.length).toBeGreaterThan(5);
  });

  it("hydrates cleanly from persisted snapshot", () => {
    const repo = createInMemoryRepo();
    repo.save({
      version: 1,
      batches: [
        {
          id: "persisted-1",
          name: "salvo.csv",
          csvText: [
            "data,vendedor,cliente,valor,tipo,status,obs",
            "05/11/2025,Bruno Sá,Cliente Salvo,10000,nova,fechado,",
          ].join("\n"),
          uploadedAt: "2025-11-05T10:00:00.000Z",
        },
      ],
      resolutions: {},
      sellerRegistry: createDefaultSellerRegistry(),
    });

    const services = createCommissionServices(repo);
    const store = createWorkspaceStore(services, null);
    expect(store.getSnapshot().batches).toHaveLength(0);

    store.hydrateFromRepository();
    expect(store.getSnapshot().hydrated).toBe(true);
    expect(store.getSnapshot().batches).toHaveLength(1);
    expect(store.getSnapshot().report.sellerTotals["Bruno Sá"]).toBe(50_000);
  });
});
