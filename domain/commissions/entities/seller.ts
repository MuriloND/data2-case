export interface SellerDefinition {
  id: string;
  canonicalName: string;
  aliases: string[];
  active: boolean;
  formerEmployee?: boolean;
}

export interface SellerRegistry {
  sellers: SellerDefinition[];
  customAliases: Record<string, string>;
}

export const DEFAULT_SELLERS: readonly SellerDefinition[] = [
  {
    id: "rafael-moura",
    canonicalName: "Rafael Moura",
    aliases: ["Rafael", "Rafa", "Rafael M.", "Rafael Moura"],
    active: true,
  },
  {
    id: "bruno-sa",
    canonicalName: "Bruno Sá",
    aliases: ["Bruno", "Bruno Sa", "Bruno Sá"],
    active: true,
  },
  {
    id: "leticia-prado",
    canonicalName: "Letícia Prado",
    aliases: ["Leticia", "Letícia", "Letícia Prado", "Lê"],
    active: true,
  },
  {
    id: "camila-teixeira",
    canonicalName: "Camila Teixeira",
    aliases: ["Camila", "Cami", "Camila T", "Camila Teixeira"],
    active: true,
  },
  {
    id: "otavio-lins",
    canonicalName: "Otávio Lins",
    aliases: ["Otavio", "Otávio", "Otávio Lins", "Tavinho"],
    active: true,
  },
  {
    id: "fernanda-ex-func",
    canonicalName: "Fernanda (Ex-func.)",
    aliases: ["Fernanda", "Fe", "Fê", "Fernanda (Ex-func.)"],
    active: false,
    formerEmployee: true,
  },
];

export function normalizeAliasKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifySellerId(canonicalName: string): string {
  const slug = normalizeAliasKey(canonicalName)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "seller";
}

function generateUniqueSellerId(
  canonicalName: string,
  existingSellers: readonly SellerDefinition[]
): string {
  const baseId = slugifySellerId(canonicalName);
  const existingIds = new Set(existingSellers.map((seller) => seller.id));
  let candidate = baseId;
  let suffix = 2;

  while (existingIds.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function mergeUniqueAliases(
  existingAliases: readonly string[],
  newAliases: readonly string[]
): string[] {
  const seenKeys = new Set(existingAliases.map(normalizeAliasKey));
  const merged = [...existingAliases];

  for (const rawAlias of newAliases) {
    const trimmed = rawAlias.trim();
    if (!trimmed) {
      continue;
    }
    const key = normalizeAliasKey(trimmed);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      merged.push(trimmed);
    }
  }

  return merged;
}

function findSellerIndexByName(
  sellers: readonly SellerDefinition[],
  canonicalName: string
): number {
  const targetKey = normalizeAliasKey(canonicalName);
  return sellers.findIndex(
    (seller) => normalizeAliasKey(seller.canonicalName) === targetKey
  );
}

export function createDefaultSellerRegistry(): SellerRegistry {
  return {
    sellers: DEFAULT_SELLERS.map((seller) => ({
      ...seller,
      aliases: [...seller.aliases],
    })),
    customAliases: {},
  };
}

export function addSellerToRegistry(
  registry: SellerRegistry,
  canonicalName: string,
  aliases: string[] = []
): SellerRegistry {
  const trimmedName = canonicalName.trim();
  if (!trimmedName) {
    return registry;
  }

  const candidateAliases = mergeUniqueAliases([], [trimmedName, ...aliases]);
  const existingIndex = findSellerIndexByName(registry.sellers, trimmedName);

  if (existingIndex >= 0) {
    const updatedSellers = registry.sellers.map((seller, index) =>
      index === existingIndex
        ? {
            ...seller,
            active: true,
            formerEmployee: false,
            aliases: mergeUniqueAliases(seller.aliases, candidateAliases),
          }
        : { ...seller, aliases: [...seller.aliases] }
    );

    return {
      sellers: updatedSellers,
      customAliases: { ...registry.customAliases },
    };
  }

  const newSeller: SellerDefinition = {
    id: generateUniqueSellerId(trimmedName, registry.sellers),
    canonicalName: trimmedName,
    aliases: candidateAliases,
    active: true,
  };

  return {
    sellers: [
      ...registry.sellers.map((seller) => ({
        ...seller,
        aliases: [...seller.aliases],
      })),
      newSeller,
    ],
    customAliases: { ...registry.customAliases },
  };
}

export function addAliasToRegistry(
  registry: SellerRegistry,
  rawAlias: string,
  canonicalName: string
): SellerRegistry {
  const aliasKey = normalizeAliasKey(rawAlias);
  const trimmedCanonical = canonicalName.trim();
  if (!aliasKey || !trimmedCanonical) {
    return registry;
  }

  const existingIndex = findSellerIndexByName(
    registry.sellers,
    trimmedCanonical
  );
  const resolvedCanonical =
    existingIndex >= 0
      ? registry.sellers[existingIndex].canonicalName
      : trimmedCanonical;

  const baseRegistry =
    existingIndex >= 0
      ? registry
      : addSellerToRegistry(registry, resolvedCanonical, [rawAlias]);

  return {
    sellers: baseRegistry.sellers.map((seller) => ({
      ...seller,
      aliases: [...seller.aliases],
    })),
    customAliases: {
      ...baseRegistry.customAliases,
      [aliasKey]: resolvedCanonical,
    },
  };
}

export function getActiveSellerNames(registry: SellerRegistry): string[] {
  return registry.sellers
    .filter((seller) => seller.active)
    .map((seller) => seller.canonicalName);
}
