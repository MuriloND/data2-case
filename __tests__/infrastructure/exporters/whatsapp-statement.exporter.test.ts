import { describe, expect, it } from "vitest";
import { createExportStatementUseCase } from "@/application/commissions/export-statement.use-case";
import type { SellerMonthSummary } from "@/domain/commissions/entities/ledger";
import { createWhatsAppStatementExporter } from "@/infrastructure/exporters/whatsapp-statement.exporter";

describe("WhatsAppStatementExporterAdapter", () => {
  const exporter = createWhatsAppStatementExporter();
  const useCase = createExportStatementUseCase(exporter);

  it("formats single-month summary with goal progress, 5%+8% breakdown, split tag, chargeback, and pending notice", () => {
    const summary: SellerMonthSummary = {
      seller: "Letícia Prado",
      month: "2025-08",
      goalCents: 12_000_000,
      novaGoalAccumulatedCents: 15_000_000,
      goalProgressPercent: 100,
      goalReached: true,
      remainingToGoalCents: 0,
      novaCommissionCents: 340_000,
      renovacaoCommissionCents: 0,
      estornoCommissionCents: -57_600,
      netCommissionCents: 282_400,
      salesCount: 2,
      estornosCount: 1,
      sameMonthCancelCount: 0,
      entries: [
        {
          id: "e1",
          rowId: "r1",
          batchId: "b1",
          lineNumber: 75,
          dateISO: "2025-08-07",
          effectiveMonth: "2025-08",
          saleMonth: "2025-08",
          seller: "Letícia Prado",
          coSellers: ["Letícia Prado", "Bruno Sá"],
          client: "Construtora Pedra Lisa",
          saleType: "nova",
          kind: "sale",
          tier: "5% + 8%",
          originalAmountCents: 10_000_000,
          assignedAmountCents: 5_000_000,
          splitPercentage: 50,
          countsTowardGoal: true,
          goalContributionCents: 5_000_000,
          baseAt5Cents: 2_000_000,
          commAt5Cents: 100_000,
          baseAt8Cents: 3_000_000,
          commAt8Cents: 240_000,
          commissionCents: 340_000,
        },
        {
          id: "e2",
          rowId: "r2",
          batchId: "b1",
          lineNumber: 28,
          dateISO: "2025-07-14",
          effectiveMonth: "2025-08",
          saleMonth: "2025-07",
          seller: "Letícia Prado",
          coSellers: ["Letícia Prado"],
          client: "Indústria Metal Norte",
          saleType: "nova",
          kind: "estorno",
          tier: "estorno",
          originalAmountCents: 720_000,
          assignedAmountCents: 720_000,
          splitPercentage: 100,
          countsTowardGoal: false,
          goalContributionCents: 0,
          baseAt5Cents: 0,
          commAt5Cents: 0,
          baseAt8Cents: 0,
          commAt8Cents: 0,
          commissionCents: -57_600,
          originRef: {
            rowId: "r2",
            lineNumber: 28,
            dateISO: "2025-07-14",
            saleMonth: "2025-07",
            client: "Indústria Metal Norte",
            appliedTier: "8%",
            originalCommissionCents: 57_600,
          },
        },
      ],
    };

    const result = useCase.execute({
      summary,
      entries: summary.entries,
      pendingCountForSeller: 2,
    });

    expect(result.mimeType).toBe("text/plain;charset=utf-8");
    expect(result.content).toContain("Letícia Prado");
    expect(result.content).toContain("Agosto/2025");
    expect(result.content).toContain("META BATIDA");
    expect(result.content).toContain("[Rateio 50%]");
    expect(result.content).toContain("5% s/ R$ 20.000,00");
    expect(result.content).toContain("8% s/ R$ 30.000,00");
    expect(result.content).toContain("-R$ 576,00");
    expect(result.content).toContain("linha 28, faixa 8%");
    expect(result.content).toContain("R$ 2.824,00");
    expect(result.content).toContain("2 item(ns) deste vendedor na Fila de Pendências");
  });

  it("formats consolidated statement across multiple months when summary is omitted", () => {
    const result = useCase.execute({
      filterLabel: "Rafael Moura — Jul–Out/2025",
      entries: [],
    });

    expect(result.content).toContain("Rafael Moura — Jul–Out/2025");
    expect(result.content).toContain("Total líquido a receber: R$ 0,00");
  });
});
