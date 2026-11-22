import { describe, expect, it } from "vitest";
import { createExportStatementUseCase } from "@/application/commissions/export-statement.use-case";
import type { LedgerEntry } from "@/domain/commissions/entities/ledger";
import { createCsvStatementExporter } from "@/infrastructure/exporters/csv-statement.exporter";

describe("CsvStatementExporterAdapter", () => {
  const exporter = createCsvStatementExporter();
  const useCase = createExportStatementUseCase(exporter);

  it("generates UTF-8 BOM RFC 4180 CSV with escaped client names, chargebacks, and direct sales", () => {
    const entries: LedgerEntry[] = [
      {
        id: "e1",
        rowId: "b1:L28",
        batchId: "b1",
        lineNumber: 28,
        dateISO: "2025-07-14",
        effectiveMonth: "2025-08",
        saleMonth: "2025-07",
        seller: "Letícia Prado",
        coSellers: ["Letícia Prado"],
        client: 'Empresa "Alfa", Ltda',
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
          rowId: "b1:L28",
          lineNumber: 28,
          dateISO: "2025-07-14",
          saleMonth: "2025-07",
          client: 'Empresa "Alfa", Ltda',
          appliedTier: "8%",
          originalCommissionCents: 57_600,
        },
        obs: "cancelou em agosto",
      },
      {
        id: "e2",
        rowId: "b1:L116",
        batchId: "b1",
        lineNumber: 116,
        dateISO: "2025-09-02",
        effectiveMonth: "2025-09",
        saleMonth: "2025-09",
        seller: null,
        coSellers: [],
        client: "Cooperativa Agro Cerrado",
        saleType: "nova",
        kind: "direct_sale",
        tier: "direta",
        originalAmountCents: 3_000_000,
        assignedAmountCents: 3_000_000,
        splitPercentage: 100,
        countsTowardGoal: false,
        goalContributionCents: 0,
        baseAt5Cents: 0,
        commAt5Cents: 0,
        baseAt8Cents: 0,
        commAt8Cents: 0,
        commissionCents: 0,
      },
    ];

    const result = useCase.execute({ entries });

    expect(result.mimeType).toBe("text/csv;charset=utf-8");
    expect(result.suggestedFilename).toBe("extrato-comissoes.csv");
    expect(result.content.startsWith("\uFEFF")).toBe(true);
    expect(result.content).toContain('"Empresa ""Alfa"", Ltda"');
    expect(result.content).toContain('"-R$ 576,00"');
    expect(result.content).toContain('"Venda 2025-07 (linha 28, 8%)"');
    expect(result.content).toContain("Venda Direta (sem vendedor)");
  });
});
