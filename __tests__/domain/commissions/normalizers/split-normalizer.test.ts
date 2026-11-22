import { describe, expect, it } from "vitest";
import { parseSplitWeights } from "@/domain/commissions/services/normalizers/split-normalizer";

describe("split-normalizer", () => {
  it("allows standard equal-split wording without flagging an issue", () => {
    for (const obs of ["dividir", "dividido", "meio a meio", "voltou em out"]) {
      expect(parseSplitWeights(obs, 2)).toEqual({
        splitWeights: null,
        issue: null,
      });
    }
  });

  it("flags uncertain split ratios like 60/40? as AMBIGUOUS_SPLIT with suggestion", () => {
    const res = parseSplitWeights("60/40?", 2);
    expect(res.splitWeights).toBeNull();
    expect(res.suggestedSplitWeights).toEqual([60, 40]);
    expect(res.issue?.code).toBe("AMBIGUOUS_SPLIT");
    expect(res.issue?.field).toBe("obs");
  });

  it("accepts explicit unambiguous split weights summing to 100", () => {
    expect(parseSplitWeights("60/40 confirmado", 2)).toEqual({
      splitWeights: [60, 40],
      issue: null,
    });
  });

  it("does not confuse dates like 15/10 in obs with split ratios", () => {
    expect(parseSplitWeights("fechado em 15/10", 2)).toEqual({
      splitWeights: null,
      issue: null,
    });
  });
});
