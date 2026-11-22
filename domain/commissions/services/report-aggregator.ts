import { MONTHLY_GOAL_CENTS } from "../constants";
import type {
  CommissionReport,
  LedgerEntry,
  SellerMonthSummary,
} from "../entities/ledger";
import type { MonthKey, ParsedSaleRecord } from "../entities/sale";
import {
  getActiveSellerNames,
  type SellerRegistry,
} from "../entities/seller";

export interface ReportAggregationInput {
  entries: readonly LedgerEntry[];
  directSales: readonly LedgerEntry[];
  pendingRows: readonly ParsedSaleRecord[];
  resolvedRows: readonly ParsedSaleRecord[];
  discardedRows: readonly ParsedSaleRecord[];
  totalParsedRows: number;
  sellerRegistry: SellerRegistry;
}

function createEmptySellerMonthSummary(
  seller: string,
  month: MonthKey
): SellerMonthSummary {
  return {
    seller,
    month,
    goalCents: MONTHLY_GOAL_CENTS,
    novaGoalAccumulatedCents: 0,
    goalProgressPercent: 0,
    goalReached: false,
    remainingToGoalCents: MONTHLY_GOAL_CENTS,
    novaCommissionCents: 0,
    renovacaoCommissionCents: 0,
    estornoCommissionCents: 0,
    netCommissionCents: 0,
    salesCount: 0,
    estornosCount: 0,
    sameMonthCancelCount: 0,
    entries: [],
  };
}

function collectOrderedSellers(
  sellerRegistry: SellerRegistry,
  entries: readonly LedgerEntry[]
): string[] {
  const activeSellers = new Set<string>(getActiveSellerNames(sellerRegistry));
  const extraSellers = new Set<string>();

  for (const entry of entries) {
    if (entry.seller && !activeSellers.has(entry.seller)) {
      extraSellers.add(entry.seller);
    }
  }

  const sortedActive = Array.from(activeSellers).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  const sortedExtra = Array.from(extraSellers).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  return [...sortedActive, ...sortedExtra];
}

function collectOrderedMonths(
  entries: readonly LedgerEntry[],
  directSales: readonly LedgerEntry[]
): MonthKey[] {
  const months = new Set<MonthKey>();

  for (const entry of entries) {
    months.add(entry.effectiveMonth);
  }
  for (const direct of directSales) {
    months.add(direct.effectiveMonth);
  }

  return Array.from(months).sort((a, b) => a.localeCompare(b));
}

function accumulateEntryIntoSummary(
  summary: SellerMonthSummary,
  entry: LedgerEntry
): void {
  summary.entries.push(entry);
  summary.netCommissionCents += entry.commissionCents;

  if (entry.kind === "sale") {
    summary.salesCount += 1;
    if (entry.countsTowardGoal) {
      summary.novaGoalAccumulatedCents += entry.goalContributionCents;
    }
    if (entry.saleType === "nova") {
      summary.novaCommissionCents += entry.commissionCents;
    } else {
      summary.renovacaoCommissionCents += entry.commissionCents;
    }
    return;
  }

  if (entry.kind === "estorno") {
    summary.estornosCount += 1;
    summary.estornoCommissionCents += entry.commissionCents;
    return;
  }

  if (entry.kind === "same_month_cancel") {
    summary.sameMonthCancelCount += 1;
  }
}

export function buildCommissionReport(
  input: ReportAggregationInput
): CommissionReport {
  const months = collectOrderedMonths(input.entries, input.directSales);
  const sellers = collectOrderedSellers(input.sellerRegistry, input.entries);

  const bySellerMonth: Record<string, Record<MonthKey, SellerMonthSummary>> = {};
  for (const seller of sellers) {
    bySellerMonth[seller] = {};
    for (const month of months) {
      bySellerMonth[seller][month] = createEmptySellerMonthSummary(
        seller,
        month
      );
    }
  }

  for (const entry of input.entries) {
    if (!entry.seller) {
      continue;
    }
    const summary = bySellerMonth[entry.seller]?.[entry.effectiveMonth];
    if (summary) {
      accumulateEntryIntoSummary(summary, entry);
    }
  }

  const sellerTotals: Record<string, number> = {};
  const monthTotals: Record<MonthKey, number> = {};
  for (const month of months) {
    monthTotals[month] = 0;
  }

  let grandTotalCents = 0;

  for (const seller of sellers) {
    let sellerTotal = 0;
    for (const month of months) {
      const summary = bySellerMonth[seller][month];
      summary.goalProgressPercent = Math.min(
        100,
        Math.round(
          (summary.novaGoalAccumulatedCents / summary.goalCents) * 1000
        ) / 10
      );
      summary.goalReached =
        summary.novaGoalAccumulatedCents >= summary.goalCents;
      summary.remainingToGoalCents = Math.max(
        0,
        summary.goalCents - summary.novaGoalAccumulatedCents
      );

      sellerTotal += summary.netCommissionCents;
      monthTotals[month] += summary.netCommissionCents;
      grandTotalCents += summary.netCommissionCents;
    }
    sellerTotals[seller] = sellerTotal;
  }

  return {
    months,
    sellers,
    bySellerMonth,
    sellerTotals,
    monthTotals,
    grandTotalCents,
    directSales: [...input.directSales],
    allEntries: [...input.entries, ...input.directSales],
    pendingRows: [...input.pendingRows],
    resolvedRows: [...input.resolvedRows],
    discardedRows: [...input.discardedRows],
    totalParsedRows: input.totalParsedRows,
  };
}
