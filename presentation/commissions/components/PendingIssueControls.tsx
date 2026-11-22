"use client";

import { useState } from "react";
import type { PendingIssue } from "@/domain/commissions/entities/pending-issue";
import type {
  ParsedSaleRecord,
  SaleResolution,
  SaleStatus,
  SaleType,
} from "@/domain/commissions/entities/sale";
import { formatBrlCents } from "@/domain/commissions/services/normalizers/currency-normalizer";

interface PendingIssueControlsProps {
  row: ParsedSaleRecord;
  issue: PendingIssue;
  draft: SaleResolution;
  activeSellers: readonly string[];
  isSingleIssue: boolean;
  onPatchDraft: (patch: Partial<SaleResolution>) => void;
  onQuickCommit: (patch: Partial<SaleResolution>) => void;
  onDiscardRow: () => void;
  onAddSeller: (canonicalName: string, aliases?: string[]) => void;
  onMapAlias: (rawAlias: string, canonicalName: string) => void;
}

function parseReaisInputToCents(raw: string): number | null {
  const cleaned = raw.replace(/\s+/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.round(value * 100);
}

export function PendingIssueControls({
  row,
  issue,
  draft,
  activeSellers,
  isSingleIssue,
  onPatchDraft,
  onQuickCommit,
  onDiscardRow,
  onAddSeller,
  onMapAlias,
}: PendingIssueControlsProps) {
  const [dateInput, setDateInput] = useState(
    draft.dateISO ?? row.dateISO ?? ""
  );
  const [valueInput, setValueInput] = useState(() => {
    const initial =
      draft.amountCents ?? row.amountCents ?? row.suggestedAmountCents;
    return initial ? (initial / 100).toFixed(2).replace(".", ",") : "";
  });
  const [cancelMonthInput, setCancelMonthInput] = useState(
    draft.cancellationMonth ??
      row.cancellationMonth ??
      issue.suggestion?.cancellationMonth ??
      row.saleMonth ??
      ""
  );
  const [selectedSellers, setSelectedSellers] = useState<string[]>(
    draft.sellers ?? row.sellers
  );
  const [aliasTarget, setAliasTarget] = useState<string>(
    activeSellers[0] ?? ""
  );
  const [rememberAlias, setRememberAlias] = useState(true);
  const [newSellerName, setNewSellerName] = useState(
    row.unknownSellerTokens[0] ?? ""
  );
  const [splitInputs, setSplitInputs] = useState<string[]>(() => {
    const weights =
      draft.splitWeights ??
      row.suggestedSplitWeights ??
      row.sellers.map(() =>
        Math.round((100 / Math.max(1, row.sellers.length)) * 100) / 100
      );
    return weights.map(String);
  });

  const applyOrStage = (patch: Partial<SaleResolution>) => {
    if (isSingleIssue) {
      onQuickCommit(patch);
    } else {
      onPatchDraft(patch);
    }
  };

  if (issue.code === "MISSING_TYPE" || issue.code === "UNKNOWN_TYPE") {
    const selectedType: SaleType | undefined = draft.type;
    const suggestedType = issue.suggestion?.type;

    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => applyOrStage({ type: "nova" })}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            selectedType === "nova"
              ? "border-blue-600 bg-blue-600 text-white"
              : suggestedType === "nova"
                ? "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Venda Nova (5% / 8%)
          {suggestedType === "nova" ? " · Sugerida" : ""}
        </button>

        <button
          type="button"
          onClick={() => applyOrStage({ type: "renovacao" })}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            selectedType === "renovacao"
              ? "border-blue-600 bg-blue-600 text-white"
              : suggestedType === "renovacao"
                ? "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Renovação (2%)
          {suggestedType === "renovacao" ? " · Sugerida" : ""}
        </button>
      </div>
    );
  }

  if (issue.code === "INVALID_VALUE" || issue.code === "UNCONFIRMED_VALUE") {
    const parsedCents = parseReaisInputToCents(valueInput);
    const suggestedCents = issue.suggestion?.amountCents;

    return (
      <div className="flex flex-wrap items-center gap-2">
        {suggestedCents !== undefined && (
          <button
            type="button"
            onClick={() => applyOrStage({ amountCents: suggestedCents })}
            className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100"
          >
            Confirmar {formatBrlCents(suggestedCents)}
          </button>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">R$</span>
          <input
            type="text"
            aria-label="Valor em reais"
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
            placeholder="12000,00"
            className="w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={parsedCents === null}
            onClick={() => {
              if (parsedCents !== null) {
                applyOrStage({ amountCents: parsedCents });
              }
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSingleIssue ? "Aplicar valor" : "Definir valor"}
          </button>
        </div>
      </div>
    );
  }

  if (issue.code === "INVALID_DATE") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          aria-label="Data da venda"
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          disabled={!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)}
          onClick={() => applyOrStage({ dateISO: dateInput })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {isSingleIssue ? "Confirmar data" : "Definir data"}
        </button>
      </div>
    );
  }

  if (issue.code === "UNKNOWN_STATUS") {
    const selectedStatus: SaleStatus | undefined = draft.status;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            applyOrStage({ status: "fechado", cancellationMonth: null })
          }
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
            selectedStatus === "fechado"
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Fechado (Ativo)
        </button>

        <div className="flex items-center gap-1.5">
          <input
            type="month"
            aria-label="Mês do cancelamento"
            value={cancelMonthInput}
            onChange={(e) => setCancelMonthInput(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800"
          />
          <button
            type="button"
            disabled={!/^\d{4}-\d{2}$/.test(cancelMonthInput)}
            onClick={() =>
              applyOrStage({
                status: "cancelado",
                cancellationMonth: cancelMonthInput,
              })
            }
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
              selectedStatus === "cancelado"
                ? "border-rose-600 bg-rose-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Cancelado neste mês
          </button>
        </div>
      </div>
    );
  }

  if (
    issue.code === "MISSING_CANCELLATION_MONTH" ||
    issue.code === "INVALID_CANCELLATION_MONTH"
  ) {
    const suggestedMonth = issue.suggestion?.cancellationMonth;
    return (
      <div className="flex flex-wrap items-center gap-2">
        {suggestedMonth && (
          <button
            type="button"
            onClick={() =>
              applyOrStage({
                status: "cancelado",
                cancellationMonth: suggestedMonth,
              })
            }
            className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100"
          >
            {issue.suggestion?.label ?? `Usar ${suggestedMonth}`}
          </button>
        )}

        <div className="flex items-center gap-1.5">
          <input
            type="month"
            aria-label="Selecionar mês de cancelamento"
            value={cancelMonthInput}
            onChange={(e) => setCancelMonthInput(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
          />
          <button
            type="button"
            disabled={!/^\d{4}-\d{2}$/.test(cancelMonthInput)}
            onClick={() =>
              applyOrStage({
                status: "cancelado",
                cancellationMonth: cancelMonthInput,
              })
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Aplicar mês
          </button>
        </div>
      </div>
    );
  }

  if (issue.code === "AMBIGUOUS_SPLIT") {
    const parsedWeights = splitInputs.map((v) => Number(v.replace(",", ".")));
    const sum = parsedWeights.reduce(
      (acc, n) => acc + (Number.isFinite(n) ? n : 0),
      0
    );
    const isValidSum =
      parsedWeights.length === row.sellers.length &&
      parsedWeights.every((n) => Number.isFinite(n) && n > 0) &&
      Math.abs(sum - 100) < 0.01;

    const equalWeights = row.sellers.map((_, idx) => {
      if (row.sellers.length === 2) return 50;
      const base = Math.floor((10000 / row.sellers.length)) / 100;
      return idx === 0
        ? Number((100 - base * (row.sellers.length - 1)).toFixed(2))
        : base;
    });

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {row.suggestedSplitWeights && (
            <button
              type="button"
              onClick={() =>
                applyOrStage({ splitWeights: row.suggestedSplitWeights })
              }
              className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100"
            >
              Confirmar {row.suggestedSplitWeights.map((w) => `${w}%`).join(" / ")}
            </button>
          )}
          <button
            type="button"
            onClick={() => applyOrStage({ splitWeights: equalWeights })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Igualitário ({equalWeights.map((w) => `${w}%`).join(" / ")})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {row.sellers.map((seller, index) => (
            <label key={seller} className="flex items-center gap-1 text-xs">
              <span className="text-slate-600">{seller}:</span>
              <input
                type="number"
                min={1}
                max={99}
                value={splitInputs[index] ?? ""}
                onChange={(e) => {
                  const next = [...splitInputs];
                  next[index] = e.target.value;
                  setSplitInputs(next);
                }}
                className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800"
              />
              <span className="text-slate-400">%</span>
            </label>
          ))}
          <span
            className={`text-xs font-medium ${
              isValidSum ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            Soma: {sum.toFixed(0)}%
          </span>
          <button
            type="button"
            disabled={!isValidSum}
            onClick={() => applyOrStage({ splitWeights: parsedWeights })}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Aplicar rateio
          </button>
        </div>
      </div>
    );
  }

  if (issue.code === "DUPLICATE_SUSPECT") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onDiscardRow}
          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-100"
        >
          Descartar duplicata
        </button>
        <button
          type="button"
          onClick={() => applyOrStage({ keepDuplicate: true })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Manter ambas no cálculo
        </button>
      </div>
    );
  }

  // MISSING_SELLER | FORMER_EMPLOYEE | UNKNOWN_SELLER
  const toggleSeller = (name: string) => {
    setSelectedSellers((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            applyOrStage({ isDirectSale: true, sellers: [] })
          }
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
            draft.isDirectSale
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100"
          }`}
        >
          Confirmar Venda Direta (R$ 0)
        </button>

        {issue.code === "FORMER_EMPLOYEE" &&
          row.formerEmployees.map((formerName) => (
            <button
              key={formerName}
              type="button"
              onClick={() =>
                applyOrStage({
                  isDirectSale: false,
                  sellers: [...row.sellers, formerName],
                })
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Aprovar pagamento ({formerName})
            </button>
          ))}

        {issue.code === "FORMER_EMPLOYEE" && (
          <button
            type="button"
            onClick={onDiscardRow}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
          >
            Descartar lançamento
          </button>
        )}
      </div>

      {issue.code === "UNKNOWN_SELLER" && row.unknownSellerTokens.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-600">
              Mapear &quot;{row.unknownSellerTokens[0]}&quot; para:
            </span>
            <select
              aria-label="Vendedor existente"
              value={aliasTarget}
              onChange={(e) => setAliasTarget(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
            >
              {activeSellers.map((seller) => (
                <option key={seller} value={seller}>
                  {seller}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={rememberAlias}
                onChange={(e) => setRememberAlias(e.target.checked)}
              />
              Lembrar alias
            </label>
            <button
              type="button"
              disabled={!aliasTarget}
              onClick={() => {
                if (rememberAlias) {
                  onMapAlias(row.unknownSellerTokens[0], aliasTarget);
                } else {
                  applyOrStage({
                    isDirectSale: false,
                    sellers: [...row.sellers, aliasTarget],
                  });
                }
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Vincular
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-600">Ou criar vendedor:</span>
            <input
              type="text"
              aria-label="Nome do novo vendedor"
              value={newSellerName}
              onChange={(e) => setNewSellerName(e.target.value)}
              className="w-44 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
            />
            <button
              type="button"
              disabled={!newSellerName.trim()}
              onClick={() =>
                onAddSeller(newSellerName.trim(), [row.unknownSellerTokens[0]])
              }
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Criar e aplicar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-slate-500">Atribuir a:</span>
        {activeSellers.map((seller) => {
          const active = selectedSellers.includes(seller);
          return (
            <button
              key={seller}
              type="button"
              onClick={() => toggleSeller(seller)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {seller}
            </button>
          );
        })}
        <button
          type="button"
          disabled={selectedSellers.length === 0}
          onClick={() =>
            applyOrStage({ isDirectSale: false, sellers: selectedSellers })
          }
          className="ml-1 rounded-lg border border-slate-300 bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-40"
        >
          Aplicar vendedor(es)
        </button>
      </div>
    </div>
  );
}
