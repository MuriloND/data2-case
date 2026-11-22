import { describe, expect, it } from "vitest";
import { MONTHLY_GOAL_CENTS } from "@/domain/commissions/constants";
import {
  calculateNovaCommission,
  calculateRenovacaoCommission,
} from "@/domain/commissions/services/progressive-tier-calculator";

describe("progressive-tier-calculator", () => {
  it("applies 5% below R$ 120k goal and advances accumulated nova volume", () => {
    const result = calculateNovaCommission(4_000_000, 0);

    expect(result).toEqual({
      baseAt5Cents: 4_000_000,
      commAt5Cents: 200_000,
      baseAt8Cents: 0,
      commAt8Cents: 0,
      commissionCents: 200_000,
      tier: "5%",
      nextAccumulatedNovaCents: 4_000_000,
    });
  });

  it("splits a single sale that crosses R$ 120k into 5% up to goal and 8% above goal", () => {
    const result = calculateNovaCommission(5_000_000, 10_000_000);

    expect(result).toEqual({
      baseAt5Cents: 2_000_000,
      commAt5Cents: 100_000,
      baseAt8Cents: 3_000_000,
      commAt8Cents: 240_000,
      commissionCents: 340_000,
      tier: "5% + 8%",
      nextAccumulatedNovaCents: 15_000_000,
    });
  });

  it("applies pure 8% once R$ 120k goal has already been reached", () => {
    const result = calculateNovaCommission(1_000_000, MONTHLY_GOAL_CENTS);

    expect(result).toEqual({
      baseAt5Cents: 0,
      commAt5Cents: 0,
      baseAt8Cents: 1_000_000,
      commAt8Cents: 80_000,
      commissionCents: 80_000,
      tier: "8%",
      nextAccumulatedNovaCents: 13_000_000,
    });
  });

  it("applies fixed 2% on renovacao regardless of goal", () => {
    expect(calculateRenovacaoCommission(1_440_000)).toEqual({
      commissionCents: 28_800,
      tier: "2%",
    });
  });
});
