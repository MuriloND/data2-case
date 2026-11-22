"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  FileCheck2,
  Target,
} from "lucide-react";
import type { CommissionReport } from "@/domain/commissions/entities/ledger";
import { formatBrlCents } from "@/domain/commissions/services/normalizers/currency-normalizer";

interface KpiSummaryBarProps {
  report: CommissionReport;
}

export function KpiSummaryBar({ report }: KpiSummaryBarProps) {
  let goalsReachedCount = 0;
  let totalSellerMonthSlots = 0;

  for (const seller of report.sellers) {
    for (const month of report.months) {
      totalSellerMonthSlots += 1;
      if (report.bySellerMonth[seller]?.[month]?.goalReached) {
        goalsReachedCount += 1;
      }
    }
  }

  const pendingCount = report.pendingRows.length;
  const confirmedCount =
    report.totalParsedRows - pendingCount - report.discardedRows.length;

  return (
    <section
      aria-label="Resumo operacional"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total líquido a pagar
          </span>
          <Coins className="h-4 w-4 text-blue-600" aria-hidden="true" />
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {formatBrlCents(report.grandTotalCents)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {report.months.length} mês(es) · {report.sellers.length} vendedor(es)
        </p>
      </div>

      <div
        className={`rounded-xl border p-4 shadow-xs ${
          pendingCount > 0
            ? "border-amber-200 bg-amber-50/60"
            : "border-emerald-200 bg-emerald-50/60"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
            Fila de pendências
          </span>
          {pendingCount > 0 ? (
            <AlertTriangle
              className="h-4 w-4 text-amber-600"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              className="h-4 w-4 text-emerald-600"
              aria-hidden="true"
            />
          )}
        </div>
        <p
          className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${
            pendingCount > 0 ? "text-amber-900" : "text-emerald-900"
          }`}
        >
          {pendingCount === 0 ? "Zerada" : `${pendingCount} alerta(s)`}
        </p>
        <p className="mt-1 text-xs text-slate-600">
          {pendingCount > 0
            ? "Itens isolados fora do cálculo até revisão"
            : "100% dos lançamentos revisados"}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Metas batidas (120k)
          </span>
          <Target className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {goalsReachedCount}{" "}
          <span className="text-sm font-normal text-slate-400">
            / {totalSellerMonthSlots}
          </span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Vendedor × mês na faixa de 8%
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Linhas no cálculo
          </span>
          <FileCheck2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {confirmedCount}{" "}
          <span className="text-sm font-normal text-slate-400">
            / {report.totalParsedRows}
          </span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {report.resolvedRows.length} resolvida(s) ·{" "}
          {report.discardedRows.length} descartada(s)
        </p>
      </div>
    </section>
  );
}
