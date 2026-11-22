import { describe, expect, it } from "vitest";
import { calculateCommissionLedger } from "@/domain/commissions/services/commission-ledger-engine";
import { toResolvedSaleData } from "@/domain/commissions/services/resolution-applier";
import type {
  IsoDate,
  ParsedSaleRecord,
  SaleStatus,
  SaleType,
} from "@/domain/commissions/entities/sale";

function makeSale(params: {
  lineNumber: number;
  dateISO: IsoDate;
  sellers: string[];
  client?: string;
  amountCents: number;
  type: SaleType;
  status?: SaleStatus;
  cancellationMonth?: string | null;
  splitWeights?: number[] | null;
}) {
  const status = params.status ?? "fechado";
  const record: ParsedSaleRecord = {
    id: `test:L${params.lineNumber}`,
    batchId: "test",
    lineNumber: params.lineNumber,
    raw: {
      lineNumber: params.lineNumber,
      data: params.dateISO,
      vendedor: params.sellers.join(" / "),
      cliente: params.client ?? `Cliente ${params.lineNumber}`,
      valor: String(params.amountCents / 100),
      tipo: params.type,
      status,
      obs: "",
    },
    dateISO: params.dateISO,
    saleMonth: params.dateISO.slice(0, 7),
    sellers: params.sellers,
    formerEmployees: [],
    unknownSellerTokens: [],
    client: params.client ?? `Cliente ${params.lineNumber}`,
    amountCents: params.amountCents,
    type: params.type,
    status,
    cancellationMonth: params.cancellationMonth ?? null,
    splitWeights: params.splitWeights ?? null,
    issues: [],
  };

  const resolved = toResolvedSaleData(record);
  if (!resolved) {
    throw new Error("Expected resolved sale data");
  }
  return resolved;
}

describe("commission-ledger-engine (Mandatory Tests #1 to #7)", () => {
  it("Mandatory Test #1: calculates 5% on a new sale below the R$ 120k monthly goal", () => {
    const { entries } = calculateCommissionLedger([
      makeSale({
        lineNumber: 2,
        dateISO: "2025-11-05",
        sellers: ["Rafael Moura"],
        amountCents: 3_000_000,
        type: "nova",
      }),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0].tier).toBe("5%");
    expect(entries[0].commissionCents).toBe(150_000);
    expect(entries[0].goalContributionCents).toBe(3_000_000);
  });

  it("Mandatory Test #2: splits a single new sale crossing exactly R$ 120k into 5% and 8% slices", () => {
    const { entries } = calculateCommissionLedger([
      makeSale({
        lineNumber: 2,
        dateISO: "2025-11-01",
        sellers: ["Letícia Prado"],
        amountCents: 10_000_000,
        type: "nova",
      }),
      makeSale({
        lineNumber: 3,
        dateISO: "2025-11-10",
        sellers: ["Letícia Prado"],
        amountCents: 5_000_000,
        type: "nova",
      }),
    ]);

    expect(entries).toHaveLength(2);
    expect(entries[0].commissionCents).toBe(500_000);

    expect(entries[1].tier).toBe("5% + 8%");
    expect(entries[1].baseAt5Cents).toBe(2_000_000);
    expect(entries[1].commAt5Cents).toBe(100_000);
    expect(entries[1].baseAt8Cents).toBe(3_000_000);
    expect(entries[1].commAt8Cents).toBe(240_000);
    expect(entries[1].commissionCents).toBe(340_000);
  });

  it("Mandatory Test #3: calculates fixed 2% on renovacao without counting toward the R$ 120k goal", () => {
    const { entries } = calculateCommissionLedger([
      makeSale({
        lineNumber: 2,
        dateISO: "2025-11-01",
        sellers: ["Bruno Sá"],
        amountCents: 10_000_000,
        type: "renovacao",
      }),
      makeSale({
        lineNumber: 3,
        dateISO: "2025-11-02",
        sellers: ["Bruno Sá"],
        amountCents: 4_000_000,
        type: "nova",
      }),
    ]);

    expect(entries[0].tier).toBe("2%");
    expect(entries[0].countsTowardGoal).toBe(false);
    expect(entries[0].goalContributionCents).toBe(0);
    expect(entries[0].commissionCents).toBe(200_000);

    expect(entries[1].tier).toBe("5%");
    expect(entries[1].commissionCents).toBe(200_000);
  });

  it("Mandatory Test #4: handles 50/50 (2 sellers) and 1/3 (3 sellers) splits affecting goal and commission", () => {
    const { entries } = calculateCommissionLedger([
      makeSale({
        lineNumber: 2,
        dateISO: "2025-11-01",
        sellers: ["Rafael Moura", "Bruno Sá"],
        amountCents: 4_800_000,
        type: "nova",
      }),
      makeSale({
        lineNumber: 3,
        dateISO: "2025-11-05",
        sellers: ["Rafael Moura", "Camila Teixeira", "Bruno Sá"],
        amountCents: 4_800_000,
        type: "nova",
      }),
    ]);

    const firstTwo = entries.filter((e) => e.lineNumber === 2);
    expect(firstTwo.map((e) => [e.seller, e.assignedAmountCents, e.commissionCents])).toEqual([
      ["Rafael Moura", 2_400_000, 120_000],
      ["Bruno Sá", 2_400_000, 120_000],
    ]);
    expect(firstTwo.every((e) => e.goalContributionCents === 2_400_000)).toBe(true);

    const nextThree = entries.filter((e) => e.lineNumber === 3);
    expect(nextThree.map((e) => [e.seller, e.assignedAmountCents, e.commissionCents])).toEqual([
      ["Rafael Moura", 1_600_000, 80_000],
      ["Camila Teixeira", 1_600_000, 80_000],
      ["Bruno Sá", 1_600_000, 80_000],
    ]);
    expect(nextThree.every((e) => e.goalContributionCents === 1_600_000)).toBe(true);
  });

  it("Mandatory Test #5: applies custom split weights (60/40) to goal contribution and commission", () => {
    const { entries } = calculateCommissionLedger([
      makeSale({
        lineNumber: 134,
        dateISO: "2025-09-11",
        sellers: ["Camila Teixeira", "Bruno Sá"],
        amountCents: 3_600_000,
        type: "nova",
        splitWeights: [60, 40],
      }),
    ]);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      seller: "Camila Teixeira",
      splitPercentage: 60,
      assignedAmountCents: 2_160_000,
      goalContributionCents: 2_160_000,
      commissionCents: 108_000,
    });
    expect(entries[1]).toMatchObject({
      seller: "Bruno Sá",
      splitPercentage: 40,
      assignedAmountCents: 1_440_000,
      goalContributionCents: 1_440_000,
      commissionCents: 72_000,
    });
  });

  it("Mandatory Test #6: zeroes commission and goal contribution when cancelled in the same month", () => {
    const { entries } = calculateCommissionLedger([
      makeSale({
        lineNumber: 24,
        dateISO: "2025-07-11",
        sellers: ["Otávio Lins"],
        amountCents: 10_000_000,
        type: "nova",
        status: "cancelado",
        cancellationMonth: "2025-07",
      }),
      makeSale({
        lineNumber: 25,
        dateISO: "2025-07-20",
        sellers: ["Otávio Lins"],
        amountCents: 4_000_000,
        type: "nova",
      }),
    ]);

    const cancelled = entries.find((e) => e.lineNumber === 24);
    const active = entries.find((e) => e.lineNumber === 25);

    expect(cancelled?.kind).toBe("same_month_cancel");
    expect(cancelled?.tier).toBe("anulada");
    expect(cancelled?.commissionCents).toBe(0);
    expect(cancelled?.goalContributionCents).toBe(0);

    expect(active?.tier).toBe("5%");
    expect(active?.commissionCents).toBe(200_000);
  });

  it("Mandatory Test #7: pays on origin month and creates exact chargeback on later cancellation month (including 8% tier)", () => {
    const { entries } = calculateCommissionLedger([
      makeSale({
        lineNumber: 1,
        dateISO: "2025-07-05",
        sellers: ["Letícia Prado"],
        amountCents: 12_000_000,
        type: "nova",
      }),
      makeSale({
        lineNumber: 28,
        dateISO: "2025-07-14",
        sellers: ["Letícia Prado"],
        client: "Indústria Metal Norte",
        amountCents: 720_000,
        type: "nova",
        status: "cancelado",
        cancellationMonth: "2025-08",
      }),
    ]);

    const origin = entries.find(
      (e) => e.lineNumber === 28 && e.kind === "sale"
    );
    const chargeback = entries.find(
      (e) => e.lineNumber === 28 && e.kind === "estorno"
    );

    expect(origin?.effectiveMonth).toBe("2025-07");
    expect(origin?.tier).toBe("8%");
    expect(origin?.commissionCents).toBe(57_600);

    expect(chargeback?.effectiveMonth).toBe("2025-08");
    expect(chargeback?.tier).toBe("estorno");
    expect(chargeback?.commissionCents).toBe(-57_600);
    expect(chargeback?.originRef).toEqual({
      rowId: "test:L28",
      lineNumber: 28,
      dateISO: "2025-07-14",
      saleMonth: "2025-07",
      client: "Indústria Metal Norte",
      appliedTier: "8%",
      originalCommissionCents: 57_600,
    });
  });
});
