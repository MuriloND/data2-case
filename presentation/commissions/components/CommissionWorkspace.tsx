"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  FileText,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import type { MonthKey } from "@/domain/commissions/entities/sale";
import { getActiveSellerNames } from "@/domain/commissions/entities/seller";
import type { DefaultCsvPayload } from "@/infrastructure/server/default-csv.loader";
import { useCommissionWorkspace } from "../hooks/use-commission-workspace";
import { CsvUploadModal } from "./CsvUploadModal";
import { IndividualStatementTab } from "./IndividualStatementTab";
import { KpiSummaryBar } from "./KpiSummaryBar";
import { MonthlySummaryTab } from "./MonthlySummaryTab";
import { PendingQueueTab } from "./PendingQueueTab";
import { WorkspaceHeader } from "./WorkspaceHeader";

interface CommissionWorkspaceProps {
  initialCsv: DefaultCsvPayload | null;
}

type WorkspaceTab = "pending" | "summary" | "statement";

export function CommissionWorkspace({ initialCsv }: CommissionWorkspaceProps) {
  const { state, store, services } = useCommissionWorkspace(initialCsv);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("pending");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [statementSeller, setStatementSeller] = useState("");
  const [statementMonth, setStatementMonth] = useState<MonthKey | "all">("all");

  const activeSellers = getActiveSellerNames(state.sellerRegistry);
  const hasResolutions = Object.keys(state.resolutions).length > 0;

  const handleOpenStatement = (seller: string, month: MonthKey | "all") => {
    setStatementSeller(seller);
    setStatementMonth(month);
    setActiveTab("statement");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <WorkspaceHeader
        batches={state.batches}
        totalRows={state.rows.length}
        sourceMode={state.sourceMode}
        hasDefaultAvailable={state.hasDefaultAvailable}
        hasResolutions={hasResolutions}
        onOpenUpload={() => setIsUploadOpen(true)}
        onResetToDefault={() => store.resetToDefault()}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {state.lastUploadFeedback && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-950">
            <div className="space-y-1">
              <p className="font-medium">
                Arquivo <strong>{state.lastUploadFeedback.fileName}</strong>{" "}
                processado ({state.lastUploadFeedback.addedRowsCount} linha(s),{" "}
                {state.lastUploadFeedback.pendingCount} pendência(s)).
              </p>
              {state.lastUploadFeedback.missingColumns.length > 0 && (
                <p className="text-xs text-amber-800">
                  Atenção: colunas obrigatórias ausentes no cabeçalho:{" "}
                  {state.lastUploadFeedback.missingColumns.join(", ")}.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => store.dismissUploadFeedback()}
              aria-label="Fechar aviso de importação"
              className="rounded-lg p-1 text-blue-700 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {state.batches.length === 0 ? (
          <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Upload className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Envie um CSV de vendas para calcular as comissões
            </h2>
            <p className="mt-1.5 max-w-lg text-sm text-slate-500">
              O sistema normaliza datas, valores e aliases automaticamente, isola
              exceções na Fila de Pendências sem chutar valores e calcula as
              faixas de 5%, 8%, 2% e estornos.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Selecionar CSV
              </button>
              <button
                type="button"
                onClick={() => store.loadSyntheticSample()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Sparkles
                  className="h-4 w-4 text-blue-600"
                  aria-hidden="true"
                />
                Carregar amostra demo
              </button>
            </div>
          </section>
        ) : (
          <>
            <KpiSummaryBar report={state.report} />

            <nav
              aria-label="Seções do fechamento"
              className="flex flex-wrap gap-2 border-b border-slate-200 pb-3"
            >
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeTab === "pending"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Fila de Pendências
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                    state.report.pendingRows.length > 0
                      ? activeTab === "pending"
                        ? "bg-amber-400 text-slate-950"
                        : "bg-amber-100 text-amber-800"
                      : "bg-emerald-500/20 text-emerald-700"
                  }`}
                >
                  {state.report.pendingRows.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeTab === "summary"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
                Resumo Mensal &amp; Metas
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("statement")}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeTab === "statement"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Extrato Individual
              </button>
            </nav>

            {activeTab === "pending" && (
              <PendingQueueTab
                pendingRows={state.report.pendingRows}
                resolvedRows={state.report.resolvedRows}
                discardedRows={state.report.discardedRows}
                activeSellers={activeSellers}
                onResolve={(res) => store.resolveRow(res)}
                onUndo={(rowId) => store.undoResolution(rowId)}
                onAddSeller={(name, aliases) => store.addSeller(name, aliases)}
                onMapAlias={(alias, canonical) =>
                  store.mapAlias(alias, canonical)
                }
              />
            )}

            {activeTab === "summary" && (
              <MonthlySummaryTab
                report={state.report}
                onOpenStatement={handleOpenStatement}
              />
            )}

            {activeTab === "statement" && (
              <IndividualStatementTab
                report={state.report}
                selectedSeller={statementSeller}
                selectedMonth={statementMonth}
                onSelectSeller={setStatementSeller}
                onSelectMonth={setStatementMonth}
                onGoToPending={() => setActiveTab("pending")}
                exportWhatsAppUseCase={services.exportWhatsAppUseCase}
                exportCsvUseCase={services.exportCsvUseCase}
              />
            )}
          </>
        )}
      </main>

      <CsvUploadModal
        isOpen={isUploadOpen}
        hasExistingData={state.batches.length > 0}
        onClose={() => setIsUploadOpen(false)}
        onImport={(fileName, csvText, mode) => {
          if (mode === "append") {
            store.appendCsv(fileName, csvText);
          } else {
            store.replaceWithCsv(fileName, csvText);
          }
        }}
        onLoadSyntheticSample={() => store.loadSyntheticSample()}
      />
    </div>
  );
}
