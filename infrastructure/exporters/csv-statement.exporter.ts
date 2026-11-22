import type { LedgerEntry } from "@/domain/commissions/entities/ledger";
import type {
  StatementExporterPort,
  StatementExportPayload,
  StatementExportResult,
} from "@/domain/commissions/ports/statement-exporter.port";
import { formatBrlCents } from "@/domain/commissions/services/normalizers/currency-normalizer";

const CSV_HEADERS = [
  "Vendedor",
  "Mes_Competencia",
  "Data_Venda",
  "Linha_CSV",
  "Cliente",
  "Tipo",
  "Natureza",
  "Rateio_Pct",
  "Valor_Original",
  "Base_Atribuida",
  "Faixa_Aplicada",
  "Comissao",
  "Referencia_Origem",
  "Observacao",
] as const;

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\r\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatKindLabel(entry: LedgerEntry): string {
  switch (entry.kind) {
    case "sale":
      return "Comissão";
    case "same_month_cancel":
      return "Anulada no mesmo mês";
    case "estorno":
      return "Estorno";
    case "direct_sale":
      return "Venda Direta";
  }
}

function formatSplitPct(splitPercentage: number): string {
  return Number.isInteger(splitPercentage)
    ? `${splitPercentage}%`
    : `${splitPercentage.toFixed(2).replace(".", ",")}%`;
}

function formatOriginReference(entry: LedgerEntry): string {
  if (!entry.originRef) {
    return "";
  }
  return `Venda ${entry.originRef.saleMonth} (linha ${entry.originRef.lineNumber}, ${entry.originRef.appliedTier})`;
}

function buildSuggestedFilename(payload: StatementExportPayload): string {
  if (payload.summary) {
    const slug = payload.summary.seller
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `extrato-${slug}-${payload.summary.month}.csv`;
  }
  return "extrato-comissoes.csv";
}

export class CsvStatementExporterAdapter implements StatementExporterPort {
  readonly format = "csv";

  export(payload: StatementExportPayload): StatementExportResult {
    const rows: string[] = [CSV_HEADERS.join(",")];

    for (const entry of payload.entries) {
      const cells = [
        entry.seller ?? "Venda Direta (sem vendedor)",
        entry.effectiveMonth,
        entry.dateISO,
        entry.lineNumber,
        entry.client,
        entry.saleType === "nova" ? "Venda Nova" : "Renovação",
        formatKindLabel(entry),
        formatSplitPct(entry.splitPercentage),
        formatBrlCents(entry.originalAmountCents),
        formatBrlCents(entry.assignedAmountCents),
        entry.tier,
        formatBrlCents(entry.commissionCents),
        formatOriginReference(entry),
        entry.obs ?? "",
      ];
      rows.push(cells.map(escapeCsvCell).join(","));
    }

    return {
      content: `\uFEFF${rows.join("\r\n")}`,
      mimeType: "text/csv;charset=utf-8",
      suggestedFilename: buildSuggestedFilename(payload),
    };
  }
}

export function createCsvStatementExporter(): StatementExporterPort {
  return new CsvStatementExporterAdapter();
}
