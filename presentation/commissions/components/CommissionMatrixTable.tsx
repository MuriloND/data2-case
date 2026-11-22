"use client";

import type { CommissionReport } from "@/domain/commissions/entities/ledger";
import type { MonthKey } from "@/domain/commissions/entities/sale";
import { formatBrlCents } from "@/domain/commissions/services/normalizers/currency-normalizer";
import { formatMonthShort } from "../utils/formatters";

interface CommissionMatrixTableProps {
  report: CommissionReport;
  onSelectCell: (seller: string, month: MonthKey | "all") => void;
}

export function CommissionMatrixTable({
  report,
  onSelectCell,
}: CommissionMatrixTableProps) {
  if (report.months.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-xs">
        Nenhum lançamento confirmado para compor a matriz mensal ainda.
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Matriz Vendedor × Mês (Líquido a Pagar)
          </h2>
          <p className="text-xs text-slate-500">
            Clique em qualquer valor para abrir o extrato detalhado daquela
            competência.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Meta R$ 120k batida (8%)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Contém estorno
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Vendedor</th>
              {report.months.map((month) => (
                <th key={month} className="px-4 py-3 text-right">
                  {formatMonthShort(month)}
                </th>
              ))}
              <th className="bg-slate-100/80 px-5 py-3 text-right text-slate-700">
                Total
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {report.sellers.map((seller) => {
              const totalCents = report.sellerTotals[seller] ?? 0;

              return (
                <tr key={seller} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    <button
                      type="button"
                      onClick={() => onSelectCell(seller, "all")}
                      className="text-left hover:text-blue-600 hover:underline"
                    >
                      {seller}
                    </button>
                  </td>

                  {report.months.map((month) => {
                    const summary = report.bySellerMonth[seller]?.[month];
                    const netCents = summary?.netCommissionCents ?? 0;
                    const hasChargeback = (summary?.estornosCount ?? 0) > 0;
                    const goalReached = summary?.goalReached ?? false;

                    return (
                      <td key={month} className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectCell(seller, month)}
                          title={`Abrir extrato de ${seller} em ${formatMonthShort(month)}`}
                          className="group inline-flex items-center justify-end gap-1.5 rounded-lg px-2 py-1 font-mono text-xs font-medium tabular-nums transition hover:bg-blue-50 hover:text-blue-700"
                        >
                          {goalReached && (
                            <span
                              title="Meta R$ 120k atingida"
                              className="h-2 w-2 rounded-full bg-emerald-500"
                            />
                          )}
                          {hasChargeback && (
                            <span
                              title={`${summary?.estornosCount} estorno(s) no mês`}
                              className="h-2 w-2 rounded-full bg-rose-500"
                            />
                          )}
                          <span
                            className={
                              netCents < 0
                                ? "text-rose-700"
                                : netCents === 0
                                  ? "text-slate-400"
                                  : "text-slate-800 group-hover:text-blue-700"
                            }
                          >
                            {formatBrlCents(netCents)}
                          </span>
                        </button>
                      </td>
                    );
                  })}

                  <td className="bg-slate-50/70 px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectCell(seller, "all")}
                      className="font-mono text-xs font-semibold text-slate-900 tabular-nums hover:text-blue-700 hover:underline"
                    >
                      {formatBrlCents(totalCents)}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
              <td className="px-5 py-3.5 text-xs uppercase tracking-wide text-slate-600">
                Total por mês
              </td>
              {report.months.map((month) => (
                <td
                  key={month}
                  className="px-4 py-3.5 text-right font-mono text-xs tabular-nums"
                >
                  {formatBrlCents(report.monthTotals[month] ?? 0)}
                </td>
              ))}
              <td className="bg-blue-50/80 px-5 py-3.5 text-right font-mono text-sm text-blue-900 tabular-nums">
                {formatBrlCents(report.grandTotalCents)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
