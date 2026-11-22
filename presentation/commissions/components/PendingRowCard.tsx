"use client";

import { useState } from "react";
import { AlertCircle, Check, Lightbulb, Trash2 } from "lucide-react";
import type { IssueField } from "@/domain/commissions/entities/pending-issue";
import type {
  ParsedSaleRecord,
  SaleResolution,
} from "@/domain/commissions/entities/sale";
import { PendingIssueControls } from "./PendingIssueControls";

interface PendingRowCardProps {
  row: ParsedSaleRecord;
  activeSellers: readonly string[];
  onResolve: (resolution: SaleResolution) => void;
  onAddSeller: (canonicalName: string, aliases?: string[]) => void;
  onMapAlias: (rawAlias: string, canonicalName: string) => void;
}

export function PendingRowCard({
  row,
  activeSellers,
  onResolve,
  onAddSeller,
  onMapAlias,
}: PendingRowCardProps) {
  const [draft, setDraft] = useState<SaleResolution>({
    rowId: row.id,
    action: "resolve",
  });

  const issueFields = new Set<IssueField>(row.issues.map((i) => i.field));
  const isSingleIssue = row.issues.length === 1;

  const handlePatchDraft = (patch: Partial<SaleResolution>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleQuickCommit = (patch: Partial<SaleResolution>) => {
    onResolve({
      ...draft,
      ...patch,
      rowId: row.id,
      action: "resolve",
    });
  };

  const handleDiscard = () => {
    onResolve({
      rowId: row.id,
      action: "discard",
      keepDuplicate: false,
    });
  };

  const rawCells: Array<{
    label: string;
    field: IssueField;
    value: string;
  }> = [
    { label: "Data", field: "data", value: row.raw.data || "(vazio)" },
    {
      label: "Vendedor",
      field: "vendedor",
      value: row.raw.vendedor || "(vazio)",
    },
    { label: "Valor", field: "valor", value: row.raw.valor || "(vazio)" },
    { label: "Tipo", field: "tipo", value: row.raw.tipo || "(vazio)" },
    { label: "Status", field: "status", value: row.raw.status || "(vazio)" },
    { label: "Obs", field: "obs", value: row.raw.obs || "—" },
  ];

  return (
    <article className="rounded-xl border border-amber-200/90 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 font-mono text-xs font-semibold text-amber-900">
            Linha {row.lineNumber}
          </span>
          <h3 className="text-sm font-semibold text-slate-900">
            {row.client || "(Cliente não informado)"}
          </h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {row.issues.length} alerta(s)
          </span>
        </div>

        <button
          type="button"
          onClick={handleDiscard}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-700"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Descartar linha
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {rawCells.map((cell) => {
          const hasError = issueFields.has(cell.field);
          return (
            <div
              key={cell.label}
              className={`rounded-lg border px-2.5 py-1.5 ${
                hasError
                  ? "border-rose-300 bg-rose-50/70"
                  : "border-slate-200/80 bg-slate-50/70"
              }`}
            >
              <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                {cell.label}
              </span>
              <span
                className={`mt-0.5 block truncate text-xs font-medium ${
                  hasError ? "text-rose-900" : "text-slate-800"
                }`}
                title={cell.value}
              >
                {cell.value}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 space-y-3">
        {row.issues.map((issue, idx) => (
          <div
            key={`${issue.code}-${idx}`}
            className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
          >
            <div className="flex items-start gap-2">
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs font-medium text-slate-800">
                  {issue.message}
                </p>

                {issue.suggestion && (
                  <div className="flex items-start gap-1.5 rounded-md border border-blue-200/80 bg-blue-50/70 px-2.5 py-1.5 text-xs text-blue-900">
                    <Lightbulb
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600"
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{issue.suggestion.label}:</strong>{" "}
                      {issue.suggestion.reason}
                    </span>
                  </div>
                )}

                <PendingIssueControls
                  row={row}
                  issue={issue}
                  draft={draft}
                  activeSellers={activeSellers}
                  isSingleIssue={isSingleIssue}
                  onPatchDraft={handlePatchDraft}
                  onQuickCommit={handleQuickCommit}
                  onDiscardRow={handleDiscard}
                  onAddSeller={onAddSeller}
                  onMapAlias={onMapAlias}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isSingleIssue && (
        <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => onResolve(draft)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Aplicar correções selecionadas
          </button>
        </div>
      )}
    </article>
  );
}
