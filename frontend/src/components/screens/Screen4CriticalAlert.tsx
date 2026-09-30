import React, { useState, useEffect } from 'react';
import { ClinicalVitals, PatientData, DocumentMetadata } from '../../types';

interface Screen4CriticalAlertProps {
  onAdvanceToHumanReview: () => void;
  onAdvanceToDelivered: () => void;
  vitals: ClinicalVitals;
  patient: PatientData;
  document: DocumentMetadata;
}

export const Screen4CriticalAlert: React.FC<Screen4CriticalAlertProps> = ({
  onAdvanceToHumanReview,
  onAdvanceToDelivered,
  vitals,
  patient,
  document: doc
}) => {
  // Live countdown timer starting at 58 min 34 sec
  const [secondsRemaining, setSecondsRemaining] = useState(58 * 60 + 34);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [hasTransferred, setHasTransferred] = useState(false);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleNotifyGuard = () => {
    setHasAcknowledged(true);
  };

  const handleTransfer = () => {
    setHasTransferred(true);
  };

  return (
    <div className="flex-1 p-4 lg:p-6 max-w-[1720px] mx-auto w-full flex flex-col gap-5">
      {/* Top Blinking Alert Header */}
      <section className="bg-[#D94545] text-white rounded-xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border-2 border-red-400 pulsing-alert-ring">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white text-[#D94545] flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
            <span className="material-symbols-outlined text-3xl animate-bounce">
              emergency
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-wider">
                PRIORIDAD 1 (RESUS)
              </span>
              <span className="text-white/80 text-xs font-semibold">CÓDIGO ROJO INSTITUCIONAL</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight mt-0.5">
              ALERTA CRÍTICA INMEDIATA (&lt; 60 MINUTOS) — CÓDIGO TEP MASIVO
            </h1>
            <p className="text-xs text-white/90">
              Protocolo de Emergencia Vital activado para paciente {patient.anonymizedToken} en {patient.assignedBox}
            </p>
          </div>
        </div>

        {/* Audio Alert Toggle & Controls */}
        <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'bg-white text-[#D94545] border-white shadow-xs'
                : 'bg-red-800/60 text-white border-red-300 hover:bg-red-700/60'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {soundEnabled ? 'volume_up' : 'volume_off'}
            </span>
            <span>{soundEnabled ? 'Alarma Sonora ACTIVA' : 'Activar Sirena'}</span>
          </button>
        </div>
      </section>

      {/* Main Alert Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 cols): Countdown Clock, Vital Signs Impact & Clinical Actions */}
        <section className="lg:col-span-8 space-y-5">
          {/* Hero Countdown & Diagnosis Card */}
          <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
                  Diagnóstico Presuntivo Crítico
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1A2F2B]">
                  Tromboembolismo Pulmonar (TEP) Masivo
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded border border-red-200">
                    CIE-10: I26.9
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    Compromiso hemodinámico severo
                  </span>
                </div>
              </div>

              {/* Countdown Timer Display */}
              <div className="bg-slate-900 text-red-500 p-4 rounded-xl border border-red-900/50 shadow-inner flex flex-col items-center min-w-[200px]">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-widest text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  Tiempo Restante SLA
                </div>
                <div className="text-3xl sm:text-4xl font-mono font-bold tracking-widest text-white mt-1">
                  {formatCountdown(secondsRemaining)}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="text-[10px] font-mono text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    {isTimerRunning ? 'Pausar' : 'Reanudar'}
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    onClick={() => setSecondsRemaining(60 * 60)}
                    className="text-[10px] font-mono text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Reset 60m
                  </button>
                </div>
              </div>
            </div>

            {/* Vital Signs Critical Thresholds */}
            <div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-3">
                Parámetros Fisiológicos Determinantes (NEWS2: {vitals.news2Score} Puntos - Riesgo Extremo)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Metric 1 */}
                <div className="p-3.5 rounded-lg bg-red-50/80 border-2 border-red-300 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[11px] text-red-800 font-bold">
                    <span>FRECUENCIA RESP.</span>
                    <span className="material-symbols-outlined text-sm">air</span>
                  </div>
                  <div className="my-2">
                    <span className="text-3xl font-mono font-bold text-red-900">{vitals.respiratoryRate}</span>
                    <span className="text-xs text-red-700 ml-1">rpm</span>
                  </div>
                  <span className="text-[10px] bg-red-200/80 text-red-900 font-bold px-1.5 py-0.5 rounded text-center">
                    Taquipnea Severa
                  </span>
                </div>

                {/* Metric 2 */}
                <div className="p-3.5 rounded-lg bg-red-50/80 border-2 border-red-300 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[11px] text-red-800 font-bold">
                    <span>SATURACIÓN O2</span>
                    <span className="material-symbols-outlined text-sm">bloodtype</span>
                  </div>
                  <div className="my-2">
                    <span className="text-3xl font-mono font-bold text-red-900">{vitals.spO2}%</span>
                    <span className="text-xs text-red-700 ml-1">SpO2</span>
                  </div>
                  <span className="text-[10px] bg-red-200/80 text-red-900 font-bold px-1.5 py-0.5 rounded text-center">
                    Hipoxemia Aguda
                  </span>
                </div>

                {/* Metric 3 */}
                <div className="p-3.5 rounded-lg bg-red-50/80 border-2 border-red-300 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[11px] text-red-800 font-bold">
                    <span>FREC. CARDÍACA</span>
                    <span className="material-symbols-outlined text-sm">ecg</span>
                  </div>
                  <div className="my-2">
                    <span className="text-3xl font-mono font-bold text-red-900">{vitals.heartRate}</span>
                    <span className="text-xs text-red-700 ml-1">lpm</span>
                  </div>
                  <span className="text-[10px] bg-red-200/80 text-red-900 font-bold px-1.5 py-0.5 rounded text-center">
                    Taquicardia Sinusal
                  </span>
                </div>

                {/* Metric 4 */}
                <div className="p-3.5 rounded-lg bg-amber-50/80 border-2 border-amber-300 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[11px] text-amber-800 font-bold">
                    <span>PRESIÓN ARTERIAL</span>
                    <span className="material-symbols-outlined text-sm">monitor_heart</span>
                  </div>
                  <div className="my-2">
                    <span className="text-2xl font-mono font-bold text-amber-900">
                      {vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic}
                    </span>
                    <span className="text-[10px] text-amber-700 ml-1">mmHg</span>
                  </div>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-1.5 py-0.5 rounded text-center">
                    Hipotensión Límite
                  </span>
                </div>
              </div>
            </div>

            {/* Immediate Resuscitation Interventions Cluster */}
            <div className="pt-2 border-t border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Acciones Inmediatas de Rescate Clínico
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleTransfer}
                  className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                    hasTransferred
                      ? 'bg-emerald-600 text-white border-2 border-emerald-400'
                      : 'bg-[#1E5A52] hover:bg-[#16443E] text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {hasTransferred ? 'check_circle' : 'move_to_inbox'}
                  </span>
                  <span>
                    {hasTransferred ? 'Transferencia Ordenada (Hemodinamia)' : 'Transferir a Box Hemodinamia'}
                  </span>
                </button>

                <button
                  onClick={handleNotifyGuard}
                  className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                    hasAcknowledged
                      ? 'bg-emerald-600 text-white border-2 border-emerald-400'
                      : 'bg-[#D94545] hover:bg-red-700 text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {hasAcknowledged ? 'check_circle' : 'notifications_active'}
                  </span>
                  <span>
                    {hasAcknowledged ? 'Guardia Notificada (Acuse Confirmado)' : '🚨 Notificar a Guardia & Acusar Recibo'}
                  </span>
                </button>
              </div>

              {/* Step Forward to Human Review Station Button */}
              <div className="pt-2 flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">
                  Comorbilidad detectada en fármacos asociados.
                </span>
                <button
                  onClick={onAdvanceToHumanReview}
                  className="px-5 py-2.5 rounded-lg bg-[#E8A238] hover:bg-[#d9942a] text-[#1A2F2B] font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>Revisar Prescripción y Fármacos (Pantalla 4/5)</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column (4 cols): CT Slice Graphic & Live Telemetry WebSocket Status */}
        <section className="lg:col-span-4 space-y-5">
          {/* CT Slice Axial Telemetry View */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-mono text-xs font-bold flex items-center gap-1.5 text-[#8ED1A4]">
                <span className="material-symbols-outlined text-sm">radiology</span>
                ANGIOTC TÓRAX #48
              </span>
              <span className="text-[10px] font-mono bg-red-600/80 text-white px-2 py-0.5 rounded font-bold">
                TEP POSITIVO
              </span>
            </div>

            <div className="p-4 bg-slate-950 flex flex-col items-center justify-center">
              <div className="w-full max-w-[280px] aspect-square relative">
                <svg viewBox="0 0 300 300" className="w-full h-full">
                  <ellipse cx="150" cy="150" rx="130" ry="115" fill="#12181d" stroke="#37474f" strokeWidth="2" />
                  <path d="M60,110 Q80,90 120,105 Q115,180 80,200 Q50,180 60,110 Z" fill="#0b1013" stroke="#263238" />
                  <path d="M240,110 Q220,90 180,105 Q185,180 220,200 Q250,180 240,110 Z" fill="#0b1013" stroke="#263238" />
                  <circle cx="140" cy="135" r="14" fill="#eceff1" />
                  {/* Red TEP Marker */}
                  <ellipse cx="178" cy="148" rx="8" ry="6" fill="#1c242b" stroke="#D94545" strokeWidth="2" />
                  <circle cx="178" cy="148" r="16" fill="none" stroke="#D94545" strokeWidth="1.5" strokeDasharray="3 2" className="animate-spin" />
                  <text x="110" y="275" fill="#8ED1A4" fontSize="10" fontFamily="monospace">CORTE AXIAL #48</text>
                </svg>
              </div>
              <p className="text-[11px] text-red-400 font-mono text-center mt-2 font-semibold">
                Oclusión trombótica 85% en tronco pulmonar derecho
              </p>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Relación VD/VI:</span>
                <strong className="text-red-700 font-mono">1.15 (&gt; 1.0 Alerta)</strong>
              </div>
              <div className="flex justify-between">
                <span>Troponina Ultrasensible:</span>
                <strong className="text-amber-800 font-mono">Elevada (Positiva)</strong>
              </div>
            </div>
          </div>

          {/* Telemetry Status Indicator */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Estado de Enlace WebSocket</span>
              <span className="flex items-center gap-1 font-mono text-emerald-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                200 OK / Live
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              La señal de monitoreo continuo está conectada al monitor de cabecera de {patient.assignedBox}. Los cambios hemodinámicos se propagan en menos de 20ms.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
