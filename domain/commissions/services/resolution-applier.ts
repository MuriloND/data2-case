import type { PendingIssue } from "../entities/pending-issue";
import type {
  IsoDate,
  MonthKey,
  ParsedSaleRecord,
  SaleResolution,
  SaleStatus,
  SaleType,
} from "../entities/sale";
import { isValidCalendarDate } from "./normalizers/date-normalizer";

export type AppliedResolutionState =
  | { kind: "confirmed"; record: ParsedSaleRecord; wasPending: boolean }
  | { kind: "pending"; record: ParsedSaleRecord }
  | { kind: "discarded"; record: ParsedSaleRecord };

export interface ResolvedSaleData {
  record: ParsedSaleRecord;
  isDirectSale: boolean;
  dateISO: IsoDate;
  saleMonth: MonthKey;
  sellers: string[];
  amountCents: number;
  type: SaleType;
  status: SaleStatus;
  cancellationMonth: MonthKey | null;
  splitWeights: number[] | null;
}

function isValidIsoDate(value: string | null): value is IsoDate {
  if (!value) {
    return false;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  return isValidCalendarDate(
    Number(match[1]),
    Number(match[2]),
    Number(match[3])
  );
}

function isValidMonthKey(value: string | null): value is MonthKey {
  if (!value) {
    return false;
  }
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

function hasValidWeights(
  weights: readonly number[] | null,
  sellerCount: number
): boolean {
  if (!weights || weights.length !== sellerCount) {
    return false;
  }
  const sum = weights.reduce((acc, value) => acc + value, 0);
  return (
    weights.every((value) => Number.isFinite(value) && value > 0) &&
    Math.abs(sum - 100) < 1e-6
  );
}

function normalizeResolvedSellers(sellers: readonly string[]): string[] {
  const unique: string[] = [];
  for (const seller of sellers) {
    const trimmed = seller.trim();
    if (trimmed && !unique.includes(trimmed)) {
      unique.push(trimmed);
    }
  }
  return unique;
}

interface MergedResolutionFields {
  dateISO: IsoDate | null;
  saleMonth: MonthKey | null;
  isDirectSale: boolean;
  sellers: string[];
  hasExplicitSellerResolution: boolean;
  amountCents: number | null;
  type: SaleType | null;
  status: SaleStatus | null;
  cancellationMonth: MonthKey | null;
  splitWeights: number[] | null;
  hasInvalidExplicitSplit: boolean;
  keepDuplicate: boolean;
}

function isIssueUnresolved(
  issue: PendingIssue,
  merged: MergedResolutionFields
): boolean {
  switch (issue.code) {
    case "INVALID_DATE":
      return !isValidIsoDate(merged.dateISO);

    case "MISSING_SELLER":
      return !merged.isDirectSale && merged.sellers.length === 0;

    case "UNKNOWN_SELLER":
    case "FORMER_EMPLOYEE":
      return (
        !merged.isDirectSale &&
        (!merged.hasExplicitSellerResolution || merged.sellers.length === 0)
      );

    case "INVALID_VALUE":
    case "UNCONFIRMED_VALUE":
      return (
        merged.amountCents === null ||
        !Number.isSafeInteger(merged.amountCents) ||
        merged.amountCents <= 0
      );

    case "MISSING_TYPE":
    case "UNKNOWN_TYPE":
      return merged.type === null;

    case "UNKNOWN_STATUS":
      return merged.status === null;

    case "MISSING_CANCELLATION_MONTH":
    case "INVALID_CANCELLATION_MONTH":
      if (merged.status !== "cancelado") {
        return false;
      }
      if (!isValidMonthKey(merged.cancellationMonth)) {
        return true;
      }
      return Boolean(
        merged.saleMonth && merged.cancellationMonth < merged.saleMonth
      );

    case "AMBIGUOUS_SPLIT":
      if (merged.isDirectSale || merged.sellers.length <= 1) {
        return false;
      }
      return !hasValidWeights(merged.splitWeights, merged.sellers.length);

    case "DUPLICATE_SUSPECT":
      return !merged.keepDuplicate;
  }
}

function appendDerivedIssuesIfNeeded(
  row: ParsedSaleRecord,
  issues: PendingIssue[],
  merged: MergedResolutionFields
): PendingIssue[] {
  const result = [...issues];

  if (merged.status === "cancelado") {
    const hasCancelIssue = result.some(
      (i) =>
        i.code === "MISSING_CANCELLATION_MONTH" ||
        i.code === "INVALID_CANCELLATION_MONTH"
    );
    if (!hasCancelIssue) {
      if (!isValidMonthKey(merged.cancellationMonth)) {
        result.push({
          code: "MISSING_CANCELLATION_MONTH",
          field: "obs",
          rawValue: row.raw.obs,
          message: "Informe o mês em que o cancelamento ocorreu.",
        });
      } else if (
        merged.saleMonth &&
        merged.cancellationMonth < merged.saleMonth
      ) {
        result.push({
          code: "INVALID_CANCELLATION_MONTH",
          field: "obs",
          rawValue: row.raw.obs,
          message: `Mês de cancelamento (${merged.cancellationMonth}) é anterior ao mês da venda (${merged.saleMonth}).`,
        });
      }
    }
  }

  if (
    merged.hasInvalidExplicitSplit &&
    !result.some((i) => i.code === "AMBIGUOUS_SPLIT")
  ) {
    result.push({
      code: "AMBIGUOUS_SPLIT",
      field: "obs",
      rawValue: row.raw.obs,
      message: "Os percentuais do rateio devem ser positivos e somar 100%.",
    });
  }

  return result;
}

export function applySaleResolution(
  row: ParsedSaleRecord,
  resolution?: SaleResolution
): AppliedResolutionState {
  if (!resolution) {
    return row.issues.length === 0
      ? { kind: "confirmed", record: row, wasPending: false }
      : { kind: "pending", record: row };
  }

  if (
    resolution.action === "discard" ||
    (row.duplicateOfRowId !== undefined && resolution.keepDuplicate === false)
  ) {
    return { kind: "discarded", record: row };
  }

  const dateISO =
    resolution.dateISO !== undefined
      ? isValidIsoDate(resolution.dateISO)
        ? resolution.dateISO
        : null
      : row.dateISO;
  const saleMonth = dateISO ? dateISO.slice(0, 7) : null;

  const isDirectSale = Boolean(resolution.isDirectSale);
  const hasExplicitSellerResolution =
    isDirectSale || resolution.sellers !== undefined;
  const sellers = isDirectSale
    ? []
    : resolution.sellers !== undefined
      ? normalizeResolvedSellers(resolution.sellers)
      : [...row.sellers];

  const amountCents =
    resolution.amountCents !== undefined
      ? Number.isSafeInteger(resolution.amountCents) &&
        resolution.amountCents > 0
        ? resolution.amountCents
        : null
      : row.amountCents;

  const type = resolution.type !== undefined ? resolution.type : row.type;
  const status =
    resolution.status !== undefined ? resolution.status : row.status;

  const cancellationMonth =
    status === "fechado"
      ? null
      : resolution.cancellationMonth !== undefined
        ? resolution.cancellationMonth
        : row.cancellationMonth;

  let splitWeights: number[] | null = null;
  let hasInvalidExplicitSplit = false;
  if (!isDirectSale && sellers.length > 1) {
    if (resolution.splitWeights !== undefined) {
      if (hasValidWeights(resolution.splitWeights, sellers.length)) {
        splitWeights = [...resolution.splitWeights];
      } else {
        hasInvalidExplicitSplit = true;
      }
    } else {
      splitWeights = row.splitWeights;
    }
  }

  const merged: MergedResolutionFields = {
    dateISO,
    saleMonth,
    isDirectSale,
    sellers,
    hasExplicitSellerResolution,
    amountCents,
    type,
    status,
    cancellationMonth,
    splitWeights,
    hasInvalidExplicitSplit,
    keepDuplicate: resolution.keepDuplicate === true,
  };

  const filteredIssues = row.issues.filter((issue) =>
    isIssueUnresolved(issue, merged)
  );
  const remainingIssues = appendDerivedIssuesIfNeeded(
    row,
    filteredIssues,
    merged
  );

  const updatedRecord: ParsedSaleRecord = {
    ...row,
    dateISO,
    saleMonth,
    sellers,
    formerEmployees: hasExplicitSellerResolution ? [] : row.formerEmployees,
    unknownSellerTokens: hasExplicitSellerResolution
      ? []
      : row.unknownSellerTokens,
    amountCents,
    type,
    status,
    cancellationMonth,
    splitWeights,
    issues: remainingIssues,
  };

  if (remainingIssues.length > 0) {
    return { kind: "pending", record: updatedRecord };
  }

  return {
    kind: "confirmed",
    record: updatedRecord,
    wasPending: row.issues.length > 0,
  };
}

export function toResolvedSaleData(
  record: ParsedSaleRecord,
  resolution?: SaleResolution
): ResolvedSaleData | null {
  if (
    !record.dateISO ||
    !record.saleMonth ||
    record.amountCents === null ||
    !record.type ||
    !record.status
  ) {
    return null;
  }

  const isDirectSale =
    Boolean(resolution?.isDirectSale) || record.sellers.length === 0;

  return {
    record,
    isDirectSale,
    dateISO: record.dateISO,
    saleMonth: record.saleMonth,
    sellers: record.sellers,
    amountCents: record.amountCents,
    type: record.type,
    status: record.status,
    cancellationMonth: record.cancellationMonth,
    splitWeights: record.splitWeights,
  };
}
