import React, { useState } from 'react';

interface QueueMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatientDoc?: (docId: string) => void;
}

export const QueueMonitorModal: React.FC<QueueMonitorModalProps> = ({
  isOpen,
  onClose,
  onSelectPatientDoc
}) => {
  const [filter, setFilter] = useState<'ALL' | 'C1' | 'C2' | 'C3'>('ALL');

  if (!isOpen) return null;

  const queueItems = [
    {
      id: 'DOC-8492',
      patient: 'Mendoza Lagos, Carlos',
      cedula: '79.845.109',
      age: 52,
      triageLevel: 'C1',
      category: 'Reanimación / Shock Trauma',
      chiefComplaint: 'Sospecha TEP Masivo / Disnea súbita',
      vitals: 'FC 118 | SpO2 89% | PA 90/60',
      news2: 8,
      assignedBox: 'Box Reanimación 01',
      waitMinutes: 0,
      slaStatus: 'En Atención Inmediata',
      status: 'ACTIVO_EN_CURSO'
    },
    {
      id: 'DOC-8491',
      patient: 'Soto Araya, Elena',
      cedula: '52.321.904',
      age: 44,
      triageLevel: 'C1',
      category: 'Politraumatismo Línea 123',
      chiefComplaint: 'Fractura inestable pelvis / Hemodinámico',
      vitals: 'FC 124 | SpO2 93% | PA 85/55',
      news2: 7,
      assignedBox: 'Box Reanimación 02 (Reservado)',
      waitMinutes: 4,
      slaStatus: 'Ambulancia en Rampa',
      status: 'EN_RUTA'
    },
    {
      id: 'DOC-8490',
      patient: 'Carrasco Vera, Jorge',
      cedula: '80.441.512',
      age: 63,
      triageLevel: 'C2',
      category: 'Emergencia Cardiovascular',
      chiefComplaint: 'Dolor precordial opresivo con irradiación',
      vitals: 'FC 92 | SpO2 96% | PA 145/95',
      news2: 4,
      assignedBox: 'Box A-04 (Evaluación)',
      waitMinutes: 9,
      slaStatus: 'Tiempo restante: 21 min',
      status: 'EN_ESPERA'
    },
    {
      id: 'DOC-8488',
      patient: 'Rojas Peña, Manuel',
      cedula: '1.018.902.122',
      age: 28,
      triageLevel: 'C3',
      category: 'Urgencia Respiratoria',
      chiefComplaint: 'Crisis asmática moderada refractaria',
      vitals: 'FC 98 | SpO2 94% | PA 120/80',
      news2: 2,
      assignedBox: 'Sala Nebulizaciones B',
      waitMinutes: 24,
      slaStatus: 'Tiempo restante: 36 min',
      status: 'EN_ESPERA'
    }
  ];

  const filteredItems = filter === 'ALL' 
    ? queueItems 
    : queueItems.filter(item => item.triageLevel === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-xl border border-[#1E5A52]/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#1E5A52] text-white px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10 text-[#8ED1A4]">
              <span className="material-symbols-outlined text-2xl">dashboard</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-white">Monitor Maestro de Colas de Urgencia en Tiempo Real</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#8ED1A4]/25 text-[#8ED1A4] border border-[#8ED1A4]/40">
                  RED SND ACTIVA
                </span>
              </div>
              <p className="text-xs text-white/70">
                Hospital de Urgencias • Red de Derivación Nivel 1 • Sincronización HL7 FHIR Live
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#F6FAF8] border-b border-[#1E5A52]/10 text-xs shrink-0">
          <div className="p-2.5 rounded-lg bg-white border border-red-200">
            <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider block">C1 Reanimación</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-[#D94545] font-mono">2 Pacientes</span>
              <span className="text-[10px] text-red-600 font-medium">SLA: 0 min</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-amber-200">
            <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">C2 Emergencia</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-[#E8A238] font-mono">1 Paciente</span>
              <span className="text-[10px] text-amber-700 font-medium">&lt; 30 min</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-[#1E5A52]/20">
            <span className="text-[10px] text-[#1E5A52] font-bold uppercase tracking-wider block">Boxes Shock Trauma</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-[#1E5A52] font-mono">1/2 Ocupados</span>
              <span className="text-[10px] text-emerald-700 font-medium">50% Disp.</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Tiempo Medio Triage</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-slate-800 font-mono">1m 42s</span>
              <span className="text-[10px] text-emerald-700 font-medium">SLA Óptimo</span>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filtrar por Severidad:</span>
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                filter === 'ALL'
                  ? 'bg-[#1E5A52] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos (4)
            </button>
            <button
              onClick={() => setFilter('C1')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                filter === 'C1'
                  ? 'bg-[#D94545] text-white shadow-sm'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              C1 Reanimación (2)
            </button>
            <button
              onClick={() => setFilter('C2')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                filter === 'C2'
                  ? 'bg-[#E8A238] text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              C2 Emergencia (1)
            </button>
            <button
              onClick={() => setFilter('C3')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                filter === 'C3'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              C3 Urgencia (1)
            </button>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Actualizado cada 5s</span>
        </div>

        {/* Queue Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                item.triageLevel === 'C1'
                  ? 'border-red-300 bg-red-50/40 hover:bg-red-50/70 border-l-4 border-l-[#D94545]'
                  : item.triageLevel === 'C2'
                  ? 'border-amber-300 bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-l-[#E8A238]'
                  : 'border-slate-200 bg-white hover:bg-slate-50 border-l-4 border-l-slate-400'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono text-white ${
                    item.triageLevel === 'C1' ? 'bg-[#D94545]' : item.triageLevel === 'C2' ? 'bg-[#E8A238]' : 'bg-slate-600'
                  }`}>
                    {item.triageLevel}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#1E5A52] bg-white px-2 py-0.5 rounded border border-slate-200">
                    {item.id}
                  </span>
                  <span className="font-bold text-sm text-[#1A2F2B]">
                    {item.patient} ({item.age} años)
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    C.C. {item.cedula}
                  </span>
                </div>

                <p className="text-xs text-[#1A2F2B] font-medium">
                  <strong>Motivo:</strong> {item.chiefComplaint}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono flex-wrap">
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-[#1E5A52] font-semibold">
                    {item.vitals}
                  </span>
                  <span className="text-red-700 font-bold">
                    NEWS2: {item.news2} pts
                  </span>
                  <span>•</span>
                  <span className="text-slate-700 font-semibold">
                    📍 {item.assignedBox}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                <div className="text-right mr-2 hidden sm:block">
                  <span className="text-xs font-semibold text-emerald-800 block">
                    {item.slaStatus}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Espera: {item.waitMinutes} min
                  </span>
                </div>
                {onSelectPatientDoc && (
                  <button
                    onClick={() => {
                      onSelectPatientDoc(item.id);
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#1E5A52] hover:bg-[#16443E] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>Cargar en Cockpit</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#F6FAF8] border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Triage Res. 5596/2015 MinSalud Sincronizado</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-semibold text-slate-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
