import { describe, expect, it } from "vitest";
import {
  calculateRawGoalPercent,
  formatDateBr,
  formatMonthLong,
  formatMonthShort,
  formatSplitPercentage,
} from "@/presentation/commissions/utils/formatters";

describe("presentation formatters", () => {
  it("formats short and long PT-BR month labels", () => {
    expect(formatMonthShort("2025-07")).toBe("Jul/2025");
    expect(formatMonthShort("2025-11")).toBe("Nov/2025");
    expect(formatMonthLong("2025-08")).toBe("Agosto/2025");
    expect(formatMonthLong("2025-12")).toBe("Dezembro/2025");
  });

  it("formats ISO dates to DD/MM/YYYY", () => {
    expect(formatDateBr("2025-07-01")).toBe("01/07/2025");
    expect(formatDateBr("2025-10-31")).toBe("31/10/2025");
  });

  it("formats split percentages cleanly for whole and fractional splits", () => {
    expect(formatSplitPercentage(50)).toBe("50%");
    expect(formatSplitPercentage(60)).toBe("60%");
    expect(formatSplitPercentage(33.3333)).toBe("33,3%");
  });

  it("calculates uncapped goal progress percentages accurately", () => {
    expect(calculateRawGoalPercent(6_000_000, 12_000_000)).toBe(50);
    expect(calculateRawGoalPercent(12_000_000, 12_000_000)).toBe(100);
    expect(calculateRawGoalPercent(17_040_000, 12_000_000)).toBe(142);
    expect(calculateRawGoalPercent(1_000, 0)).toBe(0);
  });
});
