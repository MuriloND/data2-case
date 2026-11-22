import type { PendingIssue } from "../entities/pending-issue";
import type { ParsedSaleRecord, RawSaleRecord } from "../entities/sale";
import type { SellerRegistry } from "../entities/seller";
import { parseSaleAmount } from "./normalizers/currency-normalizer";
import { parseSaleDate } from "./normalizers/date-normalizer";
import { parseSaleType } from "./normalizers/sale-type-normalizer";
import { parseSellerList } from "./normalizers/seller-list-normalizer";
import { parseSplitWeights } from "./normalizers/split-normalizer";
import { parseSaleStatus } from "./normalizers/status-normalizer";

export interface ParseSaleRecordContext {
  batchId: string;
  referenceYear: number;
  sellerRegistry: SellerRegistry;
}

export function parseRawSaleRecord(
  raw: RawSaleRecord,
  context: ParseSaleRecordContext
): ParsedSaleRecord {
  const issues: PendingIssue[] = [];

  const dateResult = parseSaleDate(raw.data, context.referenceYear);
  if (!dateResult.ok) {
    issues.push(dateResult.issue);
  }
  const dateISO = dateResult.ok ? dateResult.dateISO : null;
  const saleMonth = dateResult.ok ? dateResult.saleMonth : null;

  const sellerResult = parseSellerList(raw.vendedor, context.sellerRegistry);
  issues.push(...sellerResult.issues);

  const amountResult = parseSaleAmount(raw.valor, raw.obs);
  if (!amountResult.ok) {
    issues.push(amountResult.issue);
  }
  const amountCents = amountResult.ok ? amountResult.amountCents : null;
  const suggestedAmountCents = !amountResult.ok
    ? amountResult.suggestedAmountCents
    : undefined;

  const typeResult = parseSaleType(raw.tipo);
  if (!typeResult.ok) {
    issues.push(typeResult.issue);
  }
  const type = typeResult.ok ? typeResult.type : null;

  const statusResult = parseSaleStatus(raw.status, raw.obs, dateISO);
  issues.push(...statusResult.issues);

  const splitResult = parseSplitWeights(
    raw.obs,
    sellerResult.sellers.length
  );
  if (splitResult.issue) {
    issues.push(splitResult.issue);
  }

  return {
    id: `${context.batchId}:L${raw.lineNumber}`,
    batchId: context.batchId,
    lineNumber: raw.lineNumber,
    raw,
    dateISO,
    saleMonth,
    sellers: sellerResult.sellers,
    formerEmployees: sellerResult.formerEmployees,
    unknownSellerTokens: sellerResult.unknownTokens,
    client: raw.cliente.trim(),
    amountCents,
    suggestedAmountCents,
    type,
    status: statusResult.status,
    cancellationMonth: statusResult.cancellationMonth,
    splitWeights: splitResult.splitWeights,
    suggestedSplitWeights: splitResult.suggestedSplitWeights,
    issues,
  };
}
