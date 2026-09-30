import React, { useState } from 'react';
import { FHIR_BUNDLE_SAMPLE } from '../data/mockData';

interface HL7JsonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HL7JsonModal: React.FC<HL7JsonModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(FHIR_BUNDLE_SAMPLE, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HL7_FHIR_DOC-8492_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-xl border border-[#1E5A52]/20 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#1E5A52] text-white px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-2xl text-[#8ED1A4]">data_object</span>
            <div>
              <h3 className="font-bold text-base text-white">Recurso HL7 FHIR r4 Sincronizado</h3>
              <p className="text-xs text-[#8ED1A4] font-mono">Bundle/comp-triage-8492 • Ley 1581 de 2012 Compliant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Action bar */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-mono shrink-0">
          <span className="text-slate-600">Formato: JSON Schema FHIR 4.0.1</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">
                {copied ? 'done' : 'content_copy'}
              </span>
              <span>{copied ? 'Copiado al portapapeles' : 'Copiar JSON'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-md bg-[#1E5A52] text-white hover:bg-[#16443E] font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>Descargar Archivo .json</span>
            </button>
          </div>
        </div>

        {/* JSON Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900 text-emerald-400 font-mono text-xs leading-relaxed custom-scrollbar">
          <pre>{jsonString}</pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Firma Digital SHA-256 Validada en Ledger Local #948,192</span>
          <button
            onClick={onClose}
            className="px-4 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
