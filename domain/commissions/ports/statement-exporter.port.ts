import type { LedgerEntry, SellerMonthSummary } from "../entities/ledger";

export interface StatementExportPayload {
  summary?: SellerMonthSummary;
  entries: readonly LedgerEntry[];
  pendingCountForSeller?: number;
  filterLabel?: string;
}

export interface StatementExportResult {
  content: string;
  mimeType: string;
  suggestedFilename?: string;
}

export interface StatementExporterPort {
  readonly format: string;
  export(payload: StatementExportPayload): StatementExportResult;
}
