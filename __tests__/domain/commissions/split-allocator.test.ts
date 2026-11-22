import { describe, expect, it } from "vitest";
import { createDefaultSellerRegistry } from "@/domain/commissions/entities/seller";
import { parseRawSaleRecord } from "@/domain/commissions/services/sale-record-parser";
import { toResolvedSaleData } from "@/domain/commissions/services/resolution-applier";
import {
  allocateAmountCents,
  expandSaleToSellerSlices,
} from "@/domain/commissions/services/split-allocator";

describe("split-allocator", () => {
  const registry = createDefaultSellerRegistry();

  it("allocates 50/50, 1/3 exact, indivisible 1/3 cents, and 60/40 without losing a single cent", () => {
    expect(allocateAmountCents(4_800_000, [1, 1])).toEqual([
      2_400_000, 2_400_000,
    ]);
    expect(allocateAmountCents(4_800_000, [1, 1, 1])).toEqual([
      1_600_000, 1_600_000, 1_600_000,
    ]);
    expect(allocateAmountCents(1_000_000, [1, 1, 1])).toEqual([
      333_334, 333_333, 333_333,
    ]);
    expect(allocateAmountCents(3_600_000, [60, 40])).toEqual([
      2_160_000, 1_440_000,
    ]);
  });

  it("expands multi-seller sales into SellerSaleSlice preserving split percentages", () => {
    const parsed = parseRawSaleRecord(
      {
        lineNumber: 98,
        data: "20/08/2025",
        vendedor: "Rafael + Camila + Bruno",
        cliente: "Rede Supermercados Cesta Cheia",
        valor: "48.000,00",
        tipo: "nova",
        status: "fechado",
        obs: "dividir",
      },
      { batchId: "b1", referenceYear: 2025, sellerRegistry: registry }
    );
    const resolved = toResolvedSaleData(parsed);
    expect(resolved).not.toBeNull();

    const slices = expandSaleToSellerSlices(resolved!);
    expect(slices).toHaveLength(3);
    expect(slices.map((s) => s.seller)).toEqual([
      "Rafael Moura",
      "Camila Teixeira",
      "Bruno Sá",
    ]);
    expect(slices.map((s) => s.assignedAmountCents)).toEqual([
      1_600_000, 1_600_000, 1_600_000,
    ]);
    expect(slices[0].splitPercentage).toBeCloseTo(33.3333, 3);
  });
});
