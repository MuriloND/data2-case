"use client";

import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import type { CommissionReport } from "@/domain/commissions/entities/ledger";
import type { MonthKey } from "@/domain/commissions/entities/sale";
import { formatBrlCents } from "@/domain/commissions/services/normalizers/currency-normalizer";
import {
  calculateRawGoalPercent,
  formatMonthLong,
  formatMonthShort,
} from "../utils/formatters";

interface GoalProgressPanelProps {
  report: CommissionReport;
  selectedMonth: MonthKey;
  onSelectMonth: (month: MonthKey) => void;
  onOpenStatement: (seller: string, month: MonthKey) => void;
}

export function GoalProgressPanel({
  report,
  selectedMonth,
  onSelectMonth,
  onOpenStatement,
}: GoalProgressPanelProps) {
  if (report.months.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Progresso da Meta Individual (R$ 120.000,00 em Vendas Novas)
          </h2>
          <p className="text-xs text-slate-500">
            Renovações (2%) e vendas canceladas no mesmo mês não somam na meta
            de{" "}
            <strong className="font-medium text-slate-700">
              {formatMonthLong(selectedMonth)}
            </strong>
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {report.months.map((month) => (
            <button
              key={month}
              type="button"
              onClick={() => onSelectMonth(month)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                month === selectedMonth
                  ? "bg-slate-900 text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {formatMonthShort(month)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {report.sellers.map((seller) => {
          const summary = report.bySellerMonth[seller]?.[selectedMonth];
          if (!summary) {
            return null;
          }

          const rawPercent = calculateRawGoalPercent(
            summary.novaGoalAccumulatedCents,
            summary.goalCents
          );
          const barWidth = Math.min(100, Math.max(0, rawPercent));
          const excessCents = Math.max(
            0,
            summary.novaGoalAccumulatedCents - summary.goalCents
          );

          return (
            <article
              key={seller}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {seller}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {summary.salesCount} venda(s) · {summary.estornosCount}{" "}
                      estorno(s)
                    </p>
                  </div>

                  {summary.goalReached ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Meta batida (8%)
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      Faltam {formatBrlCents(summary.remainingToGoalCents)}
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatBrlCents(summary.novaGoalAccumulatedCents)}
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {rawPercent.toFixed(1).replace(".", ",")}% de R$ 120k
                    </span>
                  </div>

                  <div
                    role="progressbar"
                    aria-valuenow={Math.round(barWidth)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progresso da meta de ${seller}`}
                    className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
                  >
                    <div
                      style={{ width: `${barWidth}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        summary.goalReached ? "bg-emerald-500" : "bg-blue-600"
                      }`}
                    />
                  </div>

                  {excessCents > 0 && (
                    <p className="text-[11px] font-medium text-emerald-700">
                      Excedente na faixa de 8%: {formatBrlCents(excessCents)}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-slate-500">Novas</dt>
                    <dd className="mt-0.5 font-mono font-medium text-slate-800 tabular-nums">
                      {formatBrlCents(summary.novaCommissionCents)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Renov. (2%)</dt>
                    <dd className="mt-0.5 font-mono font-medium text-slate-800 tabular-nums">
                      {formatBrlCents(summary.renovacaoCommissionCents)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Estornos</dt>
                    <dd
                      className={`mt-0.5 font-mono font-medium tabular-nums ${
                        summary.estornoCommissionCents < 0
                          ? "text-rose-700"
                          : "text-slate-500"
                      }`}
                    >
                      {formatBrlCents(summary.estornoCommissionCents)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div>
                    <span className="block text-[11px] text-slate-500">
                      Líquido do mês
                    </span>
                    <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                      {formatBrlCents(summary.netCommissionCents)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenStatement(seller, selectedMonth)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Ver extrato
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
