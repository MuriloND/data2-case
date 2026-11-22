import {
  REQUIRED_SALE_COLUMNS,
  type SaleIngestionBatch,
  type SaleSourcePort,
} from "@/domain/commissions/ports/sale-source.port";
import { detectCsvDelimiter, stripUtf8Bom } from "./delimiter-detector";
import { mapCsvHeaders, mapRowToRawSaleRecord } from "./header-mapper";
import { tokenizeCsv } from "./rfc4180-tokenizer";

export class CsvSaleSourceAdapter implements SaleSourcePort<string> {
  read(input: string): SaleIngestionBatch {
    const cleanText = stripUtf8Bom(input);
    if (cleanText.trim() === "") {
      return {
        headers: [],
        rows: [],
        missingColumns: [...REQUIRED_SALE_COLUMNS],
        totalLines: 0,
        metadata: { format: "csv", delimiter: "," },
      };
    }

    const delimiter = detectCsvDelimiter(cleanText);
    const tokenizedRows = tokenizeCsv(cleanText, delimiter);

    if (tokenizedRows.length === 0) {
      return {
        headers: [],
        rows: [],
        missingColumns: [...REQUIRED_SALE_COLUMNS],
        totalLines: 0,
        metadata: { format: "csv", delimiter },
      };
    }

    const [headerRow, ...dataRows] = tokenizedRows;
    const { headers, columnIndex, missingColumns } = mapCsvHeaders(
      headerRow.fields
    );
    const rows = dataRows.map((row) =>
      mapRowToRawSaleRecord(row, columnIndex)
    );
    const lastRow = tokenizedRows[tokenizedRows.length - 1];

    return {
      headers,
      rows,
      missingColumns,
      totalLines: lastRow ? lastRow.lineNumber : 0,
      metadata: {
        format: "csv",
        delimiter,
      },
    };
  }
}

export function createCsvSaleSourceAdapter(): SaleSourcePort<string> {
  return new CsvSaleSourceAdapter();
}
