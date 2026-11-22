import { describe, expect, it } from "vitest";
import { createDefaultSellerRegistry } from "@/domain/commissions/entities/seller";
import { applySaleResolution } from "@/domain/commissions/services/resolution-applier";
import { parseRawSaleRecord } from "@/domain/commissions/services/sale-record-parser";

describe("resolution-applier", () => {
  const registry = createDefaultSellerRegistry();
  const context = {
    batchId: "b1",
    referenceYear: 2025,
    sellerRegistry: registry,
  };

  it("confirms a pending record only after all its issues are validly resolved", () => {
    const broken = parseRawSaleRecord(
      {
        lineNumber: 2,
        data: "32/13/2025",
        vendedor: "Desconhecido",
        cliente: "Cliente X",
        valor: "a combinar",
        tipo: "upgrade",
        status: "em análise",
        obs: "",
      },
      context
    );

    const partial = applySaleResolution(broken, {
      rowId: broken.id,
      action: "resolve",
      dateISO: "2025-11-10",
      type: "nova",
    });
    expect(partial.kind).toBe("pending");
    expect(partial.record.issues.map((i) => i.code)).toEqual([
      "UNKNOWN_SELLER",
      "INVALID_VALUE",
      "UNKNOWN_STATUS",
    ]);

    const complete = applySaleResolution(broken, {
      rowId: broken.id,
      action: "resolve",
      dateISO: "2025-11-10",
      sellers: ["Rafael Moura"],
      amountCents: 1_500_000,
      type: "nova",
      status: "fechado",
    });
    expect(complete.kind).toBe("confirmed");
    if (complete.kind === "confirmed") {
      expect(complete.wasPending).toBe(true);
      expect(complete.record.issues).toEqual([]);
    }
  });

  it("requires cancellationMonth if user resolves UNKNOWN_STATUS to cancelado", () => {
    const unknownStatusRow = parseRawSaleRecord(
      {
        lineNumber: 3,
        data: "10/11/2025",
        vendedor: "Rafa",
        cliente: "Cliente Y",
        valor: "10000",
        tipo: "nova",
        status: "em análise",
        obs: "",
      },
      context
    );

    const missingMonth = applySaleResolution(unknownStatusRow, {
      rowId: unknownStatusRow.id,
      action: "resolve",
      status: "cancelado",
    });
    expect(missingMonth.kind).toBe("pending");
    expect(missingMonth.record.issues[0].code).toBe(
      "MISSING_CANCELLATION_MONTH"
    );

    const validCancel = applySaleResolution(unknownStatusRow, {
      rowId: unknownStatusRow.id,
      action: "resolve",
      status: "cancelado",
      cancellationMonth: "2025-12",
    });
    expect(validCancel.kind).toBe("confirmed");
  });

  it("discards duplicates cleanly when keepDuplicate is false or action is discard", () => {
    const dup = parseRawSaleRecord(
      {
        lineNumber: 161,
        data: "25/09/2025",
        vendedor: "Bruno",
        cliente: "Distribuidora Litoral",
        valor: "14.400,00",
        tipo: "renovação",
        status: "fechado",
        obs: "",
      },
      context
    );

    const discarded = applySaleResolution(dup, {
      rowId: dup.id,
      action: "discard",
    });
    expect(discarded.kind).toBe("discarded");
  });
});
