"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, Search } from "lucide-react";
import type { IssueCode } from "@/domain/commissions/entities/pending-issue";
import type {
  ParsedSaleRecord,
  SaleResolution,
} from "@/domain/commissions/entities/sale";
import { formatBrlCents } from "@/domain/commissions/services/normalizers/currency-normalizer";
import { PendingRowCard } from "./PendingRowCard";

interface PendingQueueTabProps {
  pendingRows: readonly ParsedSaleRecord[];
  resolvedRows: readonly ParsedSaleRecord[];
  discardedRows: readonly ParsedSaleRecord[];
  activeSellers: readonly string[];
  onResolve: (resolution: SaleResolution) => void;
  onUndo: (rowId: string) => void;
  onAddSeller: (canonicalName: string, aliases?: string[]) => void;
  onMapAlias: (rawAlias: string, canonicalName: string) => void;
}

type QueueView = "pending" | "resolved" | "discarded";
type IssueCategory =
  | "all"
  | "type"
  | "value"
  | "seller"
  | "split"
  | "cancellation"
  | "duplicate"
  | "other";

const CATEGORY_TO_CODES: Record<Exclude<IssueCategory, "all">, IssueCode[]> = {
  type: ["MISSING_TYPE", "UNKNOWN_TYPE"],
  value: ["INVALID_VALUE", "UNCONFIRMED_VALUE"],
  seller: ["MISSING_SELLER", "UNKNOWN_SELLER", "FORMER_EMPLOYEE"],
  split: ["AMBIGUOUS_SPLIT"],
  cancellation: ["MISSING_CANCELLATION_MONTH", "INVALID_CANCELLATION_MONTH"],
  duplicate: ["DUPLICATE_SUSPECT"],
  other: ["INVALID_DATE", "UNKNOWN_STATUS"],
};

const PAGE_SIZE = 25;

export function PendingQueueTab({
  pendingRows,
  resolvedRows,
  discardedRows,
  activeSellers,
  onResolve,
  onUndo,
  onAddSeller,
  onMapAlias,
}: PendingQueueTabProps) {
  const [view, setView] = useState<QueueView>("pending");
  const [category, setCategory] = useState<IssueCategory>("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const normalizedQuery = search.trim().toLowerCase();

  const matchesSearch = (row: ParsedSaleRecord) => {
    if (!normalizedQuery) {
      return true;
    }
    return (
      row.client.toLowerCase().includes(normalizedQuery) ||
      row.raw.vendedor.toLowerCase().includes(normalizedQuery) ||
      row.raw.obs.toLowerCase().includes(normalizedQuery) ||
      String(row.lineNumber).includes(normalizedQuery)
    );
  };

  const filteredPending = pendingRows.filter((row) => {
    if (!matchesSearch(row)) {
      return false;
    }
    if (category === "all") {
      return true;
    }
    const allowedCodes = CATEGORY_TO_CODES[category];
    return row.issues.some((issue) => allowedCodes.includes(issue.code));
  });

  const filteredResolved = resolvedRows.filter(matchesSearch);
  const filteredDiscarded = discardedRows.filter(matchesSearch);

  const categories: Array<{ id: IssueCategory; label: string }> = [
    { id: "all", label: "Todos" },
    { id: "type", label: "Tipo" },
    { id: "value", label: "Valor" },
    { id: "seller", label: "Vendedor" },
    { id: "split", label: "Rateio" },
    { id: "cancellation", label: "Cancelamento" },
    { id: "duplicate", label: "Duplicata" },
    { id: "other", label: "Data / Status" },
  ];

  const currentList =
    view === "pending"
      ? filteredPending
      : view === "resolved"
        ? filteredResolved
        : filteredDiscarded;

  const visibleItems = currentList.slice(0, visibleCount);
  const hasMore = visibleItems.length < currentList.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setView("pending");
              setVisibleCount(PAGE_SIZE);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              view === "pending"
                ? "bg-amber-100 text-amber-900"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Pendentes ({pendingRows.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setView("resolved");
              setVisibleCount(PAGE_SIZE);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              view === "resolved"
                ? "bg-emerald-100 text-emerald-900"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Resolvidas ({resolvedRows.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setView("discarded");
              setVisibleCount(PAGE_SIZE);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              view === "discarded"
                ? "bg-slate-200 text-slate-900"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Descartadas ({discardedRows.length})
          </button>
        </div>

        <div className="relative w-full lg:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Buscar cliente, vendedor ou linha..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-9 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {view === "pending" && (
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategory(cat.id);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                category === cat.id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {view === "pending" && pendingRows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/70 px-6 py-12 text-center">
          <CheckCircle2
            className="h-10 w-10 text-emerald-600"
            aria-hidden="true"
          />
          <h3 className="mt-3 text-base font-semibold text-emerald-950">
            Fila de pendências zerada
          </h3>
          <p className="mt-1 max-w-md text-sm text-emerald-800">
            Todos os registros válidos já foram confirmados e incluídos no cálculo
            das metas e extratos.
          </p>
        </div>
      )}

      {view === "pending" &&
        pendingRows.length > 0 &&
        visibleItems.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
            Nenhuma pendência encontrada para o filtro atual.
          </div>
        )}

      {view === "pending" && visibleItems.length > 0 && (
        <div className="space-y-3">
          {visibleItems.map((row) => (
            <PendingRowCard
              key={row.id}
              row={row}
              activeSellers={activeSellers}
              onResolve={onResolve}
              onAddSeller={onAddSeller}
              onMapAlias={onMapAlias}
            />
          ))}
        </div>
      )}

      {view !== "pending" && visibleItems.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
          Nenhum item nesta lista.
        </div>
      )}

      {view !== "pending" && visibleItems.length > 0 && (
        <div className="space-y-2">
          {visibleItems.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                    Linha {row.lineNumber}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {row.client}
                  </span>
                  {row.amountCents !== null && (
                    <span className="font-mono text-xs text-slate-600">
                      {formatBrlCents(row.amountCents)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Vendedor(es):{" "}
                  {row.sellers.length > 0
                    ? row.sellers.join(" / ")
                    : "Venda Direta (sem comissão)"}{" "}
                  · Tipo:{" "}
                  {row.type === "nova"
                    ? "Venda Nova"
                    : row.type === "renovacao"
                      ? "Renovação"
                      : "—"}{" "}
                  · Status: {row.status ?? "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onUndo(row.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Desfazer
              </button>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Mostrar mais ({currentList.length - visibleItems.length} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
