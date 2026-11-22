"use client";

import { FileSpreadsheet, RotateCcw, Upload } from "lucide-react";
import type { CsvBatchSnapshot } from "@/domain/commissions/ports/workspace-repository.port";
import type { WorkspaceSourceMode } from "../store/workspace-store";

interface WorkspaceHeaderProps {
  batches: readonly CsvBatchSnapshot[];
  totalRows: number;
  sourceMode: WorkspaceSourceMode;
  hasDefaultAvailable: boolean;
  hasResolutions: boolean;
  onOpenUpload: () => void;
  onResetToDefault: () => void;
}

export function WorkspaceHeader({
  batches,
  totalRows,
  sourceMode,
  hasDefaultAvailable,
  hasResolutions,
  onOpenUpload,
  onResetToDefault,
}: WorkspaceHeaderProps) {
  const showReset =
    sourceMode === "custom" || (sourceMode === "default" && hasResolutions);

  const batchSummary =
    batches.length === 0
      ? "Nenhum arquivo carregado"
      : batches.length === 1
        ? `${batches[0].name} · ${totalRows} linha(s)`
        : `${batches.length} arquivos mesclados · ${totalRows} linha(s)`;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                Nuvem Fiscal · Comissões
              </h1>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                Meta R$ 120k · 5% / 8% / 2%
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{batchSummary}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {showReset && (
            <button
              type="button"
              onClick={onResetToDefault}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4 text-slate-500" aria-hidden="true" />
              {hasDefaultAvailable ? "Restaurar Jul–Out" : "Limpar base"}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Importar CSV
          </button>
        </div>
      </div>
    </header>
  );
}
