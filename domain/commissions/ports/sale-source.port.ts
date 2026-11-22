import type { RawSaleRecord } from "../entities/sale";

export const REQUIRED_SALE_COLUMNS = [
  "data",
  "vendedor",
  "cliente",
  "valor",
  "tipo",
  "status",
] as const;

export const OPTIONAL_SALE_COLUMNS = ["obs"] as const;

export type RequiredSaleColumn = (typeof REQUIRED_SALE_COLUMNS)[number];
export type OptionalSaleColumn = (typeof OPTIONAL_SALE_COLUMNS)[number];
export type SaleColumnName = RequiredSaleColumn | OptionalSaleColumn;

export interface SaleIngestionBatch {
  headers: string[];
  rows: RawSaleRecord[];
  missingColumns: string[];
  totalLines: number;
  metadata?: Record<string, string>;
}

export interface SaleSourcePort<TInput = string> {
  read(input: TInput): SaleIngestionBatch;
}
