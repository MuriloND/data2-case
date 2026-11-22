"use client";

import { useState } from "react";
import type {
  CommissionTier,
  LedgerEntry,
} from "@/domain/commissions/entities/ledger";
import { formatBrlCents } from "@/domain/commissions/services/normalizers/currency-normalizer";
import {
  formatDateBr,
  formatMonthShort,
  formatSplitPercentage,
} from "../utils/formatters";

interface StatementLedgerTableProps {
  entries: readonly LedgerEntry[];
  showMonthColumn: boolean;
}

const PAGE_SIZE = 50;

function getTierBadgeClasses(tier: CommissionTier): string {
  switch (tier) {
    case "5%":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "5% + 8%":
      return "bg-indigo-50 text-indigo-800 border-indigo-200";
    case "8%":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "2%":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "estorno":
      return "bg-rose-50 text-rose-800 border-rose-200";
    case "anulada":
    case "direta":
      return "bg-slate-100 text-slate-500 border-slate-200";
  }
}

function getTierLabel(entry: LedgerEntry): string {
  if (entry.tier === "anulada") {
    return "Anulada (mesmo mês)";
  }
  if (entry.tier === "estorno") {
    return entry.originRef
      ? `Estorno (${entry.originRef.appliedTier})`
      : "Estorno";
  }
  return entry.tier;
}

export function StatementLedgerTable({
  entries,
  showMonthColumn,
}: StatementLedgerTableProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-xs">
        Nenhum lançamento encontrado para os filtros selecionados.
      </div>
    );
  }

  const visibleEntries = entries.slice(0, visibleCount);
  const hasMore = visibleEntries.length < entries.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Data / Linha</th>
              {showMonthColumn && <th className="px-4 py-3">Competência</th>}
              <th className="px-4 py-3">Cliente &amp; Detalhes</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Valor Atribuído</th>
              <th className="px-4 py-3">Faixa Aplicada</th>
              <th className="px-4 py-3 text-right">Comissão</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {visibleEntries.map((entry) => {
              const otherSellers = entry.coSellers.filter(
                (s) => s !== entry.seller
              );
              const isSplit = entry.coSellers.length > 1;
              const isChargeback = entry.kind === "estorno";

              return (
                <tr key={entry.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="block font-mono text-xs font-medium text-slate-800 tabular-nums">
                      {formatDateBr(entry.dateISO)}
                    </span>
                    <span className="block font-mono text-[11px] text-slate-400">
                      Linha {entry.lineNumber}
                    </span>
                  </td>

                  {showMonthColumn && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {formatMonthShort(entry.effectiveMonth)}
                      </span>
                    </td>
                  )}

                  <td className="px-4 py-3">
                    <span className="block font-medium text-slate-900">
                      {entry.client}
                    </span>

                    {isSplit && (
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Rateio {formatSplitPercentage(entry.splitPercentage)} ·
                        dividida com {otherSellers.join(", ")}
                      </span>
                    )}

                    {isChargeback && entry.originRef && (
                      <span className="mt-0.5 block text-xs font-medium text-rose-700">
                        Estorno ref. {formatMonthShort(entry.originRef.saleMonth)}{" "}
                        · linha {entry.originRef.lineNumber} (pago{" "}
                        {formatBrlCents(entry.originRef.originalCommissionCents)}{" "}
                        a {entry.originRef.appliedTier})
                      </span>
                    )}

                    {entry.obs && (
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        Obs: {entry.obs}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        entry.saleType === "nova"
                          ? "bg-blue-50 text-blue-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {entry.saleType === "nova" ? "Venda Nova" : "Renovação"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="block font-mono text-xs font-medium text-slate-800 tabular-nums">
                      {formatBrlCents(entry.assignedAmountCents)}
                    </span>
                    {isSplit && (
                      <span className="block font-mono text-[11px] text-slate-400 tabular-nums">
                        de {formatBrlCents(entry.originalAmountCents)}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${getTierBadgeClasses(
                        entry.tier
                      )}`}
                    >
                      {getTierLabel(entry)}
                    </span>

                    {entry.tier === "5% + 8%" && (
                      <span className="mt-1 block font-mono text-[11px] text-indigo-700">
                        5% s/ {formatBrlCents(entry.baseAt5Cents)} (
                        {formatBrlCents(entry.commAt5Cents)}) + 8% s/{" "}
                        {formatBrlCents(entry.baseAt8Cents)} (
                        {formatBrlCents(entry.commAt8Cents)})
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span
                      className={`font-mono text-xs font-semibold tabular-nums ${
                        entry.commissionCents < 0
                          ? "text-rose-700"
                          : entry.commissionCents === 0
                            ? "text-slate-400"
                            : "text-slate-900"
                      }`}
                    >
                      {formatBrlCents(entry.commissionCents)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <span>
            Exibindo {visibleEntries.length} de {entries.length} lançamento(s)
          </span>
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
          >
            Mostrar mais ({entries.length - visibleEntries.length} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
