import { describe, expect, it } from "vitest";
import { createCalculateCommissionsUseCase } from "@/application/commissions/calculate-commissions.use-case";
import { createIngestSalesUseCase } from "@/application/commissions/ingest-sales.use-case";
import { createDefaultSellerRegistry } from "@/domain/commissions/entities/seller";
import { createCsvSaleSourceAdapter } from "@/infrastructure/csv/csv-sale-source.adapter";

function buildSyntheticCsv(rowCount: number): string {
  const sellers = [
    "Rafael",
    "Bruno Sá",
    "Leticia",
    "Camila",
    "Otávio",
    "Rafa + Bruno Sá",
  ];
  const lines: string[] = ["data,vendedor,cliente,valor,tipo,status,obs"];

  for (let i = 0; i < rowCount; i += 1) {
    const monthNum = (i % 12) + 1;
    const dayNum = (i % 28) + 1;
    const monthStr = String(monthNum).padStart(2, "0");
    const dayStr = String(dayNum).padStart(2, "0");
    const seller = sellers[i % sellers.length];
    const amount = 6000 + (i % 8) * 3000;
    const type = i % 3 === 0 ? "renovacao" : "nova";

    let status = "fechado";
    let obs = "";
    if (i % 50 === 0) {
      status = "cancelado";
      obs = monthNum < 12 ? `cancelou em ${String(monthNum + 1).padStart(2, "0")}/2025` : "mesmo mes";
    } else if (i % 35 === 0) {
      status = "cancelado";
      obs = "mesmo mes";
    }

    lines.push(
      `${dayStr}/${monthStr}/2025,${seller},Cliente_${i},${amount},${type},${status},${obs}`
    );
  }

  return lines.join("\n");
}

describe("Scale Benchmark (10,000 rows)", () => {
  it("ingests and calculates 10,000 rows across 12 months with full accounting consistency under 2.5s", () => {
    const csv = buildSyntheticCsv(10_000);
    const ingestUseCase = createIngestSalesUseCase(createCsvSaleSourceAdapter());
    const calculateUseCase = createCalculateCommissionsUseCase();
    const sellerRegistry = createDefaultSellerRegistry();

    const startMs = performance.now();
    const ingested = ingestUseCase.execute({
      input: csv,
      batchId: "scale-10k",
      sellerRegistry,
    });
    const report = calculateUseCase.execute({
      rows: ingested.rows,
      sellerRegistry,
    });
    const elapsedMs = performance.now() - startMs;

    expect(ingested.rows).toHaveLength(10_000);
    expect(report.pendingRows).toHaveLength(0);
    expect(report.months).toHaveLength(12);

    const sellerSum = Object.values(report.sellerTotals).reduce(
      (acc, v) => acc + v,
      0
    );
    const monthSum = Object.values(report.monthTotals).reduce(
      (acc, v) => acc + v,
      0
    );

    expect(sellerSum).toBe(report.grandTotalCents);
    expect(monthSum).toBe(report.grandTotalCents);
    expect(elapsedMs).toBeLessThan(2500);
  });
});
