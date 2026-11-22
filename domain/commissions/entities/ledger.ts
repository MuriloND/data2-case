import type { IsoDate, MonthKey, ParsedSaleRecord, SaleType } from "./sale";

export type CommissionTier =
  | "5%"
  | "8%"
  | "5% + 8%"
  | "2%"
  | "estorno"
  | "anulada"
  | "direta";

export type LedgerEntryKind =
  | "sale"
  | "same_month_cancel"
  | "estorno"
  | "direct_sale";

export interface LedgerOriginRef {
  rowId: string;
  lineNumber: number;
  dateISO: IsoDate;
  saleMonth: MonthKey;
  client: string;
  appliedTier: CommissionTier;
  originalCommissionCents: number;
}

export interface LedgerEntry {
  id: string;
  rowId: string;
  batchId: string;
  lineNumber: number;
  dateISO: IsoDate;
  effectiveMonth: MonthKey;
  saleMonth: MonthKey;
  seller: string | null;
  coSellers: string[];
  client: string;
  saleType: SaleType;
  kind: LedgerEntryKind;
  tier: CommissionTier;
  originalAmountCents: number;
  assignedAmountCents: number;
  splitPercentage: number;
  countsTowardGoal: boolean;
  goalContributionCents: number;
  baseAt5Cents: number;
  commAt5Cents: number;
  baseAt8Cents: number;
  commAt8Cents: number;
  commissionCents: number;
  originRef?: LedgerOriginRef;
  obs?: string;
}

export interface SellerMonthSummary {
  seller: string;
  month: MonthKey;
  goalCents: number;
  novaGoalAccumulatedCents: number;
  goalProgressPercent: number;
  goalReached: boolean;
  remainingToGoalCents: number;
  novaCommissionCents: number;
  renovacaoCommissionCents: number;
  estornoCommissionCents: number;
  netCommissionCents: number;
  salesCount: number;
  estornosCount: number;
  sameMonthCancelCount: number;
  entries: LedgerEntry[];
}

export interface CommissionReport {
  months: MonthKey[];
  sellers: string[];
  bySellerMonth: Record<string, Record<MonthKey, SellerMonthSummary>>;
  sellerTotals: Record<string, number>;
  monthTotals: Record<MonthKey, number>;
  grandTotalCents: number;
  directSales: LedgerEntry[];
  allEntries: LedgerEntry[];
  pendingRows: ParsedSaleRecord[];
  resolvedRows: ParsedSaleRecord[];
  discardedRows: ParsedSaleRecord[];
  totalParsedRows: number;
}
