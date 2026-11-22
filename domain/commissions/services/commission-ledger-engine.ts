import type { LedgerEntry } from "../entities/ledger";
import type { MonthKey } from "../entities/sale";
import {
  calculateNovaCommission,
  calculateRenovacaoCommission,
} from "./progressive-tier-calculator";
import type { ResolvedSaleData } from "./resolution-applier";
import {
  expandSaleToSellerSlices,
  type SellerSaleSlice,
} from "./split-allocator";

export interface CommissionLedgerResult {
  entries: LedgerEntry[];
  directSales: LedgerEntry[];
}

function createDirectSaleEntry(sale: ResolvedSaleData): LedgerEntry {
  return {
    id: `${sale.record.id}:direct`,
    rowId: sale.record.id,
    batchId: sale.record.batchId,
    lineNumber: sale.record.lineNumber,
    dateISO: sale.dateISO,
    effectiveMonth: sale.saleMonth,
    saleMonth: sale.saleMonth,
    seller: null,
    coSellers: [],
    client: sale.record.client,
    saleType: sale.type,
    kind: "direct_sale",
    tier: "direta",
    originalAmountCents: sale.amountCents,
    assignedAmountCents: sale.amountCents,
    splitPercentage: 100,
    countsTowardGoal: false,
    goalContributionCents: 0,
    baseAt5Cents: 0,
    commAt5Cents: 0,
    baseAt8Cents: 0,
    commAt8Cents: 0,
    commissionCents: 0,
    obs: sale.record.raw.obs || undefined,
  };
}

function createSameMonthCancelEntry(slice: SellerSaleSlice): LedgerEntry {
  const { sale, seller, assignedAmountCents, splitPercentage, sliceIndex } =
    slice;

  return {
    id: `${sale.record.id}:s${sliceIndex}:anulada`,
    rowId: sale.record.id,
    batchId: sale.record.batchId,
    lineNumber: sale.record.lineNumber,
    dateISO: sale.dateISO,
    effectiveMonth: sale.saleMonth,
    saleMonth: sale.saleMonth,
    seller,
    coSellers: [...sale.sellers],
    client: sale.record.client,
    saleType: sale.type,
    kind: "same_month_cancel",
    tier: "anulada",
    originalAmountCents: sale.amountCents,
    assignedAmountCents,
    splitPercentage,
    countsTowardGoal: false,
    goalContributionCents: 0,
    baseAt5Cents: 0,
    commAt5Cents: 0,
    baseAt8Cents: 0,
    commAt8Cents: 0,
    commissionCents: 0,
    obs: sale.record.raw.obs || undefined,
  };
}

function createOriginSaleEntry(
  slice: SellerSaleSlice,
  accumulatedNovaCents: number
): { entry: LedgerEntry; nextAccumulatedNovaCents: number } {
  const { sale, seller, assignedAmountCents, splitPercentage, sliceIndex } =
    slice;

  if (sale.type === "nova") {
    const calc = calculateNovaCommission(
      assignedAmountCents,
      accumulatedNovaCents
    );

    return {
      nextAccumulatedNovaCents: calc.nextAccumulatedNovaCents,
      entry: {
        id: `${sale.record.id}:s${sliceIndex}:sale`,
        rowId: sale.record.id,
        batchId: sale.record.batchId,
        lineNumber: sale.record.lineNumber,
        dateISO: sale.dateISO,
        effectiveMonth: sale.saleMonth,
        saleMonth: sale.saleMonth,
        seller,
        coSellers: [...sale.sellers],
        client: sale.record.client,
        saleType: "nova",
        kind: "sale",
        tier: calc.tier,
        originalAmountCents: sale.amountCents,
        assignedAmountCents,
        splitPercentage,
        countsTowardGoal: true,
        goalContributionCents: assignedAmountCents,
        baseAt5Cents: calc.baseAt5Cents,
        commAt5Cents: calc.commAt5Cents,
        baseAt8Cents: calc.baseAt8Cents,
        commAt8Cents: calc.commAt8Cents,
        commissionCents: calc.commissionCents,
        obs: sale.record.raw.obs || undefined,
      },
    };
  }

  const calc = calculateRenovacaoCommission(assignedAmountCents);

  return {
    nextAccumulatedNovaCents: accumulatedNovaCents,
    entry: {
      id: `${sale.record.id}:s${sliceIndex}:sale`,
      rowId: sale.record.id,
      batchId: sale.record.batchId,
      lineNumber: sale.record.lineNumber,
      dateISO: sale.dateISO,
      effectiveMonth: sale.saleMonth,
      saleMonth: sale.saleMonth,
      seller,
      coSellers: [...sale.sellers],
      client: sale.record.client,
      saleType: "renovacao",
      kind: "sale",
      tier: calc.tier,
      originalAmountCents: sale.amountCents,
      assignedAmountCents,
      splitPercentage,
      countsTowardGoal: false,
      goalContributionCents: 0,
      baseAt5Cents: 0,
      commAt5Cents: 0,
      baseAt8Cents: 0,
      commAt8Cents: 0,
      commissionCents: calc.commissionCents,
      obs: sale.record.raw.obs || undefined,
    },
  };
}

function createChargebackEntry(
  originEntry: LedgerEntry,
  cancellationMonth: MonthKey,
  sliceIndex: number
): LedgerEntry {
  return {
    id: `${originEntry.rowId}:s${sliceIndex}:estorno:${cancellationMonth}`,
    rowId: originEntry.rowId,
    batchId: originEntry.batchId,
    lineNumber: originEntry.lineNumber,
    dateISO: originEntry.dateISO,
    effectiveMonth: cancellationMonth,
    saleMonth: originEntry.saleMonth,
    seller: originEntry.seller,
    coSellers: [...originEntry.coSellers],
    client: originEntry.client,
    saleType: originEntry.saleType,
    kind: "estorno",
    tier: "estorno",
    originalAmountCents: originEntry.originalAmountCents,
    assignedAmountCents: originEntry.assignedAmountCents,
    splitPercentage: originEntry.splitPercentage,
    countsTowardGoal: false,
    goalContributionCents: 0,
    baseAt5Cents: 0,
    commAt5Cents: 0,
    baseAt8Cents: 0,
    commAt8Cents: 0,
    commissionCents: -originEntry.commissionCents,
    originRef: {
      rowId: originEntry.rowId,
      lineNumber: originEntry.lineNumber,
      dateISO: originEntry.dateISO,
      saleMonth: originEntry.saleMonth,
      client: originEntry.client,
      appliedTier: originEntry.tier,
      originalCommissionCents: originEntry.commissionCents,
    },
    obs: originEntry.obs,
  };
}

function compareSlicesChronologically(
  a: SellerSaleSlice,
  b: SellerSaleSlice
): number {
  if (a.sale.dateISO !== b.sale.dateISO) {
    return a.sale.dateISO.localeCompare(b.sale.dateISO);
  }
  if (a.sale.record.lineNumber !== b.sale.record.lineNumber) {
    return a.sale.record.lineNumber - b.sale.record.lineNumber;
  }
  return a.sale.record.id.localeCompare(b.sale.record.id);
}

function compareLedgerEntries(a: LedgerEntry, b: LedgerEntry): number {
  if (a.effectiveMonth !== b.effectiveMonth) {
    return a.effectiveMonth.localeCompare(b.effectiveMonth);
  }
  if (a.dateISO !== b.dateISO) {
    return a.dateISO.localeCompare(b.dateISO);
  }
  if (a.lineNumber !== b.lineNumber) {
    return a.lineNumber - b.lineNumber;
  }
  return a.id.localeCompare(b.id);
}

export function calculateCommissionLedger(
  confirmedSales: readonly ResolvedSaleData[]
): CommissionLedgerResult {
  const directSales: LedgerEntry[] = [];
  const entries: LedgerEntry[] = [];
  const activeSlicesBySellerMonth = new Map<string, SellerSaleSlice[]>();

  for (const sale of confirmedSales) {
    if (sale.isDirectSale || sale.sellers.length === 0) {
      directSales.push(createDirectSaleEntry(sale));
      continue;
    }

    const slices = expandSaleToSellerSlices(sale);
    const isSameMonthCancel =
      sale.status === "cancelado" &&
      sale.cancellationMonth === sale.saleMonth;

    if (isSameMonthCancel) {
      for (const slice of slices) {
        entries.push(createSameMonthCancelEntry(slice));
      }
      continue;
    }

    for (const slice of slices) {
      const bucketKey = `${slice.seller}::${sale.saleMonth}`;
      const bucket = activeSlicesBySellerMonth.get(bucketKey);
      if (bucket) {
        bucket.push(slice);
      } else {
        activeSlicesBySellerMonth.set(bucketKey, [slice]);
      }
    }
  }

  for (const slices of activeSlicesBySellerMonth.values()) {
    slices.sort(compareSlicesChronologically);
    let accumulatedNovaCents = 0;

    for (const slice of slices) {
      const { entry, nextAccumulatedNovaCents } = createOriginSaleEntry(
        slice,
        accumulatedNovaCents
      );
      accumulatedNovaCents = nextAccumulatedNovaCents;
      entries.push(entry);

      const { sale, sliceIndex } = slice;
      if (
        sale.status === "cancelado" &&
        sale.cancellationMonth &&
        sale.cancellationMonth > sale.saleMonth
      ) {
        entries.push(
          createChargebackEntry(entry, sale.cancellationMonth, sliceIndex)
        );
      }
    }
  }

  entries.sort(compareLedgerEntries);
  directSales.sort(compareLedgerEntries);

  return { entries, directSales };
}
