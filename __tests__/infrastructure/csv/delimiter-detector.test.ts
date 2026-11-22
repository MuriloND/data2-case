import { describe, expect, it } from "vitest";
import {
  detectCsvDelimiter,
  stripUtf8Bom,
} from "@/infrastructure/csv/delimiter-detector";

describe("delimiter-detector", () => {
  it("strips UTF-8 BOM only when present at the start of the string", () => {
    expect(stripUtf8Bom("\uFEFFdata,vendedor")).toBe("data,vendedor");
    expect(stripUtf8Bom("data,vendedor")).toBe("data,vendedor");
  });

  it("detects comma delimiter for standard CSV headers", () => {
    expect(
      detectCsvDelimiter("data,vendedor,cliente,valor,tipo,status,obs\n")
    ).toBe(",");
  });

  it("detects semicolon delimiter used in PT-BR Excel exports", () => {
    expect(
      detectCsvDelimiter("data;vendedor;cliente;valor;tipo;status;obs\n")
    ).toBe(";");
  });

  it("ignores delimiters inside quoted fields and leading blank lines", () => {
    const csv = [
      "",
      '"col;1";"col;2,com,virgula";"col;3"',
      "a;b;c",
    ].join("\n");

    expect(detectCsvDelimiter(csv)).toBe(";");
  });
});
