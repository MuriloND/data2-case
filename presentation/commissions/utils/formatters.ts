import type { IsoDate, MonthKey } from "@/domain/commissions/entities/sale";

const MONTH_SHORT_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

const MONTH_LONG_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export function formatMonthShort(monthKey: MonthKey): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    return monthKey;
  }
  const idx = Number(match[2]) - 1;
  return `${MONTH_SHORT_PT[idx] ?? match[2]}/${match[1]}`;
}

export function formatMonthLong(monthKey: MonthKey): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    return monthKey;
  }
  const idx = Number(match[2]) - 1;
  return `${MONTH_LONG_PT[idx] ?? match[2]}/${match[1]}`;
}

export function formatDateBr(dateISO: IsoDate): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!match) {
    return dateISO;
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatSplitPercentage(pct: number): string {
  if (Math.abs(pct - Math.round(pct)) < 1e-6) {
    return `${Math.round(pct)}%`;
  }
  return `${pct.toFixed(1).replace(".", ",")}%`;
}

export function calculateRawGoalPercent(
  accumulatedCents: number,
  goalCents: number
): number {
  if (goalCents <= 0) {
    return 0;
  }
  return Math.round((accumulatedCents / goalCents) * 1000) / 10;
}

export function triggerBrowserDownload(
  content: string,
  mimeType: string,
  filename: string
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
