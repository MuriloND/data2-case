"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { DefaultCsvPayload } from "@/infrastructure/server/default-csv.loader";
import { createCommissionServices } from "../composition";
import {
  createWorkspaceStore,
  type WorkspaceState,
  type WorkspaceStore,
} from "../store/workspace-store";

export interface UseCommissionWorkspaceReturn {
  state: WorkspaceState;
  store: WorkspaceStore;
  services: ReturnType<typeof createCommissionServices>;
}

export function useCommissionWorkspace(
  initialCsv: DefaultCsvPayload | null
): UseCommissionWorkspaceReturn {
  const [bundle] = useState(() => {
    const services = createCommissionServices();
    const store = createWorkspaceStore(services, initialCsv);
    return { services, store };
  });

  useEffect(() => {
    bundle.store.hydrateFromRepository();
  }, [bundle]);

  const state = useSyncExternalStore(
    bundle.store.subscribe,
    bundle.store.getSnapshot,
    bundle.store.getServerSnapshot
  );

  return {
    state,
    store: bundle.store,
    services: bundle.services,
  };
}
