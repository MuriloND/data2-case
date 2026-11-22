import { describe, expect, it } from "vitest";
import { createDefaultSellerRegistry } from "@/domain/commissions/entities/seller";
import { parseSellerList } from "@/domain/commissions/services/normalizers/seller-list-normalizer";

describe("seller-list-normalizer", () => {
  const registry = createDefaultSellerRegistry();

  it("resolves single and split sellers across +, /, &, and 'e' separators", () => {
    expect(parseSellerList("Rafa", registry)).toEqual({
      sellers: ["Rafael Moura"],
      formerEmployees: [],
      unknownTokens: [],
      issues: [],
    });

    expect(parseSellerList("Rafa + Bruno Sá", registry).sellers).toEqual([
      "Rafael Moura",
      "Bruno Sá",
    ]);

    expect(parseSellerList("Camila Teixeira/Otávio", registry).sellers).toEqual(
      ["Camila Teixeira", "Otávio Lins"]
    );

    expect(parseSellerList("bruno sá e Leticia", registry).sellers).toEqual([
      "Bruno Sá",
      "Letícia Prado",
    ]);

    expect(parseSellerList("Rafael + Camila + Bruno", registry).sellers).toEqual(
      ["Rafael Moura", "Camila Teixeira", "Bruno Sá"]
    );
  });

  it("flags empty seller as MISSING_SELLER", () => {
    const res = parseSellerList("   ", registry);
    expect(res.sellers).toEqual([]);
    expect(res.issues).toHaveLength(1);
    expect(res.issues[0].code).toBe("MISSING_SELLER");
  });

  it("flags former employee as FORMER_EMPLOYEE", () => {
    const res = parseSellerList("Fernanda", registry);
    expect(res.sellers).toEqual([]);
    expect(res.formerEmployees).toEqual(["Fernanda (Ex-func.)"]);
    expect(res.issues[0].code).toBe("FORMER_EMPLOYEE");
  });

  it("flags unrecognized seller tokens as UNKNOWN_SELLER", () => {
    const res = parseSellerList("Desconhecido", registry);
    expect(res.sellers).toEqual([]);
    expect(res.unknownTokens).toEqual(["Desconhecido"]);
    expect(res.issues[0].code).toBe("UNKNOWN_SELLER");
  });
});
