import {
  normalizeAliasKey,
  type SellerDefinition,
  type SellerRegistry,
} from "../entities/seller";

export type SellerResolutionResult =
  | { kind: "active" | "former"; seller: SellerDefinition }
  | { kind: "unknown"; rawToken: string };

function classifySeller(seller: SellerDefinition): "active" | "former" {
  return seller.formerEmployee && !seller.active ? "former" : "active";
}

function findSellerByCanonicalKey(
  sellers: readonly SellerDefinition[],
  canonicalKey: string
): SellerDefinition | undefined {
  return sellers.find(
    (seller) => normalizeAliasKey(seller.canonicalName) === canonicalKey
  );
}

function resolveFromCustomAliases(
  key: string,
  registry: SellerRegistry
): SellerDefinition | undefined {
  const customCanonical = registry.customAliases[key];
  if (!customCanonical) {
    return undefined;
  }
  return findSellerByCanonicalKey(
    registry.sellers,
    normalizeAliasKey(customCanonical)
  );
}

function resolveFromSellerCatalog(
  key: string,
  sellers: readonly SellerDefinition[]
): SellerDefinition | undefined {
  for (const seller of sellers) {
    if (normalizeAliasKey(seller.canonicalName) === key) {
      return seller;
    }
    const matchesAlias = seller.aliases.some(
      (alias) => normalizeAliasKey(alias) === key
    );
    if (matchesAlias) {
      return seller;
    }
  }
  return undefined;
}

export function resolveSellerAlias(
  rawToken: string,
  registry: SellerRegistry
): SellerResolutionResult {
  const key = normalizeAliasKey(rawToken);
  if (!key) {
    return { kind: "unknown", rawToken };
  }

  const customMatch = resolveFromCustomAliases(key, registry);
  if (customMatch) {
    return {
      kind: classifySeller(customMatch),
      seller: customMatch,
    };
  }

  const catalogMatch = resolveFromSellerCatalog(key, registry.sellers);
  if (catalogMatch) {
    return {
      kind: classifySeller(catalogMatch),
      seller: catalogMatch,
    };
  }

  return { kind: "unknown", rawToken: rawToken.trim() };
}
