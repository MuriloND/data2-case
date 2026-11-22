"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Eye,
  Search,
} from "lucide-react";
import type { ExportStatementUseCase } from "@/application/commissions/export-statement.use-case";
import type {
  CommissionReport,
  SellerMonthSummary,
} from "@/domain/commissions/entities/ledger";
import type { MonthKey } from "@/domain/commissions/entities/sale";
import { formatBrlCents } from "@/domain/commissions/services/normalizers/currency-normalizer";
import {
  calculateRawGoalPercent,
  formatMonthLong,
  formatMonthShort,
  triggerBrowserDownload,
} from "../utils/formatters";
import { DirectSalesDrawer } from "./DirectSalesDrawer";
import { StatementLedgerTable } from "./StatementLedgerTable";
import { WhatsAppPreviewModal } from "./WhatsAppPreviewModal";

interface IndividualStatementTabProps {
  report: CommissionReport;
  selectedSeller: string;
  selectedMonth: MonthKey | "all";
  onSelectSeller: (seller: string) => void;
  onSelectMonth: (month: MonthKey | "all") => void;
  onGoToPending: () => void;
  exportWhatsAppUseCase: ExportStatementUseCase;
  exportCsvUseCase: ExportStatementUseCase;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  if (typeof document === "undefined") {
    return false;
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function IndividualStatementTab({
  report,
  selectedSeller,
  selectedMonth,
  onSelectSeller,
  onSelectMonth,
  onGoToPending,
  exportWhatsAppUseCase,
  exportCsvUseCase,
}: IndividualStatementTabProps) {
  const [search, setSearch] = useState("");
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);

  const effectiveSeller =
    selectedSeller && report.sellers.includes(selectedSeller)
      ? selectedSeller
      : (report.sellers[0] ?? "");

  const effectiveMonth: MonthKey | "all" =
    selectedMonth === "all" || report.months.includes(selectedMonth)
      ? selectedMonth
      : (report.months[report.months.length - 1] ?? "all");

  if (!effectiveSeller) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Nenhum vendedor disponível para exibição.
      </div>
    );
  }

  const singleMonthSummary: SellerMonthSummary | undefined =
    effectiveMonth !== "all"
      ? report.bySellerMonth[effectiveSeller]?.[effectiveMonth]
      : undefined;

  const baseEntries = singleMonthSummary
    ? singleMonthSummary.entries
    : report.allEntries.filter(
        (entry) =>
          entry.seller === effectiveSeller && entry.kind !== "direct_sale"
      );

  const normalizedSearch = search.trim().toLowerCase();
  const filteredEntries = normalizedSearch
    ? baseEntries.filter(
        (entry) =>
          entry.client.toLowerCase().includes(normalizedSearch) ||
          String(entry.lineNumber).includes(normalizedSearch) ||
          (entry.obs?.toLowerCase().includes(normalizedSearch) ?? false)
      )
    : baseEntries;

  const pendingForSeller = report.pendingRows.filter(
    (row) =>
      row.sellers.includes(effectiveSeller) ||
      row.formerEmployees.includes(effectiveSeller)
  ).length;

  let novaCents = 0;
  let renovacaoCents = 0;
  let estornoCents = 0;
  for (const entry of baseEntries) {
    if (entry.kind === "estorno") {
      estornoCents += entry.commissionCents;
    } else if (entry.kind === "sale") {
      if (entry.saleType === "nova") {
        novaCents += entry.commissionCents;
      } else {
        renovacaoCents += entry.commissionCents;
      }
    }
  }
  const netCents = novaCents + renovacaoCents + estornoCents;

  const buildWhatsAppText = () =>
    exportWhatsAppUseCase.execute({
      summary: singleMonthSummary,
      entries: baseEntries,
      pendingCountForSeller: pendingForSeller,
      filterLabel:
        effectiveMonth === "all"
          ? `${effectiveSeller} — Todos os meses`
          : `${effectiveSeller} — ${formatMonthLong(effectiveMonth)}`,
    }).content;

  const handleCopyWhatsApp = async () => {
    const text = buildWhatsAppText();
    const copied = await copyTextToClipboard(text);
    if (copied) {
      setCopiedFeedback(true);
      window.setTimeout(() => setCopiedFeedback(false), 2500);
    } else {
      setPreviewText(text);
    }
  };

  const handleExportCsv = () => {
    const result = exportCsvUseCase.execute({
      summary: singleMonthSummary,
      entries: filteredEntries,
    });
    triggerBrowserDownload(
      result.content,
      result.mimeType,
      result.suggestedFilename ?? "extrato-comissoes.csv"
    );
  };

  const rawGoalPercent = singleMonthSummary
    ? calculateRawGoalPercent(
        singleMonthSummary.novaGoalAccumulatedCents,
        singleMonthSummary.goalCents
      )
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label
              htmlFor="statement-seller-select"
              className="block text-[11px] font-medium uppercase tracking-wide text-slate-500"
            >
              Vendedor
            </label>
            <select
              id="statement-seller-select"
              value={effectiveSeller}
              onChange={(e) => onSelectSeller(e.target.value)}
              className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              {report.sellers.map((seller) => (
                <option key={seller} value={seller}>
                  {seller}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="statement-month-select"
              className="block text-[11px] font-medium uppercase tracking-wide text-slate-500"
            >
              Competência
            </label>
            <select
              id="statement-month-select"
              value={effectiveMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              {report.months.map((month) => (
                <option key={month} value={month}>
                  {formatMonthShort(month)}
                </option>
              ))}
              <option value="all">Todos os meses</option>
            </select>
          </div>

          <div className="w-full sm:w-64">
            <label
              htmlFor="statement-search-input"
              className="block text-[11px] font-medium uppercase tracking-wide text-slate-500"
            >
              Filtrar cliente / linha
            </label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="statement-search-input"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente ou linha..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopyWhatsApp()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
          >
            {copiedFeedback ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copiar para WhatsApp
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setPreviewText(buildWhatsAppText())}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Eye className="h-4 w-4 text-slate-500" aria-hidden="true" />
            Prévia
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4 text-slate-500" aria-hidden="true" />
            Exportar CSV
          </button>
        </div>
      </div>

      {pendingForSeller > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Existem <strong>{pendingForSeller}</strong> pendência(s) aberta(s)
              envolvendo <strong>{effectiveSeller}</strong> fora deste extrato
              até confirmação.
            </span>
          </div>
          <button
            type="button"
            onClick={onGoToPending}
            className="font-semibold text-amber-950 underline hover:text-amber-700"
          >
            Revisar na Fila de Pendências
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500">Vendas Novas</span>
          <p className="mt-1 font-mono text-lg font-semibold text-slate-900 tabular-nums">
            {formatBrlCents(novaCents)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500">Renovações (2%)</span>
          <p className="mt-1 font-mono text-lg font-semibold text-slate-900 tabular-nums">
            {formatBrlCents(renovacaoCents)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500">Estornos</span>
          <p
            className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
              estornoCents < 0 ? "text-rose-700" : "text-slate-400"
            }`}
          >
            {formatBrlCents(estornoCents)}
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 shadow-xs">
          <span className="text-xs font-medium text-blue-800">
            Líquido a Receber
          </span>
          <p className="mt-1 font-mono text-lg font-semibold text-blue-950 tabular-nums">
            {formatBrlCents(netCents)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          {singleMonthSummary ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Meta 120k</span>
                <span
                  className={`font-semibold ${
                    singleMonthSummary.goalReached
                      ? "text-emerald-700"
                      : "text-slate-600"
                  }`}
                >
                  {rawGoalPercent.toFixed(1).replace(".", ",")}%
                </span>
              </div>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {formatBrlCents(singleMonthSummary.novaGoalAccumulatedCents)}
              </p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, rawGoalPercent))}%`,
                  }}
                  className={`h-full rounded-full ${
                    singleMonthSummary.goalReached
                      ? "bg-emerald-500"
                      : "bg-blue-600"
                  }`}
                />
              </div>
            </>
          ) : (
            <>
              <span className="text-xs text-slate-500">Lançamentos</span>
              <p className="mt-1 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                {baseEntries.length}
              </p>
            </>
          )}
        </div>
      </div>

      <StatementLedgerTable
        entries={filteredEntries}
        showMonthColumn={effectiveMonth === "all"}
      />

      <DirectSalesDrawer directSales={report.directSales} />

      <WhatsAppPreviewModal
        isOpen={previewText !== null}
        content={previewText ?? ""}
        onClose={() => setPreviewText(null)}
        onCopy={copyTextToClipboard}
      />
    </div>
  );
}
