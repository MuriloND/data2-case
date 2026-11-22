import type { PendingIssue } from "../entities/pending-issue";
import type { ParsedSaleRecord } from "../entities/sale";
import { formatBrlCents } from "./normalizers/currency-normalizer";

export function normalizeClientKey(client: string): string {
  return client
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildDuplicateKey(row: ParsedSaleRecord): string | null {
  const clientKey = normalizeClientKey(row.client);
  if (!row.dateISO || !clientKey || row.amountCents === null) {
    return null;
  }

  const sellerKey = [...row.sellers].sort().join("+");
  return [
    row.dateISO,
    sellerKey,
    clientKey,
    String(row.amountCents),
    row.type ?? "",
    row.status ?? "",
  ].join("|");
}

function createDuplicateIssue(
  row: ParsedSaleRecord,
  original: ParsedSaleRecord
): PendingIssue {
  const valueLabel =
    row.amountCents !== null ? formatBrlCents(row.amountCents) : row.raw.valor;

  return {
    code: "DUPLICATE_SUSPECT",
    field: "registro",
    rawValue: `${row.raw.data} | ${row.raw.vendedor} | ${row.client} | ${valueLabel}`,
    message: `Possível duplicata exata da linha ${original.lineNumber} (${row.client}, ${valueLabel} em ${row.raw.data}). Confirme se deve descartar ou manter.`,
  };
}

export function detectDuplicateSales(
  rows: readonly ParsedSaleRecord[],
  existingRows: readonly ParsedSaleRecord[] = []
): ParsedSaleRecord[] {
  const seenByKey = new Map<string, ParsedSaleRecord>();

  for (const existing of existingRows) {
    const key = buildDuplicateKey(existing);
    if (key && !seenByKey.has(key)) {
      seenByKey.set(key, existing);
    }
  }

  return rows.map((row) => {
    const key = buildDuplicateKey(row);
    if (!key) {
      return row;
    }

    const original = seenByKey.get(key);
    if (!original) {
      seenByKey.set(key, row);
      return row;
    }

    return {
      ...row,
      duplicateOfRowId: original.id,
      duplicateOfLineNumber: original.lineNumber,
      issues: [...row.issues, createDuplicateIssue(row, original)],
    };
  });
}
