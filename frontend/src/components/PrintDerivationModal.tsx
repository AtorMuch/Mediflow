import React from 'react';
import { PatientData, DocumentMetadata, ClinicalVitals } from '../types';

interface PrintDerivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientData;
  document: DocumentMetadata;
  vitals: ClinicalVitals;
}

export const PrintDerivationModal: React.FC<PrintDerivationModalProps> = ({
  isOpen,
  onClose,
  patient,
  document: doc,
  vitals
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-3xl rounded-xl border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Controls */}
        <div className="bg-[#1E5A52] text-white px-6 py-3 flex items-center justify-between border-b border-white/10 shrink-0">
          <span className="font-bold text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-[#8ED1A4]">print</span>
            Vista Previa de Impresión: Ficha de Derivación Hospitalaria
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1 bg-[#8ED1A4] hover:bg-[#7bc093] text-[#1E5A52] font-bold text-xs rounded transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-white/70 hover:text-white"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Printable Paper Document */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
          <div className="bg-white p-8 border border-slate-300 shadow-md max-w-2xl mx-auto font-sans text-slate-800 space-y-6">
            {/* Document Header */}
            <div className="border-b-2 border-slate-800 pb-4 flex items-start justify-between">
              <div>
                <h1 className="font-bold text-lg text-slate-900 tracking-tight">HOSPITAL UNIVERSITARIO DE URGENCIAS</h1>
                <p className="text-xs text-slate-600">ESE Red de Urgencias Bogotá D.C. • Nivel III de Complejidad</p>
                <p className="text-xs font-semibold text-emerald-800 mt-1">FICHA DE DERIVACIÓN Y AUDITORÍA DE TRIAJE CLÍNICO</p>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="bg-slate-100 px-2 py-1 rounded border border-slate-300 block font-bold text-slate-800">
                  Folio: CO-99238
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">Cert: CERT-CO-TRIAGE-2025-0941</span>
              </div>
            </div>

            {/* Patient Meta Box */}
            <div className="bg-slate-50 p-4 rounded border border-slate-200 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-bold block text-[10px] uppercase">Paciente Identificado</span>
                <strong className="text-sm text-slate-900">{patient.name}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[10px] uppercase">Cédula de Ciudadanía</span>
                <span className="font-mono font-bold text-slate-900">{patient.cedula}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[10px] uppercase">Edad / Sexo</span>
                <span>{patient.age} años / {patient.gender}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[10px] uppercase">Box Asignado</span>
                <strong className="text-red-700">{patient.assignedBox}</strong>
              </div>
            </div>

            {/* Clinical Triage Assessment */}
            <div className="space-y-3">
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                Evaluación Diagnóstica Determinística
              </h2>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-2 bg-red-50 border border-red-200 rounded">
                  <span className="text-[10px] text-red-700 font-bold block uppercase">Diagnóstico Principal</span>
                  <strong className="text-red-900">TEP Masivo (CIE-10: I26.9)</strong>
                  <span className="text-[10px] text-red-700 block mt-0.5">Prioridad C1 (Inmediata)</span>
                </div>
                <div className="p-2 bg-slate-100 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-600 font-bold block uppercase">Escala NEWS2</span>
                  <strong className="text-slate-900 text-sm">{vitals.news2Score} Puntos</strong>
                  <span className="text-[10px] text-slate-600 block mt-0.5">Riesgo Clínico Extremo</span>
                </div>
                <div className="p-2 bg-slate-100 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-600 font-bold block uppercase">Destino Clínico</span>
                  <strong className="text-slate-900">Urgencia Cardiorrespiratoria</strong>
                  <span className="text-[10px] text-slate-600 block mt-0.5">Hemodinamia / Angiografía</span>
                </div>
              </div>
            </div>

            {/* Vitals Summary */}
            <div className="space-y-2">
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                Signos Vitales al Ingreso
              </h2>
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block">FC</span>
                  <strong className="text-red-600">{vitals.heartRate} lpm</strong>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block">SpO2</span>
                  <strong className="text-red-600">{vitals.spO2}%</strong>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block">Presión Art</span>
                  <strong>{vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic} mmHg</strong>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block">FR</span>
                  <strong className="text-red-600">{vitals.respiratoryRate} rpm</strong>
                </div>
              </div>
            </div>

            {/* Prescribed Pharmacotherapy */}
            <div className="space-y-2">
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                Dispensación Farmacológica Aprobada
              </h2>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs space-y-1">
                <div className="flex justify-between items-center font-bold text-emerald-900">
                  <span>Apixabán 5 mg comprimidos recubiertos</span>
                  <span>ID Pyxis: #PYX-2041</span>
                </div>
                <p className="text-emerald-800">
                  Tomar 1 comp cada 12 horas x 7 días (Esquema de inicio TEP agudo). Dosis validada por auditor médico sin interacciones adversas.
                </p>
              </div>
            </div>

            {/* Signatures and Legal Ledger */}
            <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="h-12 flex items-center justify-center font-serif italic text-slate-700">
                  Dra. Valeria Pérez
                </div>
                <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                  Dra. Valeria Pérez
                </div>
                <span className="text-[10px] text-slate-500 block">Médico de Guardia Urgencias • Reg. RETHUS: #48102</span>
              </div>
              <div>
                <div className="h-12 flex items-center justify-center font-mono text-[10px] text-emerald-700">
                  [SHA-256 Validado: Block #948,192]
                </div>
                <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                  Firma Electrónica Avanzada
                </div>
                <span className="text-[10px] text-slate-500 block">Ley 527 de 1999 / Ley 1581 de 2012</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-semibold text-slate-700 text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
