import type { IsoDate, MonthKey } from "../../entities/sale";
import type { PendingIssue } from "../../entities/pending-issue";

export type DateNormalizationResult =
  | { ok: true; dateISO: IsoDate; saleMonth: MonthKey }
  | { ok: false; issue: PendingIssue };

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function isValidCalendarDate(
  year: number,
  month: number,
  day: number
): boolean {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

function extractExplicitYear(rawDate: string): number | null {
  const trimmed = rawDate.trim();
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return isValidCalendarDate(year, month, day) ? year : null;
  }

  const brMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    const year = Number(brMatch[3]);
    return isValidCalendarDate(year, month, day) ? year : null;
  }

  return null;
}

export function inferReferenceYear(
  rawDates: readonly string[],
  fallbackYear = 2025
): number {
  const yearCounts = new Map<number, number>();

  for (const rawDate of rawDates) {
    const year = extractExplicitYear(rawDate);
    if (year !== null) {
      yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
    }
  }

  if (yearCounts.size === 0) {
    return fallbackYear;
  }

  let bestYear = fallbackYear;
  let bestCount = -1;
  for (const [year, count] of yearCounts.entries()) {
    if (count > bestCount || (count === bestCount && year > bestYear)) {
      bestYear = year;
      bestCount = count;
    }
  }

  return bestYear;
}

function parseDateParts(
  rawValue: string,
  referenceYear: number
): { year: number; month: number; day: number } | null {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }

  const brFullMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (brFullMatch) {
    return {
      day: Number(brFullMatch[1]),
      month: Number(brFullMatch[2]),
      year: Number(brFullMatch[3]),
    };
  }

  const brShortMatch = /^(\d{1,2})\/(\d{1,2})$/.exec(trimmed);
  if (brShortMatch) {
    return {
      day: Number(brShortMatch[1]),
      month: Number(brShortMatch[2]),
      year: referenceYear,
    };
  }

  return null;
}

export function parseSaleDate(
  rawValue: string,
  referenceYear: number
): DateNormalizationResult {
  const parts = parseDateParts(rawValue, referenceYear);
  if (!parts || !isValidCalendarDate(parts.year, parts.month, parts.day)) {
    const displayValue = rawValue.trim() || "(vazio)";
    return {
      ok: false,
      issue: {
        code: "INVALID_DATE",
        field: "data",
        rawValue,
        message: `Data inválida ou irreconhecível (${displayValue}). Informe a data correta da venda.`,
      },
    };
  }

  const yearStr = String(parts.year);
  const monthStr = pad2(parts.month);
  const dayStr = pad2(parts.day);

  return {
    ok: true,
    dateISO: `${yearStr}-${monthStr}-${dayStr}`,
    saleMonth: `${yearStr}-${monthStr}`,
  };
}
