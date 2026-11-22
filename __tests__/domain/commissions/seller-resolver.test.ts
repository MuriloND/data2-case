import { describe, expect, it } from "vitest";
import {
  addAliasToRegistry,
  addSellerToRegistry,
  createDefaultSellerRegistry,
} from "@/domain/commissions/entities/seller";
import { resolveSellerAlias } from "@/domain/commissions/services/seller-resolver";

describe("seller-resolver domain service", () => {
  it("resolves all canonical sellers and aliases from the briefing", () => {
    const registry = createDefaultSellerRegistry();

    const cases: Array<[string, string]> = [
      ["Rafael", "Rafael Moura"],
      ["rafael", "Rafael Moura"],
      ["Rafa", "Rafael Moura"],
      ["Rafael M.", "Rafael Moura"],
      ["Rafael Moura", "Rafael Moura"],
      ["Bruno", "Bruno Sá"],
      ["BRUNO", "Bruno Sá"],
      ["Bruno Sa", "Bruno Sá"],
      ["Bruno Sá", "Bruno Sá"],
      ["bruno sá", "Bruno Sá"],
      ["Leticia", "Letícia Prado"],
      ["Letícia", "Letícia Prado"],
      ["leticia prado", "Letícia Prado"],
      ["Letícia Prado", "Letícia Prado"],
      ["Lê", "Letícia Prado"],
      ["Camila", "Camila Teixeira"],
      ["camila", "Camila Teixeira"],
      ["Cami", "Camila Teixeira"],
      ["Camila T", "Camila Teixeira"],
      ["Camila Teixeira", "Camila Teixeira"],
      ["Otavio", "Otávio Lins"],
      ["Otávio", "Otávio Lins"],
      ["otávio", "Otávio Lins"],
      ["Otávio Lins", "Otávio Lins"],
      ["Tavinho", "Otávio Lins"],
    ];

    for (const [alias, expectedCanonical] of cases) {
      const resolved = resolveSellerAlias(alias, registry);
      expect(resolved.kind).toBe("active");
      if (resolved.kind === "active") {
        expect(resolved.seller.canonicalName).toBe(expectedCanonical);
      }
    }
  });

  it("classifies former employee aliases separately from active sellers", () => {
    const registry = createDefaultSellerRegistry();
    const resolved = resolveSellerAlias("Fernanda", registry);

    expect(resolved.kind).toBe("former");
    if (resolved.kind === "former") {
      expect(resolved.seller.canonicalName).toBe("Fernanda (Ex-func.)");
    }
  });

  it("returns unknown result for unrecognized tokens and empty inputs", () => {
    const registry = createDefaultSellerRegistry();

    expect(resolveSellerAlias("Desconhecido", registry)).toEqual({
      kind: "unknown",
      rawToken: "Desconhecido",
    });
    expect(resolveSellerAlias("   ", registry)).toEqual({
      kind: "unknown",
      rawToken: "   ",
    });
  });

  it("resolves dynamically added sellers and custom aliases", () => {
    const withNewSeller = addSellerToRegistry(
      createDefaultSellerRegistry(),
      "Marcos Pereira",
      ["Marcão"]
    );
    const withCustomAlias = addAliasToRegistry(
      withNewSeller,
      "Fê Externa",
      "Camila Teixeira"
    );

    const newSellerMatch = resolveSellerAlias("marcao", withCustomAlias);
    expect(newSellerMatch.kind).toBe("active");
    if (newSellerMatch.kind === "active") {
      expect(newSellerMatch.seller.canonicalName).toBe("Marcos Pereira");
    }

    const customAliasMatch = resolveSellerAlias("fe externa", withCustomAlias);
    expect(customAliasMatch.kind).toBe("active");
    if (customAliasMatch.kind === "active") {
      expect(customAliasMatch.seller.canonicalName).toBe("Camila Teixeira");
    }
  });
});
