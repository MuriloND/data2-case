import type { IssueSuggestion, PendingIssue } from "../entities/pending-issue";
import type { MonthKey, ParsedSaleRecord } from "../entities/sale";
import { normalizeClientKey } from "./duplicate-detector";
import { formatBrlCents } from "./normalizers/currency-normalizer";

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

function formatMonthLabel(monthKey: MonthKey | null): string {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    return monthKey ?? "";
  }
  const [year, monthStr] = monthKey.split("-");
  const monthIdx = Number(monthStr) - 1;
  const label = MONTH_SHORT_PT[monthIdx] ?? monthStr;
  return `${label}/${year}`;
}

function compareRecordsChronologically(
  a: ParsedSaleRecord,
  b: ParsedSaleRecord
): number {
  const dateA = a.dateISO ?? "9999-99-99";
  const dateB = b.dateISO ?? "9999-99-99";
  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }
  return a.lineNumber - b.lineNumber;
}

function buildClientHistoryMap(
  allRecords: readonly ParsedSaleRecord[]
): Map<string, ParsedSaleRecord[]> {
  const map = new Map<string, ParsedSaleRecord[]>();

  for (const record of allRecords) {
    const key = normalizeClientKey(record.client);
    if (!key) {
      continue;
    }
    const list = map.get(key);
    if (list) {
      list.push(record);
    } else {
      map.set(key, [record]);
    }
  }

  for (const list of map.values()) {
    list.sort(compareRecordsChronologically);
  }

  return map;
}

function findMostRelevantCancelledRecord(
  row: ParsedSaleRecord,
  priorRecords: readonly ParsedSaleRecord[]
): ParsedSaleRecord | undefined {
  const cancelled = priorRecords.filter((item) => item.status === "cancelado");
  if (cancelled.length === 0) {
    return undefined;
  }

  const sameSellerAndValue = cancelled.find(
    (item) =>
      item.amountCents !== null &&
      item.amountCents === row.amountCents &&
      row.sellers.some((seller) => item.sellers.includes(seller))
  );
  if (sameSellerAndValue) {
    return sameSellerAndValue;
  }

  const sameSeller = cancelled.find((item) =>
    row.sellers.some((seller) => item.sellers.includes(seller))
  );
  return sameSeller ?? cancelled[cancelled.length - 1];
}

function suggestSaleTypeForMissingType(
  row: ParsedSaleRecord,
  clientHistoryMap: ReadonlyMap<string, readonly ParsedSaleRecord[]>
): IssueSuggestion | undefined {
  const key = normalizeClientKey(row.client);
  const history = key ? clientHistoryMap.get(key) ?? [] : [];
  const priorRecords = history.filter(
    (item) =>
      item.id !== row.id && compareRecordsChronologically(item, row) < 0
  );

  if (priorRecords.length === 0) {
    return {
      label: "Sugestão: Venda Nova",
      reason: "Nenhum contrato anterior encontrado para este cliente.",
      type: "nova",
    };
  }

  const hasReturnObs = /\b(voltou|retornou|reativ)/i.test(row.raw.obs);
  const priorCancelled = findMostRelevantCancelledRecord(row, priorRecords);
  const latestPrior = priorRecords[priorRecords.length - 1];

  if (
    priorCancelled &&
    (hasReturnObs || latestPrior.status === "cancelado")
  ) {
    const cancelMonthLabel = formatMonthLabel(
      priorCancelled.cancellationMonth ?? priorCancelled.saleMonth
    );
    return {
      label: "Sugestão: Venda Nova",
      reason: `Cliente cancelou contrato anterior (linha ${priorCancelled.lineNumber}, ${cancelMonthLabel}) e retomou nesta venda.`,
      type: "nova",
    };
  }

  const priorActive = [...priorRecords]
    .reverse()
    .find((item) => item.status === "fechado");
  if (priorActive) {
    return {
      label: "Sugestão: Renovação",
      reason: `Cliente já possui venda ativa anterior (linha ${priorActive.lineNumber} em ${formatMonthLabel(priorActive.saleMonth)}).`,
      type: "renovacao",
    };
  }

  return undefined;
}

function buildSuggestionForIssue(
  row: ParsedSaleRecord,
  issue: PendingIssue,
  clientHistoryMap: ReadonlyMap<string, readonly ParsedSaleRecord[]>
): IssueSuggestion | undefined {
  switch (issue.code) {
    case "MISSING_TYPE":
      return suggestSaleTypeForMissingType(row, clientHistoryMap);

    case "MISSING_CANCELLATION_MONTH":
      if (!row.saleMonth) {
        return undefined;
      }
      return {
        label: `Sugestão: ${formatMonthLabel(row.saleMonth)} (mesmo mês)`,
        reason:
          "Observação de cancelamento vazia; sugere-se o mês da própria venda (anulação sem estorno posterior).",
        cancellationMonth: row.saleMonth,
      };

    case "MISSING_SELLER":
      return {
        label: "Confirmar como Venda Direta (R$ 0)",
        reason:
          "Vendedor não informado; vendas diretas entram no histórico com R$ 0,00 de comissão.",
        isDirectSale: true,
      };

    case "UNCONFIRMED_VALUE":
      if (row.suggestedAmountCents === undefined) {
        return undefined;
      }
      return {
        label: `Confirmar ${formatBrlCents(row.suggestedAmountCents)}`,
        reason:
          "Valor extraído com marcador de dúvida (?) aguardando sua confirmação.",
        amountCents: row.suggestedAmountCents,
      };

    case "AMBIGUOUS_SPLIT":
      if (!row.suggestedSplitWeights) {
        return undefined;
      }
      return {
        label: `Confirmar rateio ${row.suggestedSplitWeights
          .map((w) => `${w}%`)
          .join(" / ")}`,
        reason:
          "Percentuais encontrados na observação somam 100% e aguardam confirmação.",
        splitWeights: [...row.suggestedSplitWeights],
      };

    case "DUPLICATE_SUSPECT":
      return {
        label: "Descartar duplicata",
        reason: `Lançamento idêntico já registrado na linha ${row.duplicateOfLineNumber ?? "anterior"}.`,
        keepDuplicate: false,
      };

    default:
      return undefined;
  }
}

export function enrichWithSuggestions(
  rows: readonly ParsedSaleRecord[],
  existingRows: readonly ParsedSaleRecord[] = []
): ParsedSaleRecord[] {
  const clientHistoryMap = buildClientHistoryMap([...existingRows, ...rows]);

  return rows.map((row) => {
    if (row.issues.length === 0) {
      return row;
    }

    const enrichedIssues = row.issues.map((issue) => {
      const suggestion =
        issue.suggestion ??
        buildSuggestionForIssue(row, issue, clientHistoryMap);

      return suggestion ? { ...issue, suggestion } : issue;
    });

    return {
      ...row,
      issues: enrichedIssues,
    };
  });
}
