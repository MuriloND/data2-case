"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";

interface WhatsAppPreviewModalProps {
  isOpen: boolean;
  content: string;
  onClose: () => void;
  onCopy: (text: string) => Promise<boolean>;
}

export function WhatsAppPreviewModal({
  isOpen,
  content,
  onClose,
  onCopy,
}: WhatsAppPreviewModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleCopy = async () => {
    const ok = await onCopy(content);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsapp-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2
              id="whatsapp-preview-title"
              className="text-base font-semibold text-slate-900"
            >
              Prévia do Extrato para WhatsApp
            </h2>
            <p className="text-xs text-slate-500">
              Texto pronto para colar diretamente na conversa com o vendedor.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar prévia do WhatsApp"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
          <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 font-mono text-xs leading-relaxed text-slate-800">
            {content}
          </pre>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copiar texto
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
