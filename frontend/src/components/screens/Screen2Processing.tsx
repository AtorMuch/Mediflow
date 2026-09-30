import React, { useState } from 'react';
import { DocumentMetadata, ClinicalVitals } from '../../types';

interface Screen2ProcessingProps {
  onAdvanceToCockpit: () => void;
  document: DocumentMetadata;
  vitals: ClinicalVitals;
}

export const Screen2Processing: React.FC<Screen2ProcessingProps> = ({
  onAdvanceToCockpit,
  document: doc,
  vitals
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [retryCount, setRetryCount] = useState(1);

  return (
    <div className="flex-1 p-4 lg:p-6 max-w-[1720px] mx-auto w-full flex flex-col gap-4">
      {/* Top Status Control Banner */}
      <section className="bg-white rounded-lg border border-[#1E5A52]/15 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#E1F9F2] border border-[#1E5A52]/20 flex items-center justify-center text-[#1E5A52] shrink-0">
            <span className="material-symbols-outlined text-2xl animate-pulse">neurology</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-[#1A2F2B]">
                Procesamiento Clínico Autónomo en Curso
              </h1>
              <span className="font-mono text-xs font-bold text-[#1E5A52] bg-[#DBF3ED] px-2 py-0.5 rounded border border-[#1E5A52]/20">
                {doc.id}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#adf2c3]/40 text-[#2f704b] border border-[#8ED1A4]">
                <span className="w-2 h-2 rounded-full bg-[#296a45] animate-ping"></span>
                Fase 2 de 5: Extracción Activa
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Pipeline de inferencia determinística HL7 FHIR v4.0.1 con anonimización legal Ley 1581 de 2012 / Ley 1751 de 2015
            </p>
          </div>
        </div>

        {/* Live metrics and progress cluster */}
        <div className="flex items-center gap-5 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6 shrink-0">
          <div className="flex flex-col min-w-[200px]">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-600 font-semibold">Progreso Global</span>
              <span className="font-mono font-bold text-[#1E5A52]">72%</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden p-[1px]">
              <div 
                className="bg-[#1E5A52] h-full rounded-full transition-all duration-500 relative" 
                style={{ width: isPaused ? '72%' : '72%' }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
              <span className="material-symbols-outlined text-[13px] text-[#296a45]">speed</span>
              Motor OCR &amp; NLP Vitals: <strong>1.2s</strong>
            </span>
          </div>

          <div className="hidden xl:flex flex-col text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Latencia Pipeline</span>
            <span className="font-mono font-semibold text-xs text-[#1A2F2B]">14ms FHIR Gateway</span>
          </div>
        </div>
      </section>

      {/* MAIN 2-COLUMN CLINICAL SPLIT VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
        {/* LEFT COLUMN: Scanned Document Preview with Anonymization Layer (5 Cols) */}
        <section className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-white rounded-lg border border-[#1E5A52]/15 shadow-xs overflow-hidden flex flex-col">
            {/* Card Header */}
            <div className="px-4 py-2.5 bg-[#F6FAF8] border-b border-[#1E5A52]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1E5A52] text-lg">document_scanner</span>
                <h2 className="text-xs font-bold text-[#1A2F2B] uppercase tracking-wider">
                  Vista Previa del Documento Fuente
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                {zoomLevel}% DPI Direct Feed
              </span>
            </div>

            {/* Active Anonymization Shield Badge */}
            <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-[#E1F9F2] border border-[#8ED1A4]/50 flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#1E5A52] text-base shrink-0">lock</span>
              <div className="text-xs leading-tight">
                <span className="font-semibold text-[#00423b]">Datos Sensibles Seudonimizados:</span>
                <span className="font-mono font-medium text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-300 ml-1">
                  [PACIENTE_1], 52 años, C.C.: **.***.109
                </span>
              </div>
            </div>

            {/* Document Canvas with Visual Bounding Boxes & Simulated Scan */}
            <div className="p-4 relative">
              <div 
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className="relative bg-white border border-slate-300 rounded-lg p-5 shadow-inner min-h-[500px] font-mono text-[11px] leading-relaxed text-[#1A2F2B] select-none overflow-hidden transition-transform duration-150"
              >
                {/* Real-time Cyan/Mint Scan Line Effect */}
                {!isPaused && (
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#8ED1A4] to-transparent animate-scan-line z-30 pointer-events-none shadow-[0_0_8px_#8ED1A4]"></div>
                )}

                {/* Watermark Stamp */}
                <div className="absolute right-4 top-4 border-2 border-emerald-700/30 text-emerald-800/40 font-bold text-[10px] uppercase px-2 py-0.5 rotate-12 rounded pointer-events-none tracking-widest">
                  VERIFICADO ADRES / BDUA
                </div>

                {/* Header of Clinical Document */}
                <div className="border-b border-dashed border-slate-300 pb-2 mb-3 flex justify-between items-start">
                  <div>
                    <p className="font-bold text-[11px] text-slate-800">HOSPITAL UNIVERSITARIO DE URGENCIAS</p>
                    <p className="text-slate-500 text-[9px]">DEPARTAMENTO DE IMAGENOLOGÍA &amp; DIAGNÓSTICO AGUDO</p>
                  </div>
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-[#1E5A52] font-semibold">
                    Folio: CO-99238
                  </span>
                </div>

                {/* Bounding Box 1: Document Type (Teal Frame) */}
                <div className="relative my-2.5 p-2 rounded bg-emerald-50/70 border-2 border-[#296a45] shadow-xs">
                  <span className="absolute -top-2.5 left-2 bg-[#296a45] text-white text-[9px] px-1.5 py-0.2 rounded font-sans font-semibold tracking-wider uppercase">
                    Campo Identificado: DOC_TYPE (99.4%)
                  </span>
                  <p className="font-bold text-[#00423b] text-xs">
                    INFORME DE TOMOGRAFÍA AXIAL COMPUTARIZADA DE TÓRAX (ANGIOTC)
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Protocolo: Sospecha de Tromboembolismo Pulmonar Agudo (TEP)
                  </p>
                </div>

                {/* Bounding Box 2: Patient Data Anonymized */}
                <div className="my-2.5 p-2 rounded border border-dashed border-[#1E5A52]/40 bg-[#F6FAF8]">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-500">Paciente:</span>
                      <span className="bg-slate-800 text-white px-1.5 py-0.2 rounded tracking-widest ml-1">[PACIENTE_1]</span>
                    </div>
                    <div>
                      <span className="text-slate-500">C.C.:</span>
                      <span className="bg-slate-800 text-white px-1.5 py-0.2 rounded tracking-widest ml-1">**.***.109</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Edad / Sexo:</span>
                      <span className="font-bold ml-1">52 años / Femenino</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Fecha Ingest:</span>
                      <span className="ml-1">17-10-2024 03:42 hrs</span>
                    </div>
                  </div>
                </div>

                {/* Clinical Narrative with In-text Entity Tokens */}
                <div className="space-y-2 mt-3 text-[11px] text-slate-800 font-sans">
                  <p className="leading-normal">
                    <strong>MOTIVO DE CONSULTA / HISTORIA:</strong> Paciente femenina consulta por disnea súbita de reposo asociada a dolor torácico pleurítico derecho de 3 horas de evolución.
                  </p>

                  {/* Bounding Box 3: Vitals Matrix Captured */}
                  <div className="relative p-2.5 rounded bg-emerald-50/50 border-2 border-[#8ED1A4] my-2">
                    <span className="absolute -top-2.5 left-2 bg-[#1E5A52] text-white text-[9px] px-1.5 py-0.2 rounded font-sans font-semibold tracking-wider uppercase">
                      OCR Captura Signos Vitales (Confidence: 98.8%)
                    </span>
                    <div className="grid grid-cols-3 gap-2 mt-1 font-mono text-[11px]">
                      <div className="bg-white p-1 rounded border border-red-200">
                        <span className="text-slate-500 block text-[9px]">FC INGRESO:</span>
                        <strong className="text-red-700">{vitals.heartRate} lpm</strong>
                      </div>
                      <div className="bg-white p-1 rounded border border-red-200">
                        <span className="text-slate-500 block text-[9px]">SATURACIÓN:</span>
                        <strong className="text-red-700">{vitals.spO2}% SpO2</strong>
                      </div>
                      <div className="bg-white p-1 rounded border border-amber-200">
                        <span className="text-slate-500 block text-[9px]">PRESIÓN (PA):</span>
                        <strong className="text-[#1E5A52]">{vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic} mmHg</strong>
                      </div>
                    </div>
                  </div>

                  <p className="leading-normal">
                    <strong>HALLAZGOS ANGIOTORÁCICOS:</strong> Defecto de llene endoluminal extenso en arteria pulmonar principal derecha con extensión a ramas lobares superior e inferior. Signos incipientes de sobrecarga ventricular derecha con relación VD/VI &gt; 1.0.
                  </p>

                  {/* Dynamic Bounding Box: Diagnostic Extraction */}
                  <div className="relative p-2 rounded border border-dashed border-[#296a45] bg-[#8ED1A4]/15">
                    <span className="text-[9px] text-[#296a45] font-bold font-mono uppercase block mb-0.5">
                      Detectando Sintaxis Diagnóstica...
                    </span>
                    <p className="italic text-[#1A2F2B] font-semibold text-xs">
                      "Compatible con Tromboembolismo Pulmonar masivo de alto riesgo clínico-hemodinámico."
                    </p>
                  </div>
                </div>

                {/* Document Footer Stamp */}
                <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Firma Digital Avanzada: Dr. R. Silva — Reg. RETHUS: #48102</span>
                  <span className="flex items-center gap-1 text-[#296a45] font-semibold">
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                    SHA-256 Validado
                  </span>
                </div>
              </div>

              {/* Floating Document Control Widget */}
              <div className="absolute bottom-6 right-6 flex items-center gap-1 bg-white/95 backdrop-blur shadow-md border border-slate-300 rounded-lg p-1 z-20">
                <button 
                  onClick={() => setZoomLevel(prev => Math.min(prev + 15, 145))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors" 
                  title="Zoom In"
                >
                  <span className="material-symbols-outlined text-base">zoom_in</span>
                </button>
                <button 
                  onClick={() => setZoomLevel(prev => Math.max(prev - 15, 80))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors" 
                  title="Zoom Out"
                >
                  <span className="material-symbols-outlined text-base">zoom_out</span>
                </button>
                <div className="h-4 w-[1px] bg-slate-200 mx-0.5"></div>
                <button 
                  onClick={() => setZoomLevel(100)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors" 
                  title="Pantalla Completa"
                >
                  <span className="material-symbols-outlined text-base">fullscreen</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Live Extraction Skeleton & Deterministic HL7 FHIR Matrix (7 Cols) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white rounded-lg border border-[#1E5A52]/15 shadow-xs flex flex-col p-5">
            {/* Card Header & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-200 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#1E5A52] text-xl">dataset</span>
                  <h2 className="text-base font-bold text-[#1A2F2B]">
                    Extracción Determinística de Entidades Clínicas
                  </h2>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Mapeo estándar: <code className="font-mono text-xs bg-[#E1F9F2] px-1.5 py-0.5 rounded text-[#1E5A52] font-semibold">HL7 FHIR DiagnosticReport / Observation</code>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E1F9F2] text-[#1E5A52] border border-[#8ED1A4]">
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  Inferencia NPU Activa
                </span>
              </div>
            </div>

            {/* Extraction Rows Matrix */}
            <div className="mt-4 space-y-3">
              {/* Item 1: Tipo de Documento */}
              <div className="p-3.5 rounded-lg bg-[#F6FAF8] border border-slate-200 hover:border-[#1E5A52]/30 transition-all flex items-start justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#adf2c3]/40 text-[#2f704b] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-base">description</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entidad Primaria</span>
                      <span className="font-mono text-[10px] text-slate-400">LOINC: 24627-2</span>
                    </div>
                    <p className="text-xs font-bold text-[#1A2F2B] mt-0.5">Tipo de Documento</p>
                    <p className="text-xs text-[#00423b] font-medium mt-0.5">
                      Informe de Tomografía Axial Computarizada de Tórax (AngioTC)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#adf2c3]/40 text-[#00210f] border border-[#8ED1A4] shrink-0">
                  <span className="material-symbols-outlined text-xs font-bold">check</span>
                  <span className="text-[11px] font-bold font-mono">100%</span>
                </div>
              </div>

              {/* Item 2: Especialidad Receptora */}
              <div className="p-3.5 rounded-lg bg-[#F6FAF8] border border-slate-200 hover:border-[#1E5A52]/30 transition-all flex items-start justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#adf2c3]/40 text-[#2f704b] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-base">emergency</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Servicio Clínico</span>
                      <span className="font-mono text-[10px] text-slate-400">DEIS Servicio Salud</span>
                    </div>
                    <p className="text-xs font-bold text-[#1A2F2B] mt-0.5">Especialidad Receptora</p>
                    <p className="text-xs text-[#00423b] font-medium mt-0.5">
                      Urgencias Cardiorrespiratorias (Reanimación Adultos)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#adf2c3]/40 text-[#00210f] border border-[#8ED1A4] shrink-0">
                  <span className="material-symbols-outlined text-xs font-bold">check</span>
                  <span className="text-[11px] font-bold font-mono">100%</span>
                </div>
              </div>

              {/* Vitals HUD Trio Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {/* Item 3: Frecuencia Cardíaca */}
                <div className="p-3 rounded-lg bg-white border-l-4 border-l-[#D94545] border-y border-r border-red-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">PULSO / FC</span>
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold font-mono text-[#1A2F2B]">{vitals.heartRate}</span>
                      <span className="text-xs text-slate-500">lpm</span>
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-red-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      Taquicardia sinusal
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="font-mono text-slate-400">8867-4</span>
                    <span className="text-[#296a45] font-bold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">check</span> Extraído
                    </span>
                  </div>
                </div>

                {/* Item 4: Saturación O2 */}
                <div className="p-3 rounded-lg bg-white border-l-4 border-l-[#D94545] border-y border-r border-red-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">SATURACIÓN O2</span>
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold font-mono text-red-700">{vitals.spO2}%</span>
                      <span className="text-xs text-slate-500">SpO2</span>
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-red-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">emergency_home</span>
                      Hipoxemia Severa
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="font-mono text-slate-400">2708-6</span>
                    <span className="text-[#296a45] font-bold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">check</span> Extraído
                    </span>
                  </div>
                </div>

                {/* Item 5: Presión Arterial */}
                <div className="p-3 rounded-lg bg-white border-l-4 border-l-[#E8A238] border-y border-r border-amber-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">PRESIÓN ARTERIAL</span>
                      <span className="w-2 h-2 rounded-full bg-[#E8A238]"></span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold font-mono text-[#1A2F2B]">
                        {vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic}
                      </span>
                      <span className="text-xs text-slate-500">mmHg</span>
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-amber-800 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">info</span>
                      Hipotensión límite
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="font-mono text-slate-400">85354-9</span>
                    <span className="text-[#296a45] font-bold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">check</span> Extraído
                    </span>
                  </div>
                </div>
              </div>

              {/* Item 6: Diagnóstico Tentativo IA (Live Shimmer Loading State) */}
              <div className="p-4 rounded-lg bg-[#F6FAF8] border border-[#1E5A52]/20 relative overflow-hidden">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#1E5A52] text-lg animate-spin">cyclone</span>
                    <span className="text-xs font-bold text-[#1A2F2B]">Diagnóstico Tentativo IA (CIE-10 Sugerido)</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-[#1E5A52] text-white px-2 py-0.5 rounded font-semibold animate-pulse">
                    NLP Sintaxis Médica...
                  </span>
                </div>

                {/* Shimmer Loading Elements */}
                <div className="space-y-2 mt-2">
                  <div className="h-5 rounded shimmer-active w-11/12 border border-[#8ED1A4]/40 flex items-center px-2">
                    <span className="text-xs font-semibold text-[#1A2F2B]">
                      CIE-10 I26.9: Tromboembolismo Pulmonar Agudo con signos de sobrecarga ventricular
                    </span>
                  </div>
                  <div className="h-4 rounded shimmer-active w-8/12 opacity-80 flex items-center px-2">
                    <span className="text-[11px] text-slate-600">Probabilidad pre-test alta según Criterios de Ginebra / Wells</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[#1E5A52]/10 flex items-center justify-between text-xs text-slate-600 font-mono">
                  <span>Algoritmo: Med-ClinicalLLM-v2 (Clasificación Fenotipo)</span>
                  <span className="text-[#296a45] font-semibold">Índice Wells: 6.5 (Alto Riesgo)</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons for Clinical Cockpit */}
            <div className="mt-5 pt-3.5 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert('Umbrales clínicos calibrados según norma MinSalud Urgencias 2024 (NEWS2 >= 7 = Alerta Roja).')}
                  className="px-3.5 py-1.5 rounded-lg border border-[#1E5A52]/30 text-[#1E5A52] hover:bg-[#F6FAF8] text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">tune</span>
                  Ajustar Umbrales
                </button>
                <button
                  onClick={() => setShowLogModal(true)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#1E5A52]/30 text-[#1E5A52] hover:bg-[#F6FAF8] text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">history</span>
                  Log de Inferencia
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">{isPaused ? 'play_arrow' : 'pause'}</span>
                  {isPaused ? 'Reanudar Ingesta' : 'Pausar Ingesta'}
                </button>
                <button
                  onClick={onAdvanceToCockpit}
                  className="px-4 py-2 rounded-lg bg-[#1E5A52] hover:bg-[#16443E] text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">checklist</span>
                  Aprobar y Enrutar a Triage
                </button>
              </div>
            </div>
          </div>

          {/* Fallback & Error-Handling Badge (Slate Grey #7A9490) */}
          <aside className="p-3.5 rounded-lg bg-[#7A9490]/15 border border-[#7A9490]/40 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#7A9490]/25 text-[#1A2F2B] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-base">cloud_sync</span>
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-2 font-semibold text-[#1A2F2B]">
                <span>Respaldo de Conexión:</span>
                <span className="bg-[#7A9490]/30 px-1.5 py-0.5 rounded text-[11px] font-mono uppercase tracking-wide">
                  FALLO TÉCNICO (Reintento automático {retryCount}/3)
                </span>
              </div>
              <p className="text-slate-600 mt-1 leading-normal">
                Si timeout &gt; 3s, el documento se enruta automáticamente a <strong className="text-slate-900">EN REVISIÓN HUMANA</strong> sin pérdida de datos ni bloqueo de la cola de emergencias.
              </p>
            </div>
            <button
              onClick={() => setRetryCount(prev => (prev % 3) + 1)}
              className="shrink-0 text-xs font-semibold text-[#1E5A52] hover:underline flex items-center gap-0.5 pt-1"
            >
              Reintentar Ahora
              <span className="material-symbols-outlined text-xs">refresh</span>
            </button>
          </aside>
        </section>
      </div>

      {/* Mini Inference Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 border border-slate-300 shadow-xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-800">Log de Inferencia Determinística (#DOC-8492)</span>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <div className="bg-slate-900 text-emerald-400 p-3 rounded-lg space-y-1 text-[11px] max-h-60 overflow-y-auto custom-scrollbar">
              <div>[03:42:01.004] INGEST: File received (2,201,842 bytes).</div>
              <div>[03:42:01.042] SHA-256 integrity match: 9e8a5b...3b21 OK.</div>
              <div>[03:42:01.090] OCR engine parsed 1,480 glyphs across 2 pages.</div>
              <div>[03:42:01.215] ENTITY_EXTRACT: HeartRate=118bpm, SpO2=89%, BP=90/60.</div>
              <div>[03:42:01.450] NEWS2 calculator assigned score: 8 (Critical alert triggered).</div>
              <div>[03:42:01.890] FHIR Observation/DiagnosticReport generated in 12ms.</div>
            </div>
            <div className="text-right">
              <button 
                onClick={() => setShowLogModal(false)}
                className="px-3 py-1 bg-[#1E5A52] text-white rounded text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
