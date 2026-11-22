import type { PendingIssue } from "../../entities/pending-issue";
import type { IsoDate, MonthKey, SaleStatus } from "../../entities/sale";

export interface ExtractedCancellationMonth {
  month: MonthKey | null;
  hasExplicitYear: boolean;
}

export interface StatusNormalizationResult {
  status: SaleStatus | null;
  cancellationMonth: MonthKey | null;
  issues: PendingIssue[];
}

const FECHADO_ALIASES = new Set(["fechado", "assinado", "ok"]);
const CANCELADO_ALIASES = new Set(["cancelado", "estornado"]);

const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  jan: 1,
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  marco: 3,
  abr: 4,
  abril: 4,
  mai: 5,
  maio: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  set: 9,
  setembro: 9,
  out: 10,
  outubro: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12,
};

const MONTH_WORD_PATTERN =
  /(?:^|[^a-z])(janeiro|jan|fevereiro|fev|marco|mar|abril|abr|maio|mai|junho|jun|julho|jul|agosto|ago|setembro|set|outubro|out|novembro|nov|dezembro|dez)(?:\s*(?:de|\/)?\s*(20\d{2}))?(?=$|[^a-z0-9])/i;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function formatMonthKey(year: number, monthNumber: number): MonthKey {
  return `${year}-${String(monthNumber).padStart(2, "0")}`;
}

function inferYearForMonth(
  monthNumber: number,
  saleDateISO: IsoDate | null,
  fallbackYear = 2025
): number {
  if (!saleDateISO) {
    return fallbackYear;
  }

  const saleYear = Number(saleDateISO.slice(0, 4));
  const saleMonth = Number(saleDateISO.slice(5, 7));

  return monthNumber < saleMonth ? saleYear + 1 : saleYear;
}

export function extractCancellationMonth(
  rawObs: string,
  saleDateISO: IsoDate | null
): ExtractedCancellationMonth {
  const normalizedObs = normalizeText(rawObs);
  if (!normalizedObs) {
    return { month: null, hasExplicitYear: false };
  }

  if (/\bmesmo mes\b/.test(normalizedObs) && saleDateISO) {
    return { month: saleDateISO.slice(0, 7), hasExplicitYear: false };
  }

  const isoMonthMatch = /\b(20\d{2})-(0?[1-9]|1[0-2])\b/.exec(normalizedObs);
  if (isoMonthMatch) {
    return {
      month: formatMonthKey(Number(isoMonthMatch[1]), Number(isoMonthMatch[2])),
      hasExplicitYear: true,
    };
  }

  const fullBrDateMatch = /\b\d{1,2}\/(0?[1-9]|1[0-2])\/(20\d{2})\b/.exec(
    normalizedObs
  );
  if (fullBrDateMatch) {
    return {
      month: formatMonthKey(
        Number(fullBrDateMatch[2]),
        Number(fullBrDateMatch[1])
      ),
      hasExplicitYear: true,
    };
  }

  const monthYearMatch = /\b(0?[1-9]|1[0-2])\/(20\d{2})\b/.exec(normalizedObs);
  if (monthYearMatch) {
    return {
      month: formatMonthKey(
        Number(monthYearMatch[2]),
        Number(monthYearMatch[1])
      ),
      hasExplicitYear: true,
    };
  }

  const wordMatch = MONTH_WORD_PATTERN.exec(normalizedObs);
  if (wordMatch) {
    const monthNumber = MONTH_NAME_TO_NUMBER[wordMatch[1]];
    if (monthNumber) {
      const explicitYear = wordMatch[2] ? Number(wordMatch[2]) : null;
      const year =
        explicitYear ?? inferYearForMonth(monthNumber, saleDateISO);
      return {
        month: formatMonthKey(year, monthNumber),
        hasExplicitYear: explicitYear !== null,
      };
    }
  }

  return { month: null, hasExplicitYear: false };
}

export function parseSaleStatus(
  rawStatus: string,
  rawObs: string,
  saleDateISO: IsoDate | null
): StatusNormalizationResult {
  const normalized = normalizeText(rawStatus);

  if (!normalized) {
    return {
      status: null,
      cancellationMonth: null,
      issues: [
        {
          code: "UNKNOWN_STATUS",
          field: "status",
          rawValue: rawStatus,
          message:
            'Status em branco. Confirme manualmente se a venda está "fechado" ou "cancelado".',
        },
      ],
    };
  }

  if (FECHADO_ALIASES.has(normalized)) {
    return {
      status: "fechado",
      cancellationMonth: null,
      issues: [],
    };
  }

  if (!CANCELADO_ALIASES.has(normalized)) {
    return {
      status: null,
      cancellationMonth: null,
      issues: [
        {
          code: "UNKNOWN_STATUS",
          field: "status",
          rawValue: rawStatus,
          message: `Status não reconhecido ("${rawStatus.trim()}"). Confirme manualmente se é "fechado" ou "cancelado".`,
        },
      ],
    };
  }

  const extracted = extractCancellationMonth(rawObs, saleDateISO);
  if (!extracted.month) {
    return {
      status: "cancelado",
      cancellationMonth: null,
      issues: [
        {
          code: "MISSING_CANCELLATION_MONTH",
          field: "obs",
          rawValue: rawObs,
          message:
            "Venda cancelada/estornada sem mês de cancelamento identificável na observação. Informe o mês do cancelamento.",
        },
      ],
    };
  }

  const saleMonth = saleDateISO ? saleDateISO.slice(0, 7) : null;
  if (
    extracted.hasExplicitYear &&
    saleMonth &&
    extracted.month < saleMonth
  ) {
    return {
      status: "cancelado",
      cancellationMonth: null,
      issues: [
        {
          code: "INVALID_CANCELLATION_MONTH",
          field: "obs",
          rawValue: rawObs,
          message: `Mês de cancelamento (${extracted.month}) é anterior ao mês da venda (${saleMonth}). Confirme o mês correto.`,
        },
      ],
    };
  }

  return {
    status: "cancelado",
    cancellationMonth: extracted.month,
    issues: [],
  };
}
