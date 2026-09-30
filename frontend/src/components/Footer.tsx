import React from 'react';

interface FooterProps {
  latency?: string;
  bufferPercent?: string;
  isRedAlert?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  latency = '14ms',
  bufferPercent = '99.4%',
  isRedAlert = false
}) => {
  return (
    <footer className="w-full bg-[#1E5A52] text-white/90 border-t border-white/10 px-4 sm:px-6 py-2.5 font-mono text-xs select-none shrink-0 z-30 shadow-inner">
      <div className="max-w-[1740px] mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        {/* Left Telemetry String */}
        <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
          <span className={`w-2 h-2 rounded-full ${isRedAlert ? 'bg-[#ffb3ae] animate-ping' : 'bg-[#8ED1A4] animate-pulse'}`}></span>
          <span className="font-semibold text-white">MediFlow v6.0</span>
          <span className="text-white/40">|</span>
          <span className="text-[#8ED1A4]">Núcleo + Pack Colombia</span>
          <span className="text-white/40 hidden sm:inline">|</span>
          <span className="text-[#8ED1A4] hidden sm:inline flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Motor determinístico activo
          </span>
          <span className="text-white/40 hidden sm:inline">|</span>
          <span className="text-white/80 hidden sm:inline">Buffer: {bufferPercent} libre</span>
          <span className="text-white/40 hidden lg:inline">|</span>
          <span className="text-[#8ED1A4] hidden lg:inline">Auditoría Médica Registrada</span>
        </div>

        {/* Right System Health Indicators */}
        <div className="flex items-center gap-3.5 text-[11px] text-white/80">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-[#8ED1A4]">hub</span>
            HL7 FHIR v4.0.1
          </span>
          <span className="text-white/30">•</span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-[#8ED1A4]">speed</span>
            Latencia: {latency}
          </span>
          <span className="text-white/30 hidden sm:inline">•</span>
          <span className="hidden sm:flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-[#8ED1A4]">verified_user</span>
            FIPS-140-3 / TLS 1.3
          </span>
        </div>
      </div>
    </footer>
  );
};
