import type { CommissionReport } from "../../domain/commissions/entities/ledger";
import type {
  ParsedSaleRecord,
  SaleResolution,
} from "../../domain/commissions/entities/sale";
import type { SellerRegistry } from "../../domain/commissions/entities/seller";
import { calculateCommissionLedger } from "../../domain/commissions/services/commission-ledger-engine";
import { buildCommissionReport } from "../../domain/commissions/services/report-aggregator";
import {
  applySaleResolution,
  toResolvedSaleData,
  type ResolvedSaleData,
} from "../../domain/commissions/services/resolution-applier";

export interface CalculateCommissionsRequest {
  rows: readonly ParsedSaleRecord[];
  resolutions?: Readonly<Record<string, SaleResolution>>;
  sellerRegistry: SellerRegistry;
}

export class CalculateCommissionsUseCase {
  execute(request: CalculateCommissionsRequest): CommissionReport {
    const resolutions = request.resolutions ?? {};
    const pendingRows: ParsedSaleRecord[] = [];
    const resolvedRows: ParsedSaleRecord[] = [];
    const discardedRows: ParsedSaleRecord[] = [];
    const confirmedSales: ResolvedSaleData[] = [];

    for (const row of request.rows) {
      const resolution = resolutions[row.id];
      const applied = applySaleResolution(row, resolution);

      if (applied.kind === "discarded") {
        discardedRows.push(applied.record);
        continue;
      }

      if (applied.kind === "pending") {
        pendingRows.push(applied.record);
        continue;
      }

      if (applied.wasPending) {
        resolvedRows.push(applied.record);
      }

      const saleData = toResolvedSaleData(applied.record, resolution);
      if (saleData) {
        confirmedSales.push(saleData);
      } else {
        pendingRows.push(applied.record);
      }
    }

    const { entries, directSales } = calculateCommissionLedger(confirmedSales);

    return buildCommissionReport({
      entries,
      directSales,
      pendingRows,
      resolvedRows,
      discardedRows,
      totalParsedRows: request.rows.length,
      sellerRegistry: request.sellerRegistry,
    });
  }
}

export function createCalculateCommissionsUseCase(): CalculateCommissionsUseCase {
  return new CalculateCommissionsUseCase();
}
