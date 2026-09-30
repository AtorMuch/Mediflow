import React from 'react';
import { PatientData, DocumentMetadata, ClinicalVitals } from '../../types';

interface Screen6DeliveredProps {
  onRestartFlow: () => void;
  onOpenQueueModal: () => void;
  onOpenJsonModal: () => void;
  onOpenPrintModal: () => void;
  patient: PatientData;
  document: DocumentMetadata;
  vitals: ClinicalVitals;
}

export const Screen6Delivered: React.FC<Screen6DeliveredProps> = ({
  onRestartFlow,
  onOpenQueueModal,
  onOpenJsonModal,
  onOpenPrintModal,
  patient,
  document: doc,
  vitals
}) => {
  return (
    <div className="flex-1 p-4 lg:p-6 max-w-[1720px] mx-auto w-full flex flex-col gap-5">
      {/* Top Hero Confirmation Card */}
      <section className="bg-white rounded-2xl border border-[#8ED1A4] shadow-sm p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden">
        {/* Soft background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#adf2c3]/20 via-transparent to-transparent pointer-events-none"></div>

        {/* Big Animated Check Icon */}
        <div className="w-20 h-20 rounded-full bg-[#E1F9F2] border-2 border-[#8ED1A4] flex items-center justify-center text-[#1E5A52] shadow-lg mb-4">
          <span className="material-symbols-outlined text-5xl fill-1 animate-bounce">
            task_alt
          </span>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#adf2c3]/50 text-[#00423b] font-mono font-bold text-xs mb-2 border border-[#8ED1A4]">
          <span className="w-2 h-2 rounded-full bg-[#296a45] animate-ping"></span>
          7. ENTREGADO COMPLETADO CON ÉXITO
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A2F2B] tracking-tight">
          Documento Procesado y Enrutado con Éxito
        </h1>

        <p className="text-sm text-slate-600 max-w-2xl mt-2 leading-relaxed">
          El flujo de triage clínico autónomo para el paciente <strong className="text-slate-900">{patient.anonymizedToken}</strong> ha finalizado. El registro ha sido firmado criptográficamente y distribuido a sus destinos hospitalarios en tiempo real.
        </p>

        {/* SLA Badge Ribbon */}
        <div className="mt-4 flex items-center gap-3 flex-wrap justify-center text-xs font-mono">
          <span className="bg-[#F6FAF8] px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700">
            Tiempo Total de Ciclo: <strong className="text-[#1E5A52]">1m 53s</strong> (SLA Óptimo &lt; 5 min)
          </span>
          <span className="bg-[#F6FAF8] px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700">
            Identificador: <strong className="text-[#1E5A52]">{doc.id}</strong> (UUID {doc.uuid})
          </span>
        </div>
      </section>

      {/* Dual Destination Routing Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Destination 1: Emergency Care Unit */}
        <div className="bg-white rounded-xl border border-red-200 shadow-xs p-6 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#D94545]"></div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-100 text-[#D94545] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">emergency</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
                  Destino Clínico Primario
                </span>
                <h2 className="text-base font-bold text-[#1A2F2B]">
                  Cola_Emergencia_Medica
                </h2>
                <span className="text-xs font-mono font-semibold text-red-800">
                  {patient.assignedBox} (Prioridad 1 RESUS)
                </span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
              CONFIRMADO
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg text-xs space-y-1.5 font-sans border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500">Estado de Recepción:</span>
              <strong className="text-slate-800">Acuse de recibo de enfermería de guardia</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Médico a Cargo:</span>
              <strong className="text-[#1E5A52]">{doc.doctorInCharge} ({doc.doctorReg})</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Latencia de Entrega:</span>
              <strong className="font-mono text-emerald-700">8ms (Socket TLS Seguro)</strong>
            </div>
          </div>
        </div>

        {/* Destination 2: Hospital Pharmacy Pyxis Dispenser */}
        <div className="bg-white rounded-xl border border-emerald-200 shadow-xs p-6 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#296a45]"></div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#296a45] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">medication</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#296a45] uppercase tracking-wider block">
                  Despacho Farmacéutico
                </span>
                <h2 className="text-base font-bold text-[#1A2F2B]">
                  Farmacia_Hospitalaria
                </h2>
                <span className="text-xs font-mono font-semibold text-emerald-800">
                  Dispensador Automatizado Pyxis (#PYX-2041)
                </span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
              DISPENSADO
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg text-xs space-y-1.5 font-sans border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500">Fármaco Validado:</span>
              <strong className="text-slate-800">Apixabán 5 mg (60 comp. recubiertos)</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Posología Confirmada:</span>
              <strong className="text-slate-800">1 comp cada 12 hrs x 7 días (TEP)</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Stock en Box:</span>
              <strong className="font-mono text-emerald-700">Reserva de gaveta asignada</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Immutable Cryptographic Audit Log Card */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1E5A52] text-xl">verified_user</span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#1A2F2B]">
                Bitácora Criptográfica Inmutable (Ledger de Auditoría Clínica)
              </h2>
              <span className="text-xs text-slate-500">Conformidad con Ley 1581 de 2012 / Ley 1751 de 2015 y Estándar HL7 FHIR</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg bg-[#F6FAF8] border border-slate-300 font-mono text-xs font-bold text-[#1E5A52]">
            Bloque Registrado: #948,192
          </span>
        </div>

        {/* Ledger Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#F6FAF8] rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block font-bold">HORA DE INGRESO</span>
            <span className="text-sm font-bold text-slate-800">22:38:12 UTC-3</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Hash SHA-256 Verificado</span>
          </div>

          <div className="p-3 bg-[#F6FAF8] rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block font-bold">HORA DE EGRESO</span>
            <span className="text-sm font-bold text-slate-800">22:40:05 UTC-3</span>
            <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">SLA Cumplido (1m 53s)</span>
          </div>

          <div className="p-3 bg-[#F6FAF8] rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block font-bold">MOTOR DETERMINÍSTICO</span>
            <span className="text-xs font-bold text-[#1E5A52]">MediFlow CO v6.0</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Clinical-BERT-CO-32</span>
          </div>

          <div className="p-3 bg-[#F6FAF8] rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block font-bold">REVISIÓN HUMANA</span>
            <span className="text-xs font-bold text-slate-800">Dra. Valeria Pérez</span>
            <span className="text-[10px] text-[#296a45] font-bold block mt-0.5">Firma PKI Aprobada</span>
          </div>
        </div>

        {/* Cryptographic Signature String */}
        <div className="p-3 rounded-lg bg-slate-900 text-slate-300 font-mono text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">SHA-256:</span>
            <span className="text-slate-300 select-all text-[11px]">
              e4c88f3a992bc0148f98c76da34b8212998a4ff0918b912b7
            </span>
          </div>
          <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-wider bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
            INTEGRIDAD CONFIRMADA
          </span>
        </div>

        {/* Export & Print Functional Actions */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenJsonModal}
              className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-[#1E5A52]">data_object</span>
              <span>Descargar JSON HL7 (FHIR R4)</span>
            </button>

            <button
              onClick={onOpenPrintModal}
              className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-[#1E5A52]">print</span>
              <span>Imprimir Ficha de Derivación</span>
            </button>
          </div>

          <span className="text-xs text-slate-500 font-mono">
            Cert: CERT-CO-TRIAGE-2025-0941
          </span>
        </div>
      </section>

      {/* Bottom CTA Deck */}
      <section className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          onClick={onOpenQueueModal}
          className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#1E5A52] text-[#1E5A52] hover:bg-[#F6FAF8] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">view_timeline</span>
          <span>Ver Monitor de Colas en Tiempo Real</span>
        </button>

        <button
          onClick={onRestartFlow}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1E5A52] hover:bg-[#16443E] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">upload_file</span>
          <span>Cargar Nuevo Documento Clínico</span>
          <span className="material-symbols-outlined text-sm">refresh</span>
        </button>
      </section>
    </div>
  );
};
