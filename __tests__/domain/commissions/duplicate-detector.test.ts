import { describe, expect, it } from "vitest";
import { createDefaultSellerRegistry } from "@/domain/commissions/entities/seller";
import { detectDuplicateSales } from "@/domain/commissions/services/duplicate-detector";
import { parseRawSaleRecord } from "@/domain/commissions/services/sale-record-parser";

describe("duplicate-detector (Mandatory Test #8)", () => {
  const registry = createDefaultSellerRegistry();

  it("keeps the first occurrence clean and isolates exact duplicates with DUPLICATE_SUSPECT", () => {
    const baseRaw = {
      data: "25/09/2025",
      vendedor: "Bruno",
      cliente: "Distribuidora Litoral",
      valor: "14.400,00",
      tipo: "renovação",
      status: "fechado",
      obs: "",
    };

    const row160 = parseRawSaleRecord(
      { ...baseRaw, lineNumber: 160 },
      { batchId: "b1", referenceYear: 2025, sellerRegistry: registry }
    );
    const row161 = parseRawSaleRecord(
      { ...baseRaw, lineNumber: 161 },
      { batchId: "b1", referenceYear: 2025, sellerRegistry: registry }
    );
    const differentAmountRow = parseRawSaleRecord(
      { ...baseRaw, lineNumber: 162, valor: "18.000,00" },
      { batchId: "b1", referenceYear: 2025, sellerRegistry: registry }
    );

    const result = detectDuplicateSales([row160, row161, differentAmountRow]);

    expect(result[0].issues).toHaveLength(0);
    expect(result[0].duplicateOfLineNumber).toBeUndefined();

    expect(result[1].duplicateOfRowId).toBe("b1:L160");
    expect(result[1].duplicateOfLineNumber).toBe(160);
    expect(result[1].issues).toHaveLength(1);
    expect(result[1].issues[0].code).toBe("DUPLICATE_SUSPECT");
    expect(result[1].issues[0].field).toBe("registro");

    expect(result[2].issues).toHaveLength(0);
  });

  it("detects duplicates across incremental uploaded batches using existingRows", () => {
    const existing = parseRawSaleRecord(
      {
        lineNumber: 10,
        data: "2025-11-05",
        vendedor: "Rafa",
        cliente: "Empresa Alpha",
        valor: "10000",
        tipo: "nova",
        status: "fechado",
        obs: "",
      },
      { batchId: "batch-1", referenceYear: 2025, sellerRegistry: registry }
    );

    const incoming = parseRawSaleRecord(
      {
        lineNumber: 2,
        data: "05/11/2025",
        vendedor: "Rafael M.",
        cliente: "Empresa Alpha",
        valor: "10k",
        tipo: "NOVA",
        status: "ok",
        obs: "",
      },
      { batchId: "batch-2", referenceYear: 2025, sellerRegistry: registry }
    );

    const [checked] = detectDuplicateSales([incoming], [existing]);
    expect(checked.duplicateOfRowId).toBe("batch-1:L10");
    expect(checked.issues[0].code).toBe("DUPLICATE_SUSPECT");
  });
});
