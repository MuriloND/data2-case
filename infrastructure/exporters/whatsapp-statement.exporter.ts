import type { LedgerEntry, SellerMonthSummary } from "@/domain/commissions/entities/ledger";
import type { IsoDate, MonthKey } from "@/domain/commissions/entities/sale";
import type {
  StatementExporterPort,
  StatementExportPayload,
  StatementExportResult,
} from "@/domain/commissions/ports/statement-exporter.port";
import { formatBrlCents } from "@/domain/commissions/services/normalizers/currency-normalizer";

const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

function formatMonthLong(monthKey: MonthKey): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    return monthKey;
  }
  const idx = Number(match[2]) - 1;
  return `${MONTH_NAMES_PT[idx] ?? match[2]}/${match[1]}`;
}

function formatDateBr(dateISO: IsoDate): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!match) {
    return dateISO;
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatSplitTag(entry: LedgerEntry): string {
  if (entry.coSellers.length <= 1) {
    return "";
  }
  const pct = Number.isInteger(entry.splitPercentage)
    ? `${entry.splitPercentage}%`
    : `${entry.splitPercentage.toFixed(1).replace(".", ",")}%`;
  return ` [Rateio ${pct}]`;
}

function formatSaleLine(entry: LedgerEntry): string {
  const dateLabel = formatDateBr(entry.dateISO);
  const typeLabel = entry.saleType === "nova" ? "Venda Nova" : "Renovação";
  const splitTag = formatSplitTag(entry);
  const baseLabel = formatBrlCents(entry.assignedAmountCents);

  if (entry.kind === "same_month_cancel") {
    return `• ${dateLabel} | ${entry.client} (${typeLabel}${splitTag}) — Base ${baseLabel} → Anulada no mesmo mês: R$ 0,00`;
  }

  const tierDetail =
    entry.tier === "5% + 8%"
      ? `5% s/ ${formatBrlCents(entry.baseAt5Cents)} (${formatBrlCents(entry.commAt5Cents)}) + 8% s/ ${formatBrlCents(entry.baseAt8Cents)} (${formatBrlCents(entry.commAt8Cents)})`
      : `Faixa ${entry.tier}`;

  return `• ${dateLabel} | ${entry.client} (${typeLabel}${splitTag}) — Base ${baseLabel} | ${tierDetail} → *${formatBrlCents(entry.commissionCents)}*`;
}

function formatChargebackLine(entry: LedgerEntry): string {
  const origin = entry.originRef;
  const originContext = origin
    ? `Ref. ${formatMonthLong(origin.saleMonth)} (linha ${origin.lineNumber}, faixa ${origin.appliedTier})`
    : `Ref. ${formatMonthLong(entry.saleMonth)}`;

  return `• ${formatDateBr(entry.dateISO)} | ${entry.client} (${originContext}) → *${formatBrlCents(entry.commissionCents)}*`;
}

function appendEntriesAndTotals(
  lines: string[],
  entries: readonly LedgerEntry[],
  pendingCountForSeller?: number
): void {
  const sales = entries.filter(
    (entry) => entry.kind === "sale" || entry.kind === "same_month_cancel"
  );
  const chargebacks = entries.filter((entry) => entry.kind === "estorno");

  lines.push("*Lançamentos:*");
  if (sales.length === 0) {
    lines.push("• Nenhuma venda registrada neste recorte.");
  } else {
    for (const entry of sales) {
      lines.push(formatSaleLine(entry));
    }
  }

  if (chargebacks.length > 0) {
    lines.push("");
    lines.push("*Estornos de cancelamentos posteriores:*");
    for (const entry of chargebacks) {
      lines.push(formatChargebackLine(entry));
    }
  }

  let novaCents = 0;
  let renovacaoCents = 0;
  let estornoCents = 0;
  for (const entry of entries) {
    if (entry.kind === "estorno") {
      estornoCents += entry.commissionCents;
    } else if (entry.kind === "sale") {
      if (entry.saleType === "nova") {
        novaCents += entry.commissionCents;
      } else {
        renovacaoCents += entry.commissionCents;
      }
    }
  }
  const netCents = novaCents + renovacaoCents + estornoCents;

  lines.push("");
  lines.push("*Resumo:*");
  lines.push(`• Vendas Novas: ${formatBrlCents(novaCents)}`);
  lines.push(`• Renovações (2%): ${formatBrlCents(renovacaoCents)}`);
  if (estornoCents < 0) {
    lines.push(`• Estornos: ${formatBrlCents(estornoCents)}`);
  }
  lines.push(`*Total líquido a receber: ${formatBrlCents(netCents)}*`);

  if (pendingCountForSeller && pendingCountForSeller > 0) {
    lines.push("");
    lines.push(
      `_Obs.: Há ${pendingCountForSeller} item(ns) deste vendedor na Fila de Pendências aguardando confirmação._`
    );
  }
}

function formatSummaryStatement(
  summary: SellerMonthSummary,
  pendingCountForSeller?: number
): string {
  const lines: string[] = [];
  const monthLabel = formatMonthLong(summary.month);

  lines.push("*Extrato de Comissões — Nuvem Fiscal*");
  lines.push(`Vendedor: *${summary.seller}* | Competência: *${monthLabel}*`);
  lines.push("");

  const goalStatus = summary.goalReached
    ? "META BATIDA (faixa de 8% liberada)"
    : `Faltam ${formatBrlCents(summary.remainingToGoalCents)} para a meta`;

  lines.push(
    `Meta de Vendas Novas: ${formatBrlCents(summary.novaGoalAccumulatedCents)} / ${formatBrlCents(summary.goalCents)} (${summary.goalProgressPercent.toFixed(1).replace(".", ",")}%)`
  );
  lines.push(`Status da Meta: ${goalStatus}`);
  lines.push("");

  appendEntriesAndTotals(lines, summary.entries, pendingCountForSeller);
  return lines.join("\n");
}

function formatFilteredStatement(payload: StatementExportPayload): string {
  const lines: string[] = [];
  const title = payload.filterLabel
    ? `Recorte: *${payload.filterLabel}*`
    : "Extrato Consolidado";

  lines.push("*Extrato de Comissões — Nuvem Fiscal*");
  lines.push(title);
  lines.push("");

  appendEntriesAndTotals(
    lines,
    payload.entries,
    payload.pendingCountForSeller
  );
  return lines.join("\n");
}

export class WhatsAppStatementExporterAdapter implements StatementExporterPort {
  readonly format = "whatsapp";

  export(payload: StatementExportPayload): StatementExportResult {
    const content = payload.summary
      ? formatSummaryStatement(payload.summary, payload.pendingCountForSeller)
      : formatFilteredStatement(payload);

    return {
      content,
      mimeType: "text/plain;charset=utf-8",
    };
  }
}

export function createWhatsAppStatementExporter(): StatementExporterPort {
  return new WhatsAppStatementExporterAdapter();
}
