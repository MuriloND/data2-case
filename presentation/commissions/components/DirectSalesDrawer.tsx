"use client";

import { useState } from "react";
import { Building2, ChevronDown, ChevronUp } from "lucide-react";
import type { LedgerEntry } from "@/domain/commissions/entities/ledger";
import { formatBrlCents } from "@/domain/commissions/services/normalizers/currency-normalizer";
import { formatDateBr, formatMonthShort } from "../utils/formatters";

interface DirectSalesDrawerProps {
  directSales: readonly LedgerEntry[];
}

export function DirectSalesDrawer({ directSales }: DirectSalesDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (directSales.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50/70"
      >
        <div className="flex items-center gap-2.5">
          <Building2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <span className="text-sm font-medium text-slate-800">
            Vendas Diretas sem vendedor ({directSales.length})
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            Comissão R$ 0,00
          </span>
        </div>

        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-2.5">Data / Linha</th>
                <th className="px-4 py-2.5">Competência</th>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5 text-right">Valor</th>
                <th className="px-4 py-2.5 text-right">Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {directSales.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-2.5 font-mono text-slate-700">
                    {formatDateBr(entry.dateISO)} · L{entry.lineNumber}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {formatMonthShort(entry.effectiveMonth)}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {entry.client}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {entry.saleType === "nova" ? "Venda Nova" : "Renovação"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-800 tabular-nums">
                    {formatBrlCents(entry.originalAmountCents)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-500 tabular-nums">
                    R$ 0,00
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
