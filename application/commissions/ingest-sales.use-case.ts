import type { ParsedSaleRecord } from "../../domain/commissions/entities/sale";
import type { SellerRegistry } from "../../domain/commissions/entities/seller";
import type { SaleSourcePort } from "../../domain/commissions/ports/sale-source.port";
import { detectDuplicateSales } from "../../domain/commissions/services/duplicate-detector";
import { inferReferenceYear } from "../../domain/commissions/services/normalizers/date-normalizer";
import { parseRawSaleRecord } from "../../domain/commissions/services/sale-record-parser";
import { enrichWithSuggestions } from "../../domain/commissions/services/suggestion-engine";

export interface IngestSalesRequest<TInput = string> {
  input: TInput;
  batchId: string;
  sellerRegistry: SellerRegistry;
  existingRows?: readonly ParsedSaleRecord[];
  fallbackYear?: number;
}

export interface IngestSalesResult {
  batchId: string;
  headers: string[];
  missingColumns: string[];
  totalLines: number;
  metadata?: Record<string, string>;
  rows: ParsedSaleRecord[];
  pendingRows: ParsedSaleRecord[];
  confirmedRows: ParsedSaleRecord[];
}

export class IngestSalesUseCase<TInput = string> {
  constructor(private readonly saleSource: SaleSourcePort<TInput>) {}

  execute(request: IngestSalesRequest<TInput>): IngestSalesResult {
    const batch = this.saleSource.read(request.input);
    const referenceYear = inferReferenceYear(
      batch.rows.map((row) => row.data),
      request.fallbackYear ?? 2025
    );

    const parsedRows = batch.rows.map((raw) =>
      parseRawSaleRecord(raw, {
        batchId: request.batchId,
        referenceYear,
        sellerRegistry: request.sellerRegistry,
      })
    );

    const existingRows = request.existingRows ?? [];
    const dedupedRows = detectDuplicateSales(parsedRows, existingRows);
    const enrichedRows = enrichWithSuggestions(dedupedRows, existingRows);

    const pendingRows = enrichedRows.filter((row) => row.issues.length > 0);
    const confirmedRows = enrichedRows.filter(
      (row) => row.issues.length === 0
    );

    return {
      batchId: request.batchId,
      headers: batch.headers,
      missingColumns: batch.missingColumns,
      totalLines: batch.totalLines,
      metadata: batch.metadata,
      rows: enrichedRows,
      pendingRows,
      confirmedRows,
    };
  }
}

export function createIngestSalesUseCase<TInput = string>(
  saleSource: SaleSourcePort<TInput>
): IngestSalesUseCase<TInput> {
  return new IngestSalesUseCase(saleSource);
}
