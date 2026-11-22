import { describe, expect, it } from "vitest";
import { createIngestSalesUseCase } from "@/application/commissions/ingest-sales.use-case";
import { createDefaultSellerRegistry } from "@/domain/commissions/entities/seller";
import { createCsvSaleSourceAdapter } from "@/infrastructure/csv/csv-sale-source.adapter";

describe("Universal Fallback & Duplicate Isolation (Mandatory Tests #8 and #10)", () => {
  const useCase = createIngestSalesUseCase(createCsvSaleSourceAdapter());
  const sellerRegistry = createDefaultSellerRegistry();

  it("Mandatory Test #10: never breaks or guesses on corrupted/unrecognized CSV fields and isolates 100% into pendingRows", () => {
    const brokenCsv = [
      "data,vendedor,cliente,valor,tipo,status,obs",
      "32/13/2025,Desconhecido,Cliente X,a combinar,upgrade,em análise,revisar tudo",
      "31/02/2025,,Cliente Y,-500,pacote,pendente,",
    ].join("\n");

    const result = useCase.execute({
      input: brokenCsv,
      batchId: "broken-csv",
      sellerRegistry,
    });

    expect(result.rows).toHaveLength(2);
    expect(result.confirmedRows).toHaveLength(0);
    expect(result.pendingRows).toHaveLength(2);

    const firstRow = result.pendingRows[0];
    expect(firstRow.dateISO).toBeNull();
    expect(firstRow.sellers).toEqual([]);
    expect(firstRow.unknownSellerTokens).toEqual(["Desconhecido"]);
    expect(firstRow.amountCents).toBeNull();
    expect(firstRow.type).toBeNull();
    expect(firstRow.status).toBeNull();

    const firstCodes = firstRow.issues.map((issue) => issue.code);
    expect(firstCodes).toEqual([
      "INVALID_DATE",
      "UNKNOWN_SELLER",
      "INVALID_VALUE",
      "UNKNOWN_TYPE",
      "UNKNOWN_STATUS",
    ]);
    expect(firstRow.raw).toEqual({
      lineNumber: 2,
      data: "32/13/2025",
      vendedor: "Desconhecido",
      cliente: "Cliente X",
      valor: "a combinar",
      tipo: "upgrade",
      status: "em análise",
      obs: "revisar tudo",
    });

    const secondCodes = result.pendingRows[1].issues.map((issue) => issue.code);
    expect(secondCodes).toEqual([
      "INVALID_DATE",
      "MISSING_SELLER",
      "INVALID_VALUE",
      "UNKNOWN_TYPE",
      "UNKNOWN_STATUS",
    ]);
  });

  it("Mandatory Test #8: detects exact duplicate via use case and routes duplicate only to pendingRows", () => {
    const csvWithDuplicate = [
      "data,vendedor,cliente,valor,tipo,status,obs",
      '25/09/2025,Bruno,Distribuidora Litoral,"14.400,00",renovação,fechado,',
      '25/09/2025,Bruno Sá,Distribuidora Litoral,14400,renov,ok,',
    ].join("\n");

    const result = useCase.execute({
      input: csvWithDuplicate,
      batchId: "dup-test",
      sellerRegistry,
    });

    expect(result.confirmedRows).toHaveLength(1);
    expect(result.confirmedRows[0].lineNumber).toBe(2);

    expect(result.pendingRows).toHaveLength(1);
    expect(result.pendingRows[0].lineNumber).toBe(3);
    expect(result.pendingRows[0].duplicateOfLineNumber).toBe(2);
    expect(result.pendingRows[0].issues[0].code).toBe("DUPLICATE_SUSPECT");
  });
});
