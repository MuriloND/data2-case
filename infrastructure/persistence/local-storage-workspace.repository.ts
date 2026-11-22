import type {
  WorkspaceRepositoryPort,
  WorkspaceSnapshot,
} from "@/domain/commissions/ports/workspace-repository.port";

export const WORKSPACE_STORAGE_KEY = "nuvem-fiscal:commissions:v1";
export const WORKSPACE_SNAPSHOT_VERSION = 1;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function resolveStorage(explicitStorage?: StorageLike | null): StorageLike | null {
  if (explicitStorage !== undefined) {
    return explicitStorage;
  }
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValidSnapshot(value: unknown): value is WorkspaceSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<WorkspaceSnapshot>;
  if (candidate.version !== WORKSPACE_SNAPSHOT_VERSION) {
    return false;
  }
  if (!Array.isArray(candidate.batches)) {
    return false;
  }
  if (!candidate.resolutions || typeof candidate.resolutions !== "object") {
    return false;
  }
  if (
    !candidate.sellerRegistry ||
    !Array.isArray(candidate.sellerRegistry.sellers) ||
    typeof candidate.sellerRegistry.customAliases !== "object"
  ) {
    return false;
  }
  return true;
}

export class LocalStorageWorkspaceRepository
  implements WorkspaceRepositoryPort
{
  constructor(
    private readonly storage?: StorageLike | null,
    private readonly storageKey: string = WORKSPACE_STORAGE_KEY
  ) {}

  load(): WorkspaceSnapshot | null {
    const target = resolveStorage(this.storage);
    if (!target) {
      return null;
    }

    try {
      const raw = target.getItem(this.storageKey);
      if (!raw) {
        return null;
      }
      const parsed: unknown = JSON.parse(raw);
      return isValidSnapshot(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  save(snapshot: WorkspaceSnapshot): void {
    const target = resolveStorage(this.storage);
    if (!target) {
      return;
    }

    try {
      target.setItem(this.storageKey, JSON.stringify(snapshot));
    } catch {
      // Ignore storage quota / privacy mode write errors gracefully.
    }
  }

  clear(): void {
    const target = resolveStorage(this.storage);
    if (!target) {
      return;
    }

    try {
      target.removeItem(this.storageKey);
    } catch {
      // Ignore storage removal errors gracefully.
    }
  }
}

export function createLocalStorageWorkspaceRepository(
  storage?: StorageLike | null
): WorkspaceRepositoryPort {
  return new LocalStorageWorkspaceRepository(storage);
}
