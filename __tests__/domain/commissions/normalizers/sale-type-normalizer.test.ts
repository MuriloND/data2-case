import { describe, expect, it } from "vitest";
import { parseSaleType } from "@/domain/commissions/services/normalizers/sale-type-normalizer";

describe("sale-type-normalizer", () => {
  it("normalizes all valid nova and renovacao variants", () => {
    for (const nova of ["nova", "NOVA", "novo cliente", "Venda Nova"]) {
      expect(parseSaleType(nova)).toEqual({ ok: true, type: "nova" });
    }

    for (const renov of [
      "renov",
      "renovacao",
      "Renovação",
      "renovação anual",
    ]) {
      expect(parseSaleType(renov)).toEqual({ ok: true, type: "renovacao" });
    }
  });

  it("flags empty type as MISSING_TYPE and unknown type as UNKNOWN_TYPE", () => {
    const empty = parseSaleType("");
    expect(empty.ok).toBe(false);
    if (!empty.ok) {
      expect(empty.issue.code).toBe("MISSING_TYPE");
    }

    const unknown = parseSaleType("upgrade");
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) {
      expect(unknown.issue.code).toBe("UNKNOWN_TYPE");
      expect(unknown.issue.rawValue).toBe("upgrade");
    }
  });
});
