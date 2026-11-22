import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCalculateCommissionsUseCase } from "@/application/commissions/calculate-commissions.use-case";
import { createIngestSalesUseCase } from "@/application/commissions/ingest-sales.use-case";
import type { SaleResolution } from "@/domain/commissions/entities/sale";
import { createDefaultSellerRegistry } from "@/domain/commissions/entities/seller";
import { createCsvSaleSourceAdapter } from "@/infrastructure/csv/csv-sale-source.adapter";

const REAL_CSV_PATH = path.resolve(
  process.cwd(),
  "test_files",
  "YMwngYvqunGNvAf1zJNut.csv"
);
const hasRealCsv = fs.existsSync(REAL_CSV_PATH);

describe("Real CSV Section 5 Gabarito & Mandatory Test #9 (E2E Resolution)", () => {
  const ingestUseCase = createIngestSalesUseCase(createCsvSaleSourceAdapter());
  const calculateUseCase = createCalculateCommissionsUseCase();
  const sellerRegistry = createDefaultSellerRegistry();

  it.skipIf(!hasRealCsv)(
    "matches Section 5 gabarito cent-for-cent and all 6 chargebacks using only the 204 confirmed rows",
    () => {
      const content = fs.readFileSync(REAL_CSV_PATH, "utf-8");
      const ingested = ingestUseCase.execute({
        input: content,
        batchId: "jul-out-2025",
        sellerRegistry,
      });

      const report = calculateUseCase.execute({
        rows: ingested.rows,
        sellerRegistry,
      });

      expect(report.pendingRows).toHaveLength(19);
      expect(report.months).toEqual([
        "2025-07",
        "2025-08",
        "2025-09",
        "2025-10",
      ]);

      const expectedMatrix: Record<
        string,
        Record<"2025-07" | "2025-08" | "2025-09" | "2025-10" | "total", number>
      > = {
        "Bruno Sá": {
          "2025-07": 1_156_800,
          "2025-08": 514_400,
          "2025-09": 137_400,
          "2025-10": 468_600,
          total: 2_277_200,
        },
        "Camila Teixeira": {
          "2025-07": 883_200,
          "2025-08": 285_800,
          "2025-09": 153_600,
          "2025-10": 703_200,
          total: 2_025_800,
        },
        "Letícia Prado": {
          "2025-07": 1_922_400,
          "2025-08": 722_400,
          "2025-09": 467_400,
          "2025-10": 150_000,
          total: 3_262_200,
        },
        "Otávio Lins": {
          "2025-07": 198_000,
          "2025-08": 470_400,
          "2025-09": 429_600,
          "2025-10": 780_000,
          total: 1_878_000,
        },
        "Rafael Moura": {
          "2025-07": 1_418_400,
          "2025-08": 650_600,
          "2025-09": 714_000,
          "2025-10": 785_400,
          total: 3_568_400,
        },
      };

      for (const [seller, expected] of Object.entries(expectedMatrix)) {
        for (const month of report.months) {
          const m = month as "2025-07" | "2025-08" | "2025-09" | "2025-10";
          expect(report.bySellerMonth[seller][m].netCommissionCents).toBe(
            expected[m]
          );
        }
        expect(report.sellerTotals[seller]).toBe(expected.total);
      }

      const chargebacks = report.allEntries
        .filter((entry) => entry.kind === "estorno")
        .map((entry) => ({
          month: entry.effectiveMonth,
          seller: entry.seller,
          lineNumber: entry.lineNumber,
          commissionCents: entry.commissionCents,
          originTier: entry.originRef?.appliedTier,
        }));

      expect(chargebacks).toEqual([
        {
          month: "2025-08",
          seller: "Letícia Prado",
          lineNumber: 28,
          commissionCents: -57_600,
          originTier: "8%",
        },
        {
          month: "2025-09",
          seller: "Rafael Moura",
          lineNumber: 2,
          commissionCents: -48_000,
          originTier: "5%",
        },
        {
          month: "2025-09",
          seller: "Bruno Sá",
          lineNumber: 94,
          commissionCents: -48_000,
          originTier: "5%",
        },
        {
          month: "2025-09",
          seller: "Bruno Sá",
          lineNumber: 109,
          commissionCents: -36_000,
          originTier: "2%",
        },
        {
          month: "2025-10",
          seller: "Rafael Moura",
          lineNumber: 89,
          commissionCents: -90_000,
          originTier: "5%",
        },
        {
          month: "2025-10",
          seller: "Otávio Lins",
          lineNumber: 110,
          commissionCents: -48_000,
          originTier: "5%",
        },
      ]);
    }
  );

  it.skipIf(!hasRealCsv)(
    "Mandatory Test #9: resolves all 19 pending rows end-to-end leaving 0 pending and full accounting consistency",
    () => {
      const content = fs.readFileSync(REAL_CSV_PATH, "utf-8");
      const ingested = ingestUseCase.execute({
        input: content,
        batchId: "jul-out-2025",
        sellerRegistry,
      });

      const byLine = new Map(
        ingested.pendingRows.map((row) => [row.lineNumber, row])
      );

      const resolutions: Record<string, SaleResolution> = {};
      const missingTypeAsNova = [4, 29, 55, 56, 86, 103, 136, 138, 151, 152, 186, 196, 214];
      for (const line of missingTypeAsNova) {
        const row = byLine.get(line)!;
        resolutions[row.id] = {
          rowId: row.id,
          action: "resolve",
          type: line === 151 || line === 152 ? "renovacao" : "nova",
        };
      }

      const row51 = byLine.get(51)!;
      resolutions[row51.id] = {
        rowId: row51.id,
        action: "resolve",
        cancellationMonth: "2025-07",
      };

      const row116 = byLine.get(116)!;
      resolutions[row116.id] = {
        rowId: row116.id,
        action: "resolve",
        isDirectSale: true,
      };

      const row128 = byLine.get(128)!;
      resolutions[row128.id] = {
        rowId: row128.id,
        action: "resolve",
        isDirectSale: true,
      };

      const row134 = byLine.get(134)!;
      resolutions[row134.id] = {
        rowId: row134.id,
        action: "resolve",
        splitWeights: [60, 40],
      };

      const row161 = byLine.get(161)!;
      resolutions[row161.id] = {
        rowId: row161.id,
        action: "discard",
        keepDuplicate: false,
      };

      const row180 = byLine.get(180)!;
      resolutions[row180.id] = {
        rowId: row180.id,
        action: "resolve",
        amountCents: 1_200_000,
      };

      const baseline = calculateUseCase.execute({
        rows: ingested.rows,
        sellerRegistry,
      });

      const resolvedReport = calculateUseCase.execute({
        rows: ingested.rows,
        resolutions,
        sellerRegistry,
      });

      expect(resolvedReport.pendingRows).toHaveLength(0);
      expect(resolvedReport.discardedRows).toHaveLength(1);
      expect(resolvedReport.resolvedRows).toHaveLength(18);
      expect(resolvedReport.directSales).toHaveLength(2);
      expect(
        resolvedReport.directSales.every((d) => d.commissionCents === 0)
      ).toBe(true);

      const sumBySellers = Object.values(resolvedReport.sellerTotals).reduce(
        (acc, val) => acc + val,
        0
      );
      const sumByMonths = Object.values(resolvedReport.monthTotals).reduce(
        (acc, val) => acc + val,
        0
      );
      expect(sumBySellers).toBe(resolvedReport.grandTotalCents);
      expect(sumByMonths).toBe(resolvedReport.grandTotalCents);
      expect(resolvedReport.grandTotalCents).toBeGreaterThan(
        baseline.grandTotalCents
      );

      // Line 180 (R$ 12.000,00 for Rafael in Out) + Line 134 (60/40 Camila & Bruno in Set) reflected in entries
      const line134Entries = resolvedReport.allEntries.filter(
        (e) => e.lineNumber === 134
      );
      expect(line134Entries).toHaveLength(2);
      expect(line134Entries.map((e) => [e.seller, e.splitPercentage])).toEqual([
        ["Camila Teixeira", 60],
        ["Bruno Sá", 40],
      ]);

      const line180Entry = resolvedReport.allEntries.find(
        (e) => e.lineNumber === 180
      );
      expect(line180Entry?.assignedAmountCents).toBe(1_200_000);
      expect(line180Entry?.seller).toBe("Rafael Moura");

      // Line 51 cancelled in same month (July) -> anulada, R$ 0
      const line51Entry = resolvedReport.allEntries.find(
        (e) => e.lineNumber === 51
      );
      expect(line51Entry?.kind).toBe("same_month_cancel");
      expect(line51Entry?.commissionCents).toBe(0);
    }
  );
});
