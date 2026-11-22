import { describe, expect, it } from "vitest";
import {
  formatBrlCents,
  parseSaleAmount,
} from "@/domain/commissions/services/normalizers/currency-normalizer";

describe("currency-normalizer", () => {
  it("parses all valid monetary formats into exact integer cents", () => {
    expect(parseSaleAmount("14400")).toEqual({
      ok: true,
      amountCents: 1_440_000,
    });
    expect(parseSaleAmount("24.000,00")).toEqual({
      ok: true,
      amountCents: 2_400_000,
    });
    expect(parseSaleAmount("9600.00")).toEqual({
      ok: true,
      amountCents: 960_000,
    });
    expect(parseSaleAmount("R$ 9.600")).toEqual({
      ok: true,
      amountCents: 960_000,
    });
    expect(parseSaleAmount("36k")).toEqual({
      ok: true,
      amountCents: 3_600_000,
    });
    expect(parseSaleAmount("12,5k")).toEqual({
      ok: true,
      amountCents: 1_250_000,
    });
  });

  it("flags values with question marks or confirm-value notes as UNCONFIRMED_VALUE without guessing", () => {
    const res = parseSaleAmount("12k?", "confirmar valor");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.suggestedAmountCents).toBe(1_200_000);
      expect(res.issue.code).toBe("UNCONFIRMED_VALUE");
      expect(res.issue.field).toBe("valor");
      expect(res.issue.rawValue).toBe("12k?");
    }
  });

  it("rejects empty, zero, negative, and non-numeric strings as INVALID_VALUE", () => {
    for (const bad of ["", "0", "-500", "a combinar", "12abc"]) {
      const res = parseSaleAmount(bad);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.issue.code).toBe("INVALID_VALUE");
        expect(res.issue.field).toBe("valor");
        expect(res.issue.rawValue).toBe(bad);
      }
    }
  });

  it("formats integer cents deterministically in BRL", () => {
    expect(formatBrlCents(1_200_000)).toBe("R$ 12.000,00");
    expect(formatBrlCents(-57_600)).toBe("-R$ 576,00");
  });
});
