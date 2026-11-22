import { describe, expect, it } from "vitest";
import {
  mapCsvHeaders,
  mapRowToRawSaleRecord,
  normalizeHeaderName,
} from "@/infrastructure/csv/header-mapper";

describe("header-mapper", () => {
  it("normalizes accents, whitespace, and casing in header names", () => {
    expect(normalizeHeaderName("  Vendedor  ")).toBe("vendedor");
    expect(normalizeHeaderName("Observação")).toBe("observacao");
    expect(normalizeHeaderName("STATUS")).toBe("status");
  });

  it("maps reordered headers without requiring optional obs column", () => {
    const mapping = mapCsvHeaders([
      "Cliente",
      "Valor",
      "Vendedor",
      "Data",
      "Status",
      "Tipo",
    ]);

    expect(mapping.missingColumns).toEqual([]);

    const record = mapRowToRawSaleRecord(
      {
        lineNumber: 5,
        fields: ["Acme Corp", " 12000 ", "Rafael", "2025-11-01", "fechado", "nova"],
      },
      mapping.columnIndex
    );

    expect(record).toEqual({
      lineNumber: 5,
      data: "2025-11-01",
      vendedor: "Rafael",
      cliente: "Acme Corp",
      valor: "12000",
      tipo: "nova",
      status: "fechado",
      obs: "",
    });
  });

  it("reports missing required columns accurately", () => {
    const mapping = mapCsvHeaders(["data", "cliente", "valor"]);
    expect(mapping.missingColumns).toEqual(["vendedor", "tipo", "status"]);
  });
});
