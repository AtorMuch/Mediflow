import React, { useState, useEffect } from 'react';
import { PatientData, DocumentMetadata } from '../../types';

interface Screen5HumanReviewProps {
  onConfirmAndResolve: () => void;
  onRejectDocument: () => void;
  patient: PatientData;
  document: DocumentMetadata;
}

export const Screen5HumanReview: React.FC<Screen5HumanReviewProps> = ({
  onConfirmAndResolve,
  onRejectDocument,
  patient,
  document: doc
}) => {
  const [selectedDose, setSelectedDose] = useState<'5mg' | '2.5mg' | '0.5mg'>('5mg');
  const [elapsedSeconds, setElapsedSeconds] = useState(4);
  const [loupeZoom, setLoupeZoom] = useState(185);
  const [invertContrast, setInvertContrast] = useState(false);
  const [loupePosition, setLoupePosition] = useState({ x: 52, y: 46 });

  // Elapsed time counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut support: Space to approve, Esc to reject
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        onConfirmAndResolve();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onRejectDocument();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onConfirmAndResolve, onRejectDocument]);

  return (
    <div className="flex-1 p-4 lg:p-6 max-w-[1720px] mx-auto w-full flex flex-col gap-4">
      {/* Top Station Header */}
      <section className="bg-white rounded-xl border border-[#E8A238]/40 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-300 flex items-center justify-center text-[#E8A238] shrink-0">
            <span className="material-symbols-outlined text-2xl">rate_review</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-[#1A2F2B]">
                Estación de Revisión Humana (2do Médico / Auditor Clínico)
              </h1>
              <span className="font-mono text-xs font-bold text-[#1E5A52] bg-[#F6FAF8] px-2 py-0.5 rounded border border-[#1E5A52]/20">
                {doc.id}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                PRIORIDAD: ALTA (FÁRMACO DOAC)
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Protocolo de validación visual asistida para prescripción médica con ambigüedad caligráfica.
            </p>
          </div>
        </div>

        {/* Live Elapsed Time Tracker */}
        <div className="flex items-center gap-3 self-end md:self-auto shrink-0 font-mono text-xs">
          <div className="bg-[#F6FAF8] px-3 py-1.5 rounded-lg border border-slate-200 text-right">
            <span className="text-[10px] text-slate-500 block">Tiempo en Revisión</span>
            <span className="font-bold text-[#1E5A52]">
              00:{elapsedSeconds.toString().padStart(2, '0')}s{' '}
              <span className="text-[10px] text-emerald-700 font-normal">(&lt; 10s meta)</span>
            </span>
          </div>
        </div>
      </section>

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start flex-1">
        {/* Left Column (6 cols): TIFF Scan Viewer with 185% Optical Loupe */}
        <section className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-[#F6FAF8] border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1E5A52] text-lg">search</span>
              <h2 className="text-xs font-bold text-[#1A2F2B] uppercase tracking-wider">
                Receta Médica Manuscrita (Escaneo TIFF 600 DPI)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInvertContrast(!invertContrast)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  invertContrast ? 'bg-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-700'
                }`}
              >
                Invertir Contraste
              </button>
              <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-[#1E5A52] font-bold">
                Lupa: {loupeZoom}%
              </span>
            </div>
          </div>

          {/* Interactive Document with Loupe Canvas */}
          <div className={`p-4 bg-slate-100 flex flex-col items-center justify-center relative select-none min-h-[440px] ${
            invertContrast ? 'invert' : ''
          }`}>
            {/* Prescription sheet mock */}
            <div className="w-full max-w-md bg-amber-50/60 p-6 rounded-lg border border-amber-200/80 shadow-md font-serif text-slate-800 relative">
              {/* Doctor letterhead */}
              <div className="border-b border-slate-400/50 pb-2 mb-4 text-center">
                <p className="font-bold text-xs uppercase tracking-wide text-slate-900">Dr. Roberto Silva Santander</p>
                <p className="text-[10px] text-slate-600 font-sans">Especialista en Medicina de Urgencia • Reg. RETHUS 48102</p>
              </div>

              {/* Patient data lines */}
              <div className="text-xs space-y-1 mb-4 font-sans">
                <p><strong>Paciente:</strong> {patient.name}</p>
                <p><strong>C.C.:</strong> {patient.cedula} &nbsp;|&nbsp; <strong>Fecha:</strong> 17-10-2024</p>
              </div>

              {/* Handwritten Prescription Simulation */}
              <div className="space-y-4 my-6 text-sm italic font-serif leading-relaxed text-slate-900">
                <p className="text-base font-bold not-italic">Rp./</p>
                
                {/* The ambiguous prescription line */}
                <div className="p-3 bg-white/70 rounded border border-amber-300/80 relative">
                  <div className="text-base font-semibold tracking-wide text-slate-900">
                    1. Apixabán <span className="underline decoration-wavy decoration-amber-500 font-bold bg-amber-100/70 px-1">5 ? mg</span> comp.
                  </div>
                  <div className="text-xs text-slate-700 mt-1 not-italic font-sans">
                    Tomar 1 comp. cada 12 horas por 7 días (Esquema inicial TEP/TVP).
                  </div>
                </div>

                <div className="p-2 text-xs not-italic font-sans text-slate-600">
                  2. Paracetamol 1g cada 8 hrs SOS dolor torácico.
                </div>
              </div>

              {/* Doctor signature scribble simulation */}
              <div className="mt-8 pt-2 border-t border-slate-300 flex justify-between items-end">
                <div className="w-32 h-10 border-b border-slate-700 relative">
                  <span className="absolute bottom-1 left-2 font-serif italic text-xs text-slate-800">R. Silva S.</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500 font-sans">Firma y Timbre</span>
              </div>

              {/* Optical Loupe Glass Widget */}
              <div
                style={{ top: `${loupePosition.y}%`, left: `${loupePosition.x}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full border-4 border-[#E8A238] shadow-2xl bg-white overflow-hidden pointer-events-none z-20 ring-4 ring-black/10"
              >
                {/* Crosshairs inside the lens */}
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <div className="w-full h-[1px] bg-red-600"></div>
                  <div className="h-full w-[1px] bg-red-600 absolute"></div>
                </div>

                {/* Magnified zoom content */}
                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-amber-50/90 font-serif">
                  <span className="text-[9px] font-sans font-bold text-[#E8A238] uppercase tracking-wider block mb-1">
                    Lupa Óptica 185%
                  </span>
                  <div className="text-2xl font-bold tracking-wider text-slate-950 scale-125">
                    "5 mg"
                  </div>
                  <span className="text-[10px] font-sans text-emerald-800 font-semibold mt-1">
                    Trazo vertical compatible con '5'
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Optical Loupe Controls Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-mono">
            <div className="flex items-center gap-2">
              <span>Zoom Lupa:</span>
              <input
                type="range"
                min="120"
                max="250"
                value={loupeZoom}
                onChange={(e) => setLoupeZoom(Number(e.target.value))}
                className="w-24 accent-[#E8A238] cursor-pointer"
              />
              <span className="font-bold text-[#1A2F2B]">{loupeZoom}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLoupePosition({ x: 52, y: 46 })}
                className="px-2 py-1 bg-white hover:bg-slate-100 rounded border border-slate-300 text-slate-700 text-[11px] font-semibold"
              >
                Centrar en Dosis
              </button>
            </div>
          </div>
        </section>

        {/* Right Column (6 cols): Clinical Discrepancy Form & Dose Confirmation */}
        <section className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
          {/* Card Header */}
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-[#1A2F2B]">
              Formulario de Validación Clínica y Consistencia Posológica
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Confirmación por segundo médico para fármaco de alto riesgo anticoagulante.
            </p>
          </div>

          {/* Validation Fields Matrix */}
          <div className="space-y-3.5 text-xs">
            {/* Field 1: Patient Identity */}
            <div className="p-3 rounded-lg bg-[#F6FAF8] border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Paciente Validado</span>
                <span className="text-[#296a45] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  RNPI Coincidente
                </span>
              </div>
              <p className="font-bold text-sm text-[#1A2F2B] mt-1">{patient.name}</p>
              <p className="text-slate-600 font-mono text-[11px] mt-0.5">
                C.C. {patient.cedula} • 52 años • EPS Sura • Régimen Contributivo
              </p>
            </div>

            {/* Field 2: Diagnostic Consistency */}
            <div className="p-3 rounded-lg bg-[#F6FAF8] border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Diagnóstico Clínico Principal</span>
                <span className="text-[#296a45] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Consistente con AngioTC
                </span>
              </div>
              <p className="font-bold text-sm text-[#1A2F2B] mt-1">
                Tromboembolismo Pulmonar Agudo (CIE-10: I26.9)
              </p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Requiere anticoagulación terapéutica inmediata según Guías de Práctica Clínica del MinSalud.
              </p>
            </div>

            {/* Field 3: Flagged Discrepancy & Interactive Dose Resolution */}
            <div className="p-4 rounded-xl bg-amber-50/70 border-2 border-[#E8A238] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#E8A238] text-lg">warning</span>
                  <span className="font-bold text-xs text-amber-900 uppercase tracking-wide">
                    Resolución de Ambigüedad Caligráfica: Fármaco Apixabán
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8A238] text-white">
                  ACCIÓN REQUERIDA
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-normal">
                El trazo manuscrito presenta dudas entre <strong>5 mg</strong> o <strong>0.5 mg</strong>. Seleccione la posología farmacológicamente válida:
              </p>

              {/* Three Option Dose Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedDose('5mg')}
                  className={`p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${
                    selectedDose === '5mg'
                      ? 'border-[#1E5A52] bg-white ring-2 ring-[#1E5A52]/20 shadow-sm'
                      : 'border-slate-300 bg-white/70 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-base font-bold text-[#1E5A52]">5 mg</strong>
                    {selectedDose === '5mg' && <span className="text-[#1E5A52] font-bold text-sm">✓</span>}
                  </div>
                  <span className="text-[10px] text-emerald-800 font-semibold block mt-1">
                    Dosis Habitual TEP
                  </span>
                  <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">
                    10 mg/día (5mg c/12h)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDose('2.5mg')}
                  className={`p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${
                    selectedDose === '2.5mg'
                      ? 'border-[#1E5A52] bg-white ring-2 ring-[#1E5A52]/20 shadow-sm'
                      : 'border-slate-300 bg-white/70 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-base font-bold text-slate-800">2.5 mg</strong>
                    {selectedDose === '2.5mg' && <span className="text-[#1E5A52] font-bold text-sm">✓</span>}
                  </div>
                  <span className="text-[10px] text-slate-700 font-semibold block mt-1">
                    Ajuste Renal
                  </span>
                  <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">
                    Clearance &lt; 30 ml/min
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDose('0.5mg')}
                  className={`p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${
                    selectedDose === '0.5mg'
                      ? 'border-red-600 bg-red-50 ring-2 ring-red-300'
                      : 'border-slate-300 bg-white/70 hover:bg-white opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-base font-bold text-red-700">0.5 mg</strong>
                    {selectedDose === '0.5mg' && <span className="text-red-700 font-bold text-sm">✕</span>}
                  </div>
                  <span className="text-[10px] text-red-600 font-semibold block mt-1">
                    No Comercial
                  </span>
                  <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">
                    Dosis Inválida en Colombia
                  </span>
                </button>
              </div>

              {selectedDose === '5mg' && (
                <div className="text-[11px] text-emerald-800 bg-emerald-100/60 p-2 rounded border border-emerald-300 font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-700">check_circle</span>
                  Dosis de 5 mg confirmada: Coherente con esquema de inducción para TEP agudo.
                </div>
              )}
            </div>
          </div>

          {/* Keyboard Shortcuts Deck & Primary Actions */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <span>Atajos de Teclado Rápidos:</span>
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-300 shadow-2xs font-bold text-slate-800">[Espacio]</kbd>{' '}
                  Aprobar
                </span>
                <span>
                  <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-300 shadow-2xs font-bold text-slate-800">[Esc]</kbd>{' '}
                  Rechazar
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onRejectDocument}
                className="py-2.5 px-4 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Rechazar Documento
              </button>

              <button
                type="button"
                onClick={onConfirmAndResolve}
                className="flex-1 py-3 px-6 rounded-lg bg-[#1E5A52] hover:bg-[#16443E] active:scale-[0.99] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">verified</span>
                <span>Confirmar Corrección (Pasa a RESUELTO)</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
