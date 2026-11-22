import { describe, expect, it } from "vitest";
import {
  addAliasToRegistry,
  addSellerToRegistry,
  createDefaultSellerRegistry,
  getActiveSellerNames,
  normalizeAliasKey,
} from "@/domain/commissions/entities/seller";

describe("seller domain entity", () => {
  it("normalizes alias keys by stripping accents, dots, extra spaces, and case", () => {
    expect(normalizeAliasKey("  Rafael M.  ")).toBe("rafael m");
    expect(normalizeAliasKey("Lê")).toBe("le");
    expect(normalizeAliasKey("Bruno   Sá")).toBe("bruno sa");
    expect(normalizeAliasKey("OTÁVIO")).toBe("otavio");
  });

  it("creates default registry with 5 active sellers and 1 inactive former employee", () => {
    const registry = createDefaultSellerRegistry();
    const activeNames = getActiveSellerNames(registry);

    expect(activeNames).toEqual([
      "Rafael Moura",
      "Bruno Sá",
      "Letícia Prado",
      "Camila Teixeira",
      "Otávio Lins",
    ]);
    expect(registry.sellers).toHaveLength(6);

    const fernanda = registry.sellers.find((s) =>
      s.canonicalName.includes("Fernanda")
    );
    expect(fernanda?.active).toBe(false);
    expect(fernanda?.formerEmployee).toBe(true);
  });

  it("adds a new seller immutably with deduplicated aliases and unique slug", () => {
    const base = createDefaultSellerRegistry();
    const updated = addSellerToRegistry(base, "Marcos Pereira", [
      "Marcão",
      "marcao",
      "  ",
    ]);

    expect(getActiveSellerNames(base)).toHaveLength(5);
    expect(getActiveSellerNames(updated)).toHaveLength(6);

    const marcos = updated.sellers.find(
      (s) => s.canonicalName === "Marcos Pereira"
    );
    expect(marcos).toBeDefined();
    expect(marcos?.id).toBe("marcos-pereira");
    expect(marcos?.aliases).toEqual(["Marcos Pereira", "Marcão"]);
  });

  it("reactivates an existing seller when re-added and merges new aliases", () => {
    const base = createDefaultSellerRegistry();
    const updated = addSellerToRegistry(base, "Fernanda (Ex-func.)", [
      "Fêzinha",
    ]);

    const fernanda = updated.sellers.find((s) =>
      s.canonicalName.includes("Fernanda")
    );
    expect(fernanda?.active).toBe(true);
    expect(fernanda?.formerEmployee).toBe(false);
    expect(fernanda?.aliases).toContain("Fêzinha");
  });

  it("registers custom aliases immutably mapped to canonical seller names", () => {
    const base = createDefaultSellerRegistry();
    const updated = addAliasToRegistry(base, "Rafa M", "rafael moura");

    expect(base.customAliases).toEqual({});
    expect(updated.customAliases).toEqual({
      "rafa m": "Rafael Moura",
    });
  });
});
