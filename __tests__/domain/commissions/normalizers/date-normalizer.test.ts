import { describe, expect, it } from "vitest";
import {
  inferReferenceYear,
  isValidCalendarDate,
  parseSaleDate,
} from "@/domain/commissions/services/normalizers/date-normalizer";

describe("date-normalizer", () => {
  it("validates real calendar dates including leap years", () => {
    expect(isValidCalendarDate(2024, 2, 29)).toBe(true);
    expect(isValidCalendarDate(2025, 2, 29)).toBe(false);
    expect(isValidCalendarDate(2025, 2, 31)).toBe(false);
    expect(isValidCalendarDate(2025, 13, 32)).toBe(false);
  });

  it("infers the majority explicit year across rows and falls back safely", () => {
    expect(
      inferReferenceYear(["01/07", "2025-07-01", "02/07/2025", "10/11/2026"])
    ).toBe(2025);
    expect(inferReferenceYear(["01/07", "02/07"], 2025)).toBe(2025);
  });

  it("normalizes ISO, DD/MM/YYYY, and short DD/MM formats", () => {
    expect(parseSaleDate("2025-07-01", 2025)).toEqual({
      ok: true,
      dateISO: "2025-07-01",
      saleMonth: "2025-07",
    });

    expect(parseSaleDate("24/07/2025", 2025)).toEqual({
      ok: true,
      dateISO: "2025-07-24",
      saleMonth: "2025-07",
    });

    expect(parseSaleDate("02/09", 2025)).toEqual({
      ok: true,
      dateISO: "2025-09-02",
      saleMonth: "2025-09",
    });
  });

  it("isolates invalid, impossible, or empty dates via universal fallback", () => {
    for (const badDate of ["32/13/2025", "31/02/2025", "", "ontem"]) {
      const result = parseSaleDate(badDate, 2025);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issue.code).toBe("INVALID_DATE");
        expect(result.issue.field).toBe("data");
        expect(result.issue.rawValue).toBe(badDate);
      }
    }
  });
});
