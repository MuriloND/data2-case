import type { PendingIssue } from "../../entities/pending-issue";

export interface SplitNormalizationResult {
  splitWeights: number[] | null;
  suggestedSplitWeights?: number[];
  issue: PendingIssue | null;
}

const RATIO_PATTERN = /(\d{1,3}(?:\s*\/\s*\d{1,3})+)\s*(\?)?/g;
const UNCERTAIN_SPLIT_WORDS =
  /(?:rateio|divis[aã]o|dividir|percentual|\d+\s*%)\s*\?/i;

function parseRatioParts(rawRatio: string): number[] | null {
  const parts = rawRatio.split("/").map((part) => Number(part.trim()));
  if (
    parts.length < 2 ||
    parts.some((n) => !Number.isFinite(n) || n <= 0)
  ) {
    return null;
  }

  const sum = parts.reduce((acc, current) => acc + current, 0);
  return sum === 100 ? parts : null;
}

export function parseSplitWeights(
  rawObs: string,
  sellerCount: number
): SplitNormalizationResult {
  const trimmedObs = rawObs.trim();
  if (!trimmedObs) {
    return { splitWeights: null, issue: null };
  }

  RATIO_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = RATIO_PATTERN.exec(trimmedObs)) !== null) {
    const weights = parseRatioParts(match[1]);
    if (!weights) {
      continue;
    }

    const hasQuestionMark = Boolean(match[2]);
    const matchesSellerCount =
      sellerCount >= 2 && weights.length === sellerCount;

    if (hasQuestionMark || !matchesSellerCount) {
      return {
        splitWeights: null,
        suggestedSplitWeights: matchesSellerCount ? weights : undefined,
        issue: {
          code: "AMBIGUOUS_SPLIT",
          field: "obs",
          rawValue: rawObs,
          message: `Rateio pendente de confirmação (${match[0].trim()}). Confirme os percentuais de divisão entre os vendedores.`,
        },
      };
    }

    return {
      splitWeights: weights,
      issue: null,
    };
  }

  if (UNCERTAIN_SPLIT_WORDS.test(trimmedObs)) {
    return {
      splitWeights: null,
      issue: {
        code: "AMBIGUOUS_SPLIT",
        field: "obs",
        rawValue: rawObs,
        message: `Observação indica dúvida no rateio ("${trimmedObs}"). Confirme os percentuais entre os vendedores.`,
      },
    };
  }

  return { splitWeights: null, issue: null };
}
