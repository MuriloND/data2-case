import { describe, expect, it } from "vitest";
import { tokenizeCsv } from "@/infrastructure/csv/rfc4180-tokenizer";

describe("rfc4180-tokenizer", () => {
  it("parses quoted commas, escaped quotes, CRLF, and skips blank lines while keeping line numbers", () => {
    const text = [
      "data,vendedor,cliente,valor,tipo,status,obs",
      '01/07/2025,Bruno Sá,"Empresa ""Alfa"", Ltda","24.000,00",nova,fechado,"nota, com vírgula"',
      "",
      '02/07/2025,Rafa,Cliente Beta,"9.600,00",renov,ok,',
    ].join("\r\n");

    const rows = tokenizeCsv(text, ",");

    expect(rows).toHaveLength(3);
    expect(rows[0].lineNumber).toBe(1);
    expect(rows[1]).toEqual({
      lineNumber: 2,
      fields: [
        "01/07/2025",
        "Bruno Sá",
        'Empresa "Alfa", Ltda',
        "24.000,00",
        "nova",
        "fechado",
        "nota, com vírgula",
      ],
    });
    expect(rows[2]).toEqual({
      lineNumber: 4,
      fields: [
        "02/07/2025",
        "Rafa",
        "Cliente Beta",
        "9.600,00",
        "renov",
        "ok",
        "",
      ],
    });
  });

  it("preserves newlines inside quoted fields and advances physical line numbers accurately", () => {
    const text = [
      "data,vendedor,cliente,valor,tipo,status,obs",
      '01/07/2025,Rafa,Cliente A,1000,nova,fechado,"linha 1\nlinha 2"',
      "02/07/2025,Cami,Cliente B,2000,nova,fechado,ok",
    ].join("\n");

    const rows = tokenizeCsv(text, ",");

    expect(rows).toHaveLength(3);
    expect(rows[1].lineNumber).toBe(2);
    expect(rows[1].fields[6]).toBe("linha 1\nlinha 2");
    expect(rows[2].lineNumber).toBe(4);
  });
});
