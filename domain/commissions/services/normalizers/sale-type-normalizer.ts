import type { PendingIssue } from "../../entities/pending-issue";
import type { SaleType } from "../../entities/sale";

export type SaleTypeNormalizationResult =
  | { ok: true; type: SaleType }
  | { ok: false; issue: PendingIssue };

const NOVA_ALIASES = new Set([
  "nova",
  "novo",
  "novo cliente",
  "venda nova",
]);

const RENOVACAO_ALIASES = new Set([
  "renov",
  "renov.",
  "renovacao",
  "renovacao anual",
]);

function normalizeTypeToken(rawValue: string): string {
  return rawValue
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSaleType(rawValue: string): SaleTypeNormalizationResult {
  const normalized = normalizeTypeToken(rawValue);

  if (!normalized) {
    return {
      ok: false,
      issue: {
        code: "MISSING_TYPE",
        field: "tipo",
        rawValue,
        message:
          "Tipo de venda em branco. Classifique manualmente como Venda Nova ou Renovação.",
      },
    };
  }

  if (NOVA_ALIASES.has(normalized)) {
    return { ok: true, type: "nova" };
  }

  if (RENOVACAO_ALIASES.has(normalized)) {
    return { ok: true, type: "renovacao" };
  }

  return {
    ok: false,
    issue: {
      code: "UNKNOWN_TYPE",
      field: "tipo",
      rawValue,
      message: `Tipo de venda não reconhecido ("${rawValue.trim()}"). Classifique manualmente como Venda Nova ou Renovação.`,
    },
  };
}
