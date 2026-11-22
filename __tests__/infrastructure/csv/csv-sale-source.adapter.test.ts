import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { REQUIRED_SALE_COLUMNS } from "@/domain/commissions/ports/sale-source.port";
import { createCsvSaleSourceAdapter } from "@/infrastructure/csv/csv-sale-source.adapter";

const REAL_CSV_PATH = path.resolve(
  process.cwd(),
  "test_files",
  "YMwngYvqunGNvAf1zJNut.csv"
);
const hasRealCsv = fs.existsSync(REAL_CSV_PATH);

describe("CsvSaleSourceAdapter", () => {
  const adapter = createCsvSaleSourceAdapter();

  it("handles empty CSV text gracefully without crashing", () => {
    const empty = adapter.read("   \n  ");
    expect(empty.rows).toEqual([]);
    expect(empty.missingColumns).toEqual([...REQUIRED_SALE_COLUMNS]);
    expect(empty.totalLines).toBe(0);
  });

  it("reads BOM-prefixed semicolon CSV into domain RawSaleRecord batch", () => {
    const csv = [
      "\uFEFFdata;vendedor;cliente;valor;tipo;status;obs",
      "10/11/2025;Camila;Loja Teste;14.400,00;nova;fechado;ok",
    ].join("\r\n");

    const batch = adapter.read(csv);

    expect(batch.metadata).toEqual({ format: "csv", delimiter: ";" });
    expect(batch.missingColumns).toEqual([]);
    expect(batch.totalLines).toBe(2);
    expect(batch.rows).toEqual([
      {
        lineNumber: 2,
        data: "10/11/2025",
        vendedor: "Camila",
        cliente: "Loja Teste",
        valor: "14.400,00",
        tipo: "nova",
        status: "fechado",
        obs: "ok",
      },
    ]);
  });

  it.skipIf(!hasRealCsv)(
    "reads all 223 data rows (lines 2..224) of real CSV test_files/YMwngYvqunGNvAf1zJNut.csv",
    () => {
      const content = fs.readFileSync(REAL_CSV_PATH, "utf-8");
      const batch = adapter.read(content);

      expect(batch.metadata).toEqual({ format: "csv", delimiter: "," });
      expect(batch.missingColumns).toEqual([]);
      expect(batch.rows).toHaveLength(223);
      expect(batch.totalLines).toBe(224);

      const byLine = new Map(batch.rows.map((row) => [row.lineNumber, row]));

      expect(byLine.get(2)).toEqual({
        lineNumber: 2,
        data: "2025-07-01",
        vendedor: "rafael",
        cliente: "Restaurante Sabor da Serra",
        valor: "R$ 9.600",
        tipo: "nova",
        status: "Cancelado",
        obs: "cancelou em setembro",
      });

      expect(byLine.get(3)?.valor).toBe("24.000,00");

      expect(byLine.get(51)).toEqual({
        lineNumber: 51,
        data: "24/07/2025",
        vendedor: "Otávio",
        cliente: "Hotel Recanto das Águas",
        valor: "R$ 18.000",
        tipo: "nova",
        status: "cancelado",
        obs: "",
      });

      expect(byLine.get(116)?.vendedor).toBe("");
      expect(byLine.get(116)?.cliente).toBe("Cooperativa Agro Cerrado");
      expect(byLine.get(116)?.valor).toBe("30k");

      expect(byLine.get(128)?.vendedor).toBe("Fernanda");
      expect(byLine.get(128)?.obs).toBe("encaminhado pela Fê");

      expect(byLine.get(134)?.vendedor).toBe("camila/bruno");
      expect(byLine.get(134)?.obs).toBe("60/40?");

      const row160 = byLine.get(160);
      const row161 = byLine.get(161);
      expect(row160).toBeDefined();
      expect(row161).toBeDefined();
      expect({ ...row160, lineNumber: 0 }).toEqual({
        ...row161,
        lineNumber: 0,
      });

      expect(byLine.get(180)?.valor).toBe("12k?");
      expect(byLine.get(180)?.obs).toBe("confirmar valor");

      expect(byLine.get(196)?.tipo).toBe("");
      expect(byLine.get(196)?.obs).toBe("voltou em out");

      expect(byLine.get(224)).toEqual({
        lineNumber: 224,
        data: "2025-10-31",
        vendedor: "Rafa",
        cliente: "Cooperativa Agro Cerrado",
        valor: "14400",
        tipo: "renovacao",
        status: "FECHADO",
        obs: "",
      });
    }
  );
});
