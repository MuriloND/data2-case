import type { ResolvedSaleData } from "./resolution-applier";

export interface SellerSaleSlice {
  sale: ResolvedSaleData;
  seller: string;
  assignedAmountCents: number;
  splitPercentage: number;
  sliceIndex: number;
}

/**
 * Splits integer cents proportionally across sellers using the largest-remainder
 * method so the sum of slices always matches `totalCents` exactly.
 */
export function allocateAmountCents(
  totalCents: number,
  weights: readonly number[]
): number[] {
  if (weights.length === 0) {
    return [];
  }

  const weightSum = weights.reduce((acc, w) => acc + w, 0);
  const rawShares = weights.map((weight) => (totalCents * weight) / weightSum);
  const floored = rawShares.map((share) => Math.floor(share));
  const remainder = totalCents - floored.reduce((acc, val) => acc + val, 0);

  if (remainder > 0) {
    const rankedByRemainder = rawShares
      .map((share, index) => ({
        index,
        fraction: share - floored[index],
      }))
      .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

    for (let i = 0; i < remainder; i += 1) {
      const targetIndex = rankedByRemainder[i % rankedByRemainder.length].index;
      floored[targetIndex] += 1;
    }
  }

  return floored;
}

export function expandSaleToSellerSlices(
  sale: ResolvedSaleData
): SellerSaleSlice[] {
  const sellerCount = sale.sellers.length;
  if (sellerCount === 0) {
    return [];
  }

  const hasCustomWeights =
    sale.splitWeights !== null && sale.splitWeights.length === sellerCount;
  const weights = hasCustomWeights
    ? (sale.splitWeights as readonly number[])
    : Array.from({ length: sellerCount }, () => 1);
  const weightSum = weights.reduce((acc, w) => acc + w, 0);
  const allocated = allocateAmountCents(sale.amountCents, weights);

  return sale.sellers.map((seller, index) => ({
    sale,
    seller,
    assignedAmountCents: allocated[index],
    splitPercentage: hasCustomWeights
      ? weights[index]
      : (weights[index] / weightSum) * 100,
    sliceIndex: index,
  }));
}
