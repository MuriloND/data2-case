"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import { FileUp, Layers, RefreshCw, Sparkles, X } from "lucide-react";

interface CsvUploadModalProps {
  isOpen: boolean;
  hasExistingData: boolean;
  onClose: () => void;
  onImport: (fileName: string, csvText: string, mode: "replace" | "append") => void;
  onLoadSyntheticSample: () => void;
}

export function CsvUploadModal({
  isOpen,
  hasExistingData,
  onClose,
  onImport,
  onLoadSyntheticSample,
}: CsvUploadModalProps) {
  const [mode, setMode] = useState<"append" | "replace">(
    hasExistingData ? "append" : "replace"
  );
  const [fileName, setFileName] = useState("upload-vendas.csv");
  const [csvText, setCsvText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const lineEstimate = csvText.trim()
    ? Math.max(0, csvText.trim().split(/\r?\n/).length - 1)
    : 0;

  const handleFileRead = async (file: File) => {
    setErrorMessage(null);
    try {
      const content = await file.text();
      if (!content.trim()) {
        setErrorMessage("O arquivo selecionado está vazio.");
        return;
      }
      setFileName(file.name);
      setCsvText(content);
    } catch {
      setErrorMessage("Não foi possível ler o arquivo selecionado.");
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileRead(file);
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFileRead(file);
    }
  };

  const handleSubmit = () => {
    if (!csvText.trim()) {
      setErrorMessage("Selecione um arquivo CSV ou cole o conteúdo abaixo.");
      return;
    }
    onImport(fileName, csvText, hasExistingData ? mode : "replace");
    setCsvText("");
    setErrorMessage(null);
    onClose();
  };

  const handleLoadSample = () => {
    onLoadSyntheticSample();
    setCsvText("");
    setErrorMessage(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-upload-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="csv-upload-title"
              className="text-base font-semibold text-slate-900"
            >
              Importar CSV de Vendas
            </h2>
            <p className="text-xs text-slate-500">
              Colunas esperadas: data, vendedor, cliente, valor, tipo, status, obs
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de importação"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {hasExistingData && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode("append")}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                  mode === "append"
                    ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Layers className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Mesclar novo mês
                  </p>
                  <p className="text-xs text-slate-500">
                    Adiciona à base atual (ex.: Novembro) e checa duplicatas.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("replace")}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                  mode === "replace"
                    ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Substituir base atual
                  </p>
                  <p className="text-xs text-slate-500">
                    Começa uma nova conferência apenas com este CSV.
                  </p>
                </div>
              </button>
            </div>
          )}

          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-slate-300 bg-slate-50/70 hover:border-blue-400 hover:bg-slate-50"
            }`}
          >
            <FileUp className="h-7 w-7 text-blue-600" aria-hidden="true" />
            <span className="mt-2 text-sm font-medium text-slate-800">
              Arraste um arquivo .csv ou clique para selecionar
            </span>
            <span className="mt-1 text-xs text-slate-500">
              Suporta separador vírgula (,) ou ponto-e-vírgula (;) e UTF-8
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label
                htmlFor="csv-paste-input"
                className="text-xs font-medium text-slate-700"
              >
                Ou cole o conteúdo CSV diretamente
              </label>
              {csvText.trim() && (
                <span className="text-xs font-medium text-blue-700">
                  {fileName} · ~{lineEstimate} linha(s) de dados
                </span>
              )}
            </div>
            <textarea
              id="csv-paste-input"
              rows={5}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="data,vendedor,cliente,valor,tipo,status,obs&#10;05/11/2025,Rafa,Empresa Exemplo,24.000,00,nova,fechado,"
              className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          {errorMessage && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-6 py-3.5 rounded-b-2xl">
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
            Carregar amostra demo (Nov–Dez)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Processar CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
