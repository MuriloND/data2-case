import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createIngestSalesUseCase } from "@/application/commissions/ingest-sales.use-case";
import { createDefaultSellerRegistry } from "@/domain/commissions/entities/seller";
import { createCsvSaleSourceAdapter } from "@/infrastructure/csv/csv-sale-source.adapter";

const REAL_CSV_PATH = path.resolve(
  process.cwd(),
  "test_files",
  "YMwngYvqunGNvAf1zJNut.csv"
);
const hasRealCsv = fs.existsSync(REAL_CSV_PATH);

describe("IngestSalesUseCase", () => {
  const useCase = createIngestSalesUseCase(createCsvSaleSourceAdapter());
  const sellerRegistry = createDefaultSellerRegistry();

  it("supports incremental batch ingestion with existingRows cross-checking", () => {
    const batch1 = useCase.execute({
      input: [
        "data,vendedor,cliente,valor,tipo,status,obs",
        "10/10/2025,Lê,Empresa Horizonte,20000,nova,cancelado,cancelou em outubro",
      ].join("\n"),
      batchId: "out",
      sellerRegistry,
    });

    const batch2 = useCase.execute({
      input: [
        "data,vendedor,cliente,valor,tipo,status,obs",
        "05/11/2025,Leticia,Empresa Horizonte,20000,,fechado,voltou em nov",
      ].join("\n"),
      batchId: "nov",
      sellerRegistry,
      existingRows: batch1.rows,
    });

    expect(batch2.pendingRows).toHaveLength(1);
    expect(batch2.pendingRows[0].issues[0].code).toBe("MISSING_TYPE");
    expect(batch2.pendingRows[0].issues[0].suggestion?.type).toBe("nova");
  });

  it.skipIf(!hasRealCsv)(
    "ingests real CSV and isolates the exact 19 pending rows while confirming 204 rows",
    () => {
      const content = fs.readFileSync(REAL_CSV_PATH, "utf-8");
      const result = useCase.execute({
        input: content,
        batchId: "jul-out-2025",
        sellerRegistry,
      });

      expect(result.missingColumns).toEqual([]);
      expect(result.rows).toHaveLength(223);
      expect(result.confirmedRows).toHaveLength(204);
      expect(result.pendingRows).toHaveLength(19);

      const pendingLines = result.pendingRows.map((row) => row.lineNumber);
      expect(pendingLines).toEqual([
        4, 29, 51, 55, 56, 86, 103, 116, 128, 134, 136, 138, 151, 152, 161, 180,
        186, 196, 214,
      ]);

      const pendingByLine = new Map(
        result.pendingRows.map((row) => [row.lineNumber, row])
      );

      const missingTypeLines = [
        4, 29, 55, 56, 86, 103, 136, 138, 151, 152, 186, 196, 214,
      ];
      for (const line of missingTypeLines) {
        const row = pendingByLine.get(line);
        expect(row?.issues).toHaveLength(1);
        expect(row?.issues[0].code).toBe("MISSING_TYPE");
      }

      const line196 = pendingByLine.get(196);
      expect(line196?.type).toBeNull();
      expect(line196?.issues[0].suggestion?.type).toBe("nova");

      const line51 = pendingByLine.get(51);
      expect(line51?.issues).toHaveLength(1);
      expect(line51?.issues[0].code).toBe("MISSING_CANCELLATION_MONTH");
      expect(line51?.issues[0].suggestion?.cancellationMonth).toBe("2025-07");

      const line116 = pendingByLine.get(116);
      expect(line116?.issues).toHaveLength(1);
      expect(line116?.issues[0].code).toBe("MISSING_SELLER");
      expect(line116?.issues[0].suggestion?.isDirectSale).toBe(true);

      const line128 = pendingByLine.get(128);
      expect(line128?.issues).toHaveLength(1);
      expect(line128?.issues[0].code).toBe("FORMER_EMPLOYEE");
      expect(line128?.formerEmployees).toEqual(["Fernanda (Ex-func.)"]);

      const line134 = pendingByLine.get(134);
      expect(line134?.issues).toHaveLength(1);
      expect(line134?.issues[0].code).toBe("AMBIGUOUS_SPLIT");
      expect(line134?.issues[0].suggestion?.splitWeights).toEqual([60, 40]);

      const line161 = pendingByLine.get(161);
      expect(line161?.issues).toHaveLength(1);
      expect(line161?.issues[0].code).toBe("DUPLICATE_SUSPECT");
      expect(line161?.duplicateOfLineNumber).toBe(160);
      expect(line161?.issues[0].suggestion?.keepDuplicate).toBe(false);

      const line180 = pendingByLine.get(180);
      expect(line180?.issues).toHaveLength(1);
      expect(line180?.issues[0].code).toBe("UNCONFIRMED_VALUE");
      expect(line180?.amountCents).toBeNull();
      expect(line180?.issues[0].suggestion?.amountCents).toBe(1_200_000);
    }
  );
});
