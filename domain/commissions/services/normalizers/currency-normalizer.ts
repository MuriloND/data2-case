import type { PendingIssue } from "../../entities/pending-issue";

export type CurrencyNormalizationResult =
  | { ok: true; amountCents: number }
  | { ok: false; suggestedAmountCents?: number; issue: PendingIssue };

export function formatBrlCents(cents: number): string {
  const isNegative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  const integerPart = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const formatted = `R$ ${integerPart},${frac}`;
  return isNegative ? `-${formatted}` : formatted;
}

function extractAmountCentsFromNumericToken(rawToken: string): number | null {
  const compact = rawToken
    .replace(/^r\$\s*/i, "")
    .replace(/\s+/g, "")
    .trim();

  if (!compact || compact.startsWith("-")) {
    return null;
  }

  const shorthandMatch = /^([0-9]+(?:[.,][0-9]+)?)[kK]$/.exec(compact);
  if (shorthandMatch) {
    const base = Number(shorthandMatch[1].replace(",", "."));
    const cents = Math.round(base * 1000 * 100);
    return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
  }

  if (/^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(compact)) {
    const normalized = compact.replace(/\./g, "").replace(",", ".");
    const cents = Math.round(Number(normalized) * 100);
    return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
  }

  if (/^\d+,\d{1,2}$/.test(compact)) {
    const normalized = compact.replace(",", ".");
    const cents = Math.round(Number(normalized) * 100);
    return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
  }

  if (/^\d{1,3}(?:\.\d{3})+$/.test(compact)) {
    const normalized = compact.replace(/\./g, "");
    const cents = Number(normalized) * 100;
    return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
  }

  if (/^\d+\.\d{1,2}$/.test(compact)) {
    const cents = Math.round(Number(compact) * 100);
    return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
  }

  if (/^\d+$/.test(compact)) {
    const cents = Number(compact) * 100;
    return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
  }

  return null;
}

export function parseSaleAmount(
  rawValue: string,
  rawObs = ""
): CurrencyNormalizationResult {
  const trimmed = rawValue.trim();
  const hasQuestionMark = trimmed.includes("?");
  const hasConfirmObs = /confirmar\s+valor/i.test(rawObs);
  const sanitizedForSuggestion = trimmed.replace(/\?/g, "").trim();
  const parsedCents = extractAmountCentsFromNumericToken(sanitizedForSuggestion);

  if (parsedCents === null) {
    const displayValue = trimmed || "(vazio)";
    return {
      ok: false,
      issue: {
        code: "INVALID_VALUE",
        field: "valor",
        rawValue,
        message: `Valor inválido ou não numérico (${displayValue}). Confirme o valor exato da venda.`,
      },
    };
  }

  if (hasQuestionMark || hasConfirmObs) {
    return {
      ok: false,
      suggestedAmountCents: parsedCents,
      issue: {
        code: "UNCONFIRMED_VALUE",
        field: "valor",
        rawValue,
        message: `Valor marcado com dúvida (${trimmed}). Confirme ou corrija o valor antes de contabilizar.`,
      },
    };
  }

  return {
    ok: true,
    amountCents: parsedCents,
  };
}
