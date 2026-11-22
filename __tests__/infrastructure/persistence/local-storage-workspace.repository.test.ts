import { describe, expect, it } from "vitest";
import { createDefaultSellerRegistry } from "@/domain/commissions/entities/seller";
import type { WorkspaceSnapshot } from "@/domain/commissions/ports/workspace-repository.port";
import {
  LocalStorageWorkspaceRepository,
  WORKSPACE_SNAPSHOT_VERSION,
  WORKSPACE_STORAGE_KEY,
  type StorageLike,
} from "@/infrastructure/persistence/local-storage-workspace.repository";

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe("LocalStorageWorkspaceRepository", () => {
  it("saves, loads, and clears valid workspace snapshots", () => {
    const storage = createMemoryStorage();
    const repo = new LocalStorageWorkspaceRepository(storage);

    const snapshot: WorkspaceSnapshot = {
      version: WORKSPACE_SNAPSHOT_VERSION,
      batches: [
        {
          id: "b1",
          name: "nov.csv",
          csvText: "data,vendedor,cliente,valor,tipo,status,obs\n",
          uploadedAt: "2025-11-01T10:00:00.000Z",
        },
      ],
      resolutions: {
        "b1:L2": { rowId: "b1:L2", action: "resolve", type: "nova" },
      },
      sellerRegistry: createDefaultSellerRegistry(),
    };

    repo.save(snapshot);
    expect(repo.load()).toEqual(snapshot);

    repo.clear();
    expect(repo.load()).toBeNull();
  });

  it("returns null gracefully on corrupted JSON or mismatched snapshot version", () => {
    const storage = createMemoryStorage();
    const repo = new LocalStorageWorkspaceRepository(storage);

    storage.setItem(WORKSPACE_STORAGE_KEY, "{not-valid-json");
    expect(repo.load()).toBeNull();

    storage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({ version: 999, batches: [] })
    );
    expect(repo.load()).toBeNull();
  });

  it("handles null storage safely (SSR mode)", () => {
    const repo = new LocalStorageWorkspaceRepository(null);
    expect(repo.load()).toBeNull();
    expect(() =>
      repo.save({
        version: WORKSPACE_SNAPSHOT_VERSION,
        batches: [],
        resolutions: {},
        sellerRegistry: createDefaultSellerRegistry(),
      })
    ).not.toThrow();
    expect(() => repo.clear()).not.toThrow();
  });
});
