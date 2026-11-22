import type { PendingIssue } from "../../entities/pending-issue";
import type { SellerRegistry } from "../../entities/seller";
import { resolveSellerAlias } from "../seller-resolver";

export interface SellerListNormalizationResult {
  sellers: string[];
  formerEmployees: string[];
  unknownTokens: string[];
  issues: PendingIssue[];
}

const SELLER_SPLIT_PATTERN = /\s*(?:\+|\/|&|\be\b)\s*/i;

export function parseSellerList(
  rawValue: string,
  registry: SellerRegistry
): SellerListNormalizationResult {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return {
      sellers: [],
      formerEmployees: [],
      unknownTokens: [],
      issues: [
        {
          code: "MISSING_SELLER",
          field: "vendedor",
          rawValue,
          message:
            "Vendedor em branco. Confirme se é Venda Direta (R$ 0 de comissão) ou atribua um vendedor.",
        },
      ],
    };
  }

  const tokens = trimmed
    .split(SELLER_SPLIT_PATTERN)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return {
      sellers: [],
      formerEmployees: [],
      unknownTokens: [],
      issues: [
        {
          code: "MISSING_SELLER",
          field: "vendedor",
          rawValue,
          message:
            "Vendedor em branco. Confirme se é Venda Direta (R$ 0 de comissão) ou atribua um vendedor.",
        },
      ],
    };
  }

  const sellers: string[] = [];
  const seenSellers = new Set<string>();
  const formerEmployees: string[] = [];
  const unknownTokens: string[] = [];

  for (const token of tokens) {
    const resolved = resolveSellerAlias(token, registry);
    if (resolved.kind === "active") {
      const name = resolved.seller.canonicalName;
      if (!seenSellers.has(name)) {
        seenSellers.add(name);
        sellers.push(name);
      }
      continue;
    }

    if (resolved.kind === "former") {
      const name = resolved.seller.canonicalName;
      if (!formerEmployees.includes(name)) {
        formerEmployees.push(name);
      }
      continue;
    }

    if (resolved.kind === "unknown" && !unknownTokens.includes(resolved.rawToken)) {
      unknownTokens.push(resolved.rawToken);
    }
  }

  const issues: PendingIssue[] = [];

  if (formerEmployees.length > 0) {
    issues.push({
      code: "FORMER_EMPLOYEE",
      field: "vendedor",
      rawValue,
      unknownTokens: [...formerEmployees],
      message: `Vendedor desligado/ex-funcionário (${formerEmployees.join(", ")}). Decida se deve pagar, reatribuir ou descartar.`,
    });
  }

  if (unknownTokens.length > 0) {
    issues.push({
      code: "UNKNOWN_SELLER",
      field: "vendedor",
      rawValue,
      unknownTokens: [...unknownTokens],
      message: `Vendedor desconhecido (${unknownTokens.join(", ")}). Mapeie para um vendedor existente, crie um novo ou marque como Venda Direta.`,
    });
  }

  return {
    sellers,
    formerEmployees,
    unknownTokens,
    issues,
  };
}
