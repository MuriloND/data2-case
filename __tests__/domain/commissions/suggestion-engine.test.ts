import { describe, expect, it } from "vitest";
import { createDefaultSellerRegistry } from "@/domain/commissions/entities/seller";
import { detectDuplicateSales } from "@/domain/commissions/services/duplicate-detector";
import { parseRawSaleRecord } from "@/domain/commissions/services/sale-record-parser";
import { enrichWithSuggestions } from "@/domain/commissions/services/suggestion-engine";

describe("suggestion-engine", () => {
  const registry = createDefaultSellerRegistry();
  const context = {
    batchId: "b1",
    referenceYear: 2025,
    sellerRegistry: registry,
  };

  it("suggests 'nova' without mutating row.type when client returned after prior cancellation", () => {
    const priorCancelled = parseRawSaleRecord(
      {
        lineNumber: 74,
        data: "06/08/2025",
        vendedor: "Letícia Prado",
        cliente: "Construtora Pedra Lisa",
        valor: "24.000,00",
        tipo: "nova",
        status: "cancelado",
        obs: "cancelou em agosto",
      },
      context
    );
    const otherActive = parseRawSaleRecord(
      {
        lineNumber: 115,
        data: "02/09/2025",
        vendedor: "Bruno Sá",
        cliente: "Construtora Pedra Lisa",
        valor: "9.600,00",
        tipo: "nova",
        status: "fechado",
        obs: "",
      },
      context
    );
    const returningMissingType = parseRawSaleRecord(
      {
        lineNumber: 196,
        data: "15/10/2025",
        vendedor: "Leticia",
        cliente: "Construtora Pedra Lisa",
        valor: "24000",
        tipo: "",
        status: "fechado",
        obs: "voltou em out",
      },
      context
    );

    const enriched = enrichWithSuggestions([
      priorCancelled,
      otherActive,
      returningMissingType,
    ]);
    const target = enriched[2];

    expect(target.type).toBeNull();
    expect(target.issues[0].code).toBe("MISSING_TYPE");
    expect(target.issues[0].suggestion?.type).toBe("nova");
    expect(target.issues[0].suggestion?.reason).toContain("linha 74");
  });

  it("attaches non-binding suggestions for missing cancellation month, direct sale, unconfirmed value, split, and duplicate", () => {
    const rows = detectDuplicateSales([
      parseRawSaleRecord(
        {
          lineNumber: 51,
          data: "24/07/2025",
          vendedor: "Otávio",
          cliente: "Hotel Recanto das Águas",
          valor: "R$ 18.000",
          tipo: "nova",
          status: "cancelado",
          obs: "",
        },
        context
      ),
      parseRawSaleRecord(
        {
          lineNumber: 116,
          data: "02/09",
          vendedor: "",
          cliente: "Cooperativa Agro Cerrado",
          valor: "30k",
          tipo: "nova",
          status: "fechado",
          obs: "",
        },
        context
      ),
      parseRawSaleRecord(
        {
          lineNumber: 134,
          data: "11/09/2025",
          vendedor: "camila/bruno",
          cliente: "Indústria Metal Norte",
          valor: "36000",
          tipo: "nova",
          status: "fechado",
          obs: "60/40?",
        },
        context
      ),
      parseRawSaleRecord(
        {
          lineNumber: 180,
          data: "08/10/2025",
          vendedor: "Rafa",
          cliente: "Colégio Saber Mais",
          valor: "12k?",
          tipo: "nova",
          status: "fechado",
          obs: "confirmar valor",
        },
        context
      ),
    ]);

    const enriched = enrichWithSuggestions(rows);

    expect(enriched[0].cancellationMonth).toBeNull();
    expect(enriched[0].issues[0].suggestion?.cancellationMonth).toBe("2025-07");

    expect(enriched[1].sellers).toEqual([]);
    expect(enriched[1].issues[0].suggestion?.isDirectSale).toBe(true);

    expect(enriched[2].splitWeights).toBeNull();
    expect(enriched[2].issues[0].suggestion?.splitWeights).toEqual([60, 40]);

    expect(enriched[3].amountCents).toBeNull();
    expect(enriched[3].issues[0].suggestion?.amountCents).toBe(1_200_000);
    expect(enriched[3].issues[0].suggestion?.label).toBe(
      "Confirmar R$ 12.000,00"
    );
  });
});
