import type { RawSaleRecord } from "@/domain/commissions/entities/sale";
import {
  OPTIONAL_SALE_COLUMNS,
  REQUIRED_SALE_COLUMNS,
  type SaleColumnName,
} from "@/domain/commissions/ports/sale-source.port";
import type { TokenizedCsvRow } from "./rfc4180-tokenizer";

const KNOWN_COLUMNS: readonly SaleColumnName[] = [
  ...REQUIRED_SALE_COLUMNS,
  ...OPTIONAL_SALE_COLUMNS,
];

export interface HeaderMappingResult {
  headers: string[];
  columnIndex: ReadonlyMap<SaleColumnName, number>;
  missingColumns: string[];
}

export function normalizeHeaderName(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function mapCsvHeaders(rawHeaders: readonly string[]): HeaderMappingResult {
  const headers = rawHeaders.map(normalizeHeaderName);
  const columnIndex = new Map<SaleColumnName, number>();

  headers.forEach((header, index) => {
    if ((KNOWN_COLUMNS as readonly string[]).includes(header)) {
      const column = header as SaleColumnName;
      if (!columnIndex.has(column)) {
        columnIndex.set(column, index);
      }
    }
  });

  const missingColumns = REQUIRED_SALE_COLUMNS.filter(
    (column) => !columnIndex.has(column)
  );

  return {
    headers,
    columnIndex,
    missingColumns,
  };
}

function readCell(
  fields: readonly string[],
  columnIndex: ReadonlyMap<SaleColumnName, number>,
  column: SaleColumnName
): string {
  const index = columnIndex.get(column);
  if (index === undefined || index >= fields.length) {
    return "";
  }
  return fields[index].trim();
}

export function mapRowToRawSaleRecord(
  row: TokenizedCsvRow,
  columnIndex: ReadonlyMap<SaleColumnName, number>
): RawSaleRecord {
  return {
    lineNumber: row.lineNumber,
    data: readCell(row.fields, columnIndex, "data"),
    vendedor: readCell(row.fields, columnIndex, "vendedor"),
    cliente: readCell(row.fields, columnIndex, "cliente"),
    valor: readCell(row.fields, columnIndex, "valor"),
    tipo: readCell(row.fields, columnIndex, "tipo"),
    status: readCell(row.fields, columnIndex, "status"),
    obs: readCell(row.fields, columnIndex, "obs"),
  };
}
