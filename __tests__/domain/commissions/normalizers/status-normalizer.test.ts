import { describe, expect, it } from "vitest";
import {
  extractCancellationMonth,
  parseSaleStatus,
} from "@/domain/commissions/services/normalizers/status-normalizer";

describe("status-normalizer", () => {
  it("normalizes fechado variants without touching obs", () => {
    for (const status of ["fechado", "FECHADO", "assinado", "ok"]) {
      expect(parseSaleStatus(status, "voltou em out", "2025-10-15")).toEqual({
        status: "fechado",
        cancellationMonth: null,
        issues: [],
      });
    }
  });

  it("extracts cancellation month from obs including rollover across year boundary", () => {
    expect(
      parseSaleStatus("Cancelado", "cancelou em setembro", "2025-07-01")
    ).toEqual({
      status: "cancelado",
      cancellationMonth: "2025-09",
      issues: [],
    });

    expect(
      parseSaleStatus("estornado", "estorno em agosto", "2025-07-14")
    ).toEqual({
      status: "cancelado",
      cancellationMonth: "2025-08",
      issues: [],
    });

    expect(
      parseSaleStatus("cancelado", "cliente desistiu (outubro)", "2025-08-18")
    ).toEqual({
      status: "cancelado",
      cancellationMonth: "2025-10",
      issues: [],
    });

    expect(
      extractCancellationMonth("cancelou em janeiro", "2025-11-10")
    ).toEqual({
      month: "2026-01",
      hasExplicitYear: false,
    });
  });

  it("does not falsely match month prefixes inside words like mais or setor", () => {
    expect(extractCancellationMonth("cliente pediu mais prazo", "2025-07-01")).toEqual({
      month: null,
      hasExplicitYear: false,
    });
  });

  it("flags cancelled sale without month as MISSING_CANCELLATION_MONTH", () => {
    const res = parseSaleStatus("cancelado", "", "2025-07-24");
    expect(res.status).toBe("cancelado");
    expect(res.cancellationMonth).toBeNull();
    expect(res.issues).toHaveLength(1);
    expect(res.issues[0].code).toBe("MISSING_CANCELLATION_MONTH");
    expect(res.issues[0].field).toBe("obs");
  });

  it("flags unknown or empty status as UNKNOWN_STATUS", () => {
    for (const bad of ["", "em análise"]) {
      const res = parseSaleStatus(bad, "", "2025-10-01");
      expect(res.status).toBeNull();
      expect(res.issues).toHaveLength(1);
      expect(res.issues[0].code).toBe("UNKNOWN_STATUS");
    }
  });
});
