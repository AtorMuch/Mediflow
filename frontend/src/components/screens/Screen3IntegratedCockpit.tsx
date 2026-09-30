import React, { useEffect, useState } from 'react';
import { DocumentMetadata, PatientData, ClinicalVitals } from '../../types';

interface Screen3IntegratedCockpitProps {
  onGoToCriticalAlert: () => void;
  onGoToHumanReview: () => void;
  onGoToDelivered: () => void;
  patient: PatientData;
  document: DocumentMetadata;
  vitals: ClinicalVitals;
}

type CtWindow = 'angio' | 'lung' | 'bone';

const WINDOWS: Record<CtWindow, { label: string; osd: string; filter: string }> = {
  angio: { label: 'Angio', osd: 'WL: 100 WW: 700 (Ventana Angio)', filter: 'none' },
  lung: { label: 'Pulmón', osd: 'HU: -600 WW: 1600 (Ventana Pulmonar)', filter: 'brightness(1.3) contrast(1.1)' },
  bone: { label: 'Óseo', osd: 'WL: 400 WW: 1800 (Ventana Ósea)', filter: 'contrast(1.4) brightness(0.9)' }
};

const formatClock = (total: number) => {
  const h = Math.floor(total / 3600).toString().padStart(2, '0');
  const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export const Screen3IntegratedCockpit: React.FC<Screen3IntegratedCockpitProps> = ({
  onGoToCriticalAlert,
  onGoToHumanReview,
  onGoToDelivered,
  patient,
  document: doc,
  vitals
}) => {
  const [sliceIndex, setSliceIndex] = useState(48);
  const [zoom, setZoom] = useState(100);
  const [ctWindow, setCtWindow] = useState<CtWindow>('lung');
  const [remaining, setRemaining] = useState(48 * 60 + 15);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  // Cuenta regresiva del plazo de atención (< 60 min)
  useEffect(() => {
    const t = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const zPos = ((sliceIndex - 96) * 3 + 1.5).toFixed(1);
  const win = WINDOWS[ctWindow];

  return (
    <div className="flex-1 p-4 lg:p-6 max-w-[1500px] mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ============ COLUMNA IZQUIERDA: ingesta + visor + transcripción ============ */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          {/* Dropzone compacta */}
          <label className="bg-white rounded-xl border-2 border-dashed border-[#8ED1A4] p-5 flex flex-col items-center text-center gap-1.5 cursor-pointer hover:bg-[#F6FAF8] transition-colors">
            <span className="material-symbols-outlined text-3xl text-[#1E5A52]">cloud_upload</span>
            <span className="text-sm font-semibold text-[#1A2F2B]">
              Arrastra aquí PDF, imagen de tomografía o receta
            </span>
            <span className="text-[11px] text-slate-500">
              Compatible con DICOM, HL7, PDF y JPEG de alta resolución
            </span>
            <span className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#adf2c3]/40 border border-[#8ED1A4] text-[#1E5A52] text-xs font-bold">
              <span className="material-symbols-outlined text-sm">folder_open</span>
              Explorar Archivos
            </span>
            {uploadedName && <span className="text-[11px] font-mono text-[#296a45]">✓ {uploadedName}</span>}
            <input
              type="file"
              className="hidden"
              onChange={(e) => setUploadedName(e.target.files?.[0]?.name ?? null)}
            />
          </label>

          {/* Visor tomográfico */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 flex items-start justify-between gap-2 border-b border-slate-100">
              <div className="flex items-start gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#F6FAF8] border border-slate-200 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#1E5A52] text-lg">radiology</span>
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#1A2F2B] leading-tight">
                    Tomografía Computarizada de Tórax (AngioTC)
                  </h2>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                    Protocolo TEP • ID Estudio: #TC-99214-X
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <button onClick={() => setZoom((z) => Math.min(200, z + 25))} className="p-1 rounded hover:bg-slate-100" title="Acercar">
                  <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                </button>
                <button onClick={() => setZoom((z) => Math.max(50, z - 25))} className="p-1 rounded hover:bg-slate-100" title="Alejar">
                  <span className="material-symbols-outlined text-[18px]">zoom_out</span>
                </button>
                <button onClick={() => setZoom(100)} className="p-1 rounded hover:bg-slate-100" title="Ajustar">
                  <span className="material-symbols-outlined text-[18px]">fit_screen</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-950 p-3 select-none">
              <div className="relative rounded-md overflow-hidden bg-black flex items-center justify-center h-[210px]">
                <svg
                  viewBox="0 0 400 400"
                  className="h-full aspect-square transition-transform"
                  style={{ transform: `scale(${zoom / 100})`, filter: win.filter }}
                >
                  <ellipse cx="200" cy="200" rx="175" ry="155" fill="#14191d" stroke="#2c3b47" strokeWidth="2" />
                  <ellipse cx="200" cy="200" rx="165" ry="145" fill="#1c2630" stroke="#485c6e" strokeWidth="3" />
                  <path d="M185,320 L215,320 L220,345 L180,345 Z" fill="#b0bec5" stroke="#eceff1" strokeWidth="1.5" />
                  <ellipse cx="200" cy="315" rx="14" ry="10" fill="#cfd8dc" />
                  <path d="M85,150 Q110,120 155,140 Q150,230 110,265 Q75,230 85,150 Z" fill="#0b1013" stroke="#22303c" strokeWidth="2" />
                  <path d="M315,150 Q290,120 245,140 Q250,230 290,265 Q325,230 315,150 Z" fill="#0b1013" stroke="#22303c" strokeWidth="2" />
                  <path d="M160,150 Q200,130 240,150 Q250,250 200,270 Q150,250 160,150 Z" fill="#2a3844" />
                  <circle cx="185" cy="180" r="16" fill="#cfd8dc" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="215" cy="245" r="14" fill="#90a4ae" stroke="#cfd8dc" strokeWidth="1" />
                  <path d="M185,160 Q215,155 220,185 Q190,195 185,160 Z" fill="#e0e0e0" />
                  <path d="M220,180 Q255,190 265,215 Q245,225 215,200 Z" fill="#b0bec5" />
                  <g>
                    <ellipse cx="238" cy="198" rx="11" ry="7" fill="#1c242b" stroke="#D94545" strokeWidth="2" className="animate-pulse" />
                    <circle cx="238" cy="198" r="22" fill="none" stroke="#D94545" strokeWidth="1.5" strokeDasharray="4 2" />
                  </g>
                </svg>
                <div className="absolute top-1.5 left-2 text-[9px] font-mono text-[#8ED1A4] leading-tight">
                  Corte Axial Lóbulo Inferior<br />[Z: {zPos}mm]
                </div>
                <div className="absolute top-1.5 right-2 text-[9px] font-mono text-[#8ED1A4] text-right leading-tight max-w-[45%]">
                  {win.osd}
                </div>
                <div className="absolute bottom-1.5 left-2 text-[9px] font-mono text-slate-400">R (Der)</div>
                <div className="absolute bottom-1.5 right-2 text-[9px] font-mono text-slate-400">L (Izq)</div>
              </div>

              {/* Control de corte y ventana */}
              <div className="mt-2.5 flex items-center gap-3 text-[10px] font-mono text-slate-300">
                <span className="text-slate-400 shrink-0">CORTE</span>
                <input
                  type="range" min="1" max="96" value={sliceIndex}
                  onChange={(e) => setSliceIndex(Number(e.target.value))}
                  className="flex-1 accent-[#8ED1A4] cursor-pointer"
                />
                <span className="w-9 text-right font-bold text-[#8ED1A4]">{sliceIndex}/96</span>
                <div className="flex gap-1">
                  {(Object.keys(WINDOWS) as CtWindow[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setCtWindow(k)}
                      className={`px-1.5 py-0.5 rounded ${ctWindow === k ? 'bg-[#1E5A52] text-white font-bold' : 'bg-slate-800 text-slate-400'}`}
                    >
                      {WINDOWS[k].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mediciones automáticas */}
              <div className="mt-2.5 rounded-md bg-slate-900 border border-slate-800 p-2.5 text-[11px] font-mono space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">Densidad Hounsfield:</span><strong className="text-[#8ED1A4]">+38 HU</strong></div>
                <div className="flex justify-between"><span className="text-slate-400">Oclusión estimada:</span><strong className="text-red-400">~68% Lumen</strong></div>
                <div className="flex justify-between"><span className="text-slate-400">Diámetro VD/VI:</span><strong className="text-amber-300">1.12 (Sobrecarga)</strong></div>
                <div className="flex items-center gap-1 pt-1 text-[10px] text-[#8ED1A4]">
                  <span className="material-symbols-outlined text-[13px]">check_circle</span>
                  Segmentación IA validada
                </div>
              </div>
            </div>

            {/* Transcripción radiológica */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#1A2F2B] uppercase tracking-wide">
                  Transcripción de informe radiológico
                </span>
                <span className="text-[10px] font-mono text-slate-400">Motor OCR Med-V4.2</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>Hallazgos Parenquimatosos:</strong> Campos pulmonares con conservación global de la arquitectura broncovascular. Sin evidencia de consolidaciones alveolares contundentes en ambos lóbulos superiores ni derrame pleural bilateral significativo.
              </p>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  Segmento con Ambigüedad Detectada
                </div>
                <p className="text-xs font-semibold text-slate-800 bg-white/70 rounded px-2 py-1.5 border border-amber-200">
                  “Defecto de repleción arterial segmentaria lóbulo inferior derecho sugerente de tromboembolismo vs artefacto de movimiento respiratorio”
                </p>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Índice de confianza textual: 72%</span>
                  <span className="font-bold text-amber-700">Requiere confirmación médica</span>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>Conclusión Radiológica Preliminar:</strong> Signos sugerentes de tromboembolismo pulmonar derecho. Se sugiere correlación clínica inmediata y determinación analítica de dímero D para estratificación de riesgo hemodinámico y cardiovascular.
              </p>
            </div>

            <div className="px-4 py-2.5 bg-[#F6FAF8] border-t border-slate-100 flex items-center justify-between gap-2 text-[10px]">
              <span className="flex items-center gap-1.5 text-[#296a45] font-medium">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                Datos personales seudonimizados (Token activo: {patient.anonymizedToken.replace(/[\[\]]/g, '')})
              </span>
              <span className="px-2 py-0.5 rounded border border-[#8ED1A4] bg-white font-semibold text-[#1E5A52] text-center leading-tight">
                Ley 1581 de 2012<br />Compliant
              </span>
            </div>
          </div>
        </section>

        {/* ============ COLUMNA DERECHA: alerta + estructuración + validación ============ */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          {/* Alerta crítica */}
          <div className="bg-[#D94545] text-white rounded-xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0 ring-2 ring-white/30">
                <span className="material-symbols-outlined text-2xl">emergency_home</span>
              </div>
              <div>
                <h2 className="font-extrabold text-base leading-tight">
                  ALERTA CRÍTICA: Tromboembolismo Pulmonar (TEP)
                </h2>
                <p className="text-[11px] text-white/90 mt-0.5">
                  Prioridad Nivel 1 • Activación Inmediata de Código de Urgencias
                </p>
              </div>
            </div>
            <div className="flex items-stretch rounded-lg overflow-hidden border border-white/30 bg-[#B93636] text-center shrink-0">
              <div className="px-3 py-1.5 border-r border-white/20">
                <span className="text-[9px] uppercase tracking-wider text-white/70 block">Puntaje</span>
                <strong className="text-sm font-mono">NEWS2: {vitals.news2Score} pts</strong>
              </div>
              <div className="px-3 py-1.5">
                <span className="text-[9px] uppercase tracking-wider text-white/70 block">Plazo de atención</span>
                <strong className="text-sm font-mono">&lt; 60 min</strong>
                <span className="ml-2 px-1.5 py-0.5 rounded bg-white text-[#D94545] text-[10px] font-bold font-mono">
                  Restante: {formatClock(remaining)}
                </span>
              </div>
            </div>
          </div>

          {/* Estructuración clínica */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#1A2F2B] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E5A52]" />
                Estructuración Clínica Automatizada
              </h3>
              <span className="text-[10px] font-mono text-slate-400">FHIR DiagnosticReport r4</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tipo de documento</span>
                <strong className="block text-sm text-[#1A2F2B] mt-1 leading-snug">Informe de Tomografía Axial</strong>
                <span className="text-[10px] text-slate-500">Protocolo Angio-Scan</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Especialidad destino</span>
                <strong className="block text-sm text-[#1E5A52] mt-1 leading-snug">Cardiorrespiratorio</strong>
                <span className="text-[10px] text-slate-500">Urgencia Vascular Periférica</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Confianza del modelo</span>
                  <span className="material-symbols-outlined text-[14px] text-[#296a45]">verified</span>
                </div>
                <strong className="block text-2xl text-[#1E5A52] mt-0.5 font-mono">{doc.confidence}%</strong>
                <span className="text-[10px] text-[#296a45] font-semibold">Alta precisión diagnóstica</span>
              </div>
            </div>

            <div className="rounded-lg bg-[#F6FAF8] border border-slate-200 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#1E5A52] uppercase tracking-wide flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">monitor_heart</span>
                  Signos vitales extraídos de ficha clínica
                </span>
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">Descompensación Aguda</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Frecuencia cardíaca', value: `${vitals.heartRate}`, unit: 'lpm', note: 'Taquicardia sinusal', tone: 'text-red-600' },
                  { label: 'Saturación O2', value: `${vitals.spO2}%`, unit: 'SpO2', note: 'Hipoxemia severa', tone: 'text-red-600' },
                  { label: 'Presión arterial', value: `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}`, unit: 'mmHg', note: 'Hipotensión límite', tone: 'text-amber-600' },
                  { label: 'Frec. respiratoria', value: `${vitals.respiratoryRate}`, unit: 'rpm', note: 'Frecuencia elevada', tone: 'text-red-600' }
                ].map((v) => (
                  <div key={v.label} className="bg-white rounded-lg border border-slate-200 p-2.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase leading-tight block">{v.label}</span>
                    <strong className={`text-2xl font-mono ${v.tone}`}>{v.value}</strong>
                    <span className="text-[10px] text-slate-400 ml-1">{v.unit}</span>
                    <span className={`block text-[10px] font-semibold ${v.tone}`}>{v.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel de validación humana */}
          <div className="bg-[#FFF9EE] rounded-xl border-2 border-[#E8A238]/70 p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-sm text-[#8a5a10] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#E8A238] text-xl">rate_review</span>
                Panel de Validación y Revisión Humana Requerida
              </h3>
              <span className="px-2 py-0.5 rounded bg-[#E8A238]/25 border border-[#E8A238]/60 text-[#8a5a10] text-[10px] font-bold uppercase">
                Acción obligatoria
              </span>
            </div>

            <div className="rounded-lg bg-white border border-amber-200 p-3 flex gap-2.5">
              <span className="material-symbols-outlined text-[#E8A238] text-lg shrink-0">info</span>
              <div className="text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Baja confianza en descarte de artefacto:</strong> Se recomienda correlación con Dímero D (3,400 ng/mL). El algoritmo determinístico detectó marcadores clínicos respiratorios sobre el cuadro basal derecho. La concentración sérica de Dímero D supera ampliamente el umbral clínico (&gt;500 ng/mL), respaldando la derivación a Box de Reanimación.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              <button
                onClick={onGoToDelivered}
                className="sm:col-span-3 py-3 px-4 rounded-lg bg-[#1E5A52] hover:bg-[#16443E] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">task_alt</span>
                Aprobar y Enrutar a Urgencias
              </button>
              <button
                onClick={onGoToHumanReview}
                className="sm:col-span-2 py-3 px-4 rounded-lg bg-white border-2 border-[#E8A238] hover:bg-amber-50 text-[#8a5a10] font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">edit_note</span>
                Corregir Datos
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#adf2c3]/30 border border-[#8ED1A4] px-3 py-2 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-[#1A2F2B]">
                <span className="material-symbols-outlined text-[#296a45] text-base">local_shipping</span>
                Entregado a: <span className="font-mono">Cola_Emergencia_Medica</span> ({patient.assignedBox})
                <span className="material-symbols-outlined text-[#296a45] text-base">check</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">Triage Dispatch Protocol #TX-4481</span>
            </div>
          </div>

          {/* Protocolo sugerido */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-3 text-xs">
            <p className="text-slate-700">
              <strong className="text-[#1E5A52]">Protocolo Sugerido:</strong> Anticoagulación con HBPM según peso / Evaluación para Angio-Intervención hemodinámica.
            </p>
            <button onClick={onGoToCriticalAlert} className="shrink-0 font-bold text-[#1E5A52] hover:underline cursor-pointer">
              Ver Guía Clínica
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
