import React from 'react';
import { ScreenId, PipelineStage } from '../types';

interface HeaderProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  onOpenQueueModal: () => void;
  isCriticalAlertActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onSelectScreen,
  onOpenQueueModal,
  isCriticalAlertActive = false
}) => {
  // Map screen to pipeline stage for stepper highlight
  const getStageForScreen = (screen: ScreenId): PipelineStage => {
    switch (screen) {
      case 'screen_1_ingest':
        return '1_RECIBIDO';
      case 'screen_2_processing':
        return '4_EXTRAIDO';
      case 'screen_3_integrated':
        return '5_EVALUADO';
      case 'screen_4_critical_alert':
        return '5_EVALUADO';
      case 'screen_5_human_review':
        return '6_EN_REVISION';
      case 'screen_6_delivered':
        return '7_ENTREGADO';
    }
  };

  const activeStage = getStageForScreen(currentScreen);

  return (
    <header className="bg-[#1E5A52] text-white sticky top-0 z-50 shadow-md select-none border-b border-[#16443E]">
      {/* Main Top Header Bar */}
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-white/10 gap-3">
        {/* Brand & Storyboard Indicator */}
        <div className="flex items-center gap-3.5">
          <div 
            onClick={() => onSelectScreen('screen_1_ingest')}
            className="flex items-center gap-3 cursor-pointer group"
            title="Ir al inicio de MediFlow"
          >
            <div className="h-9 w-9 rounded-lg overflow-hidden border border-white/25 shadow-inner bg-white/10 p-0.5 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                {/* Silhouette with leaf and ECG pulse matching MediFlow logo */}
                <path d="M48 18 C35 18 24 28 24 41 C24 50 29 57 36 62 C34 68 28 72 20 74 C26 78 35 77 42 72 C44 75 48 78 52 80 C48 74 46 66 48 58 C51 58 55 56 57 52 C60 48 58 43 56 42 C56 36 54 30 50 26 C54 26 58 29 60 32 C62 30 63 26 62 23 C58 19 53 18 48 18 Z" fill="#8ED1A4"/>
                <path d="M42 70 Q52 75 62 76 Q54 68 46 65 Z" fill="#296A45"/>
                <polyline points="45,56 55,56 60,38 67,72 73,48 78,56 94,56" fill="none" stroke="#8ED1A4" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-white leading-none">MediFlow</span>
                <span className="bg-[#8ED1A4]/25 text-[#8ED1A4] border border-[#8ED1A4]/40 font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider">
                  v6.0 Prod
                </span>
              </div>
              <span className="text-[10px] text-[#8ED1A4] tracking-wider uppercase font-semibold mt-0.5">
                Triage &amp; Routing Engine
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center h-6 w-px bg-white/20 mx-2"></div>

          {/* Screen Navigation Selector / Switcher */}
          <div className="hidden lg:flex items-center gap-2 bg-black/20 px-2.5 py-1 rounded-lg border border-white/10 text-xs">
            <span className="text-white/60 font-medium">Pantalla:</span>
            <select
              value={currentScreen}
              onChange={(e) => onSelectScreen(e.target.value as ScreenId)}
              className="bg-transparent text-[#8ED1A4] font-semibold text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="screen_1_ingest" className="bg-[#1E5A52] text-white">1/5: Ingesta y Carga de Archivos</option>
              <option value="screen_2_processing" className="bg-[#1E5A52] text-white">2/5: Procesamiento y Extracción IA</option>
              <option value="screen_3_integrated" className="bg-[#1E5A52] text-white">3/5: Cockpit de Triaje Integrado</option>
              <option value="screen_4_critical_alert" className="bg-[#1E5A52] text-white">3b/5: Alerta Crítica TEP (Countdown)</option>
              <option value="screen_5_human_review" className="bg-[#1E5A52] text-white">4/5: Estación de Revisión Humana</option>
              <option value="screen_6_delivered" className="bg-[#1E5A52] text-white">5/5: Confirmación de Entrega &amp; Ledger</option>
            </select>
          </div>
        </div>

        {/* Right Metadata & Clinician Badge */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Quick Monitor Queue CTA button */}
          <button
            onClick={onOpenQueueModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8ED1A4]/20 hover:bg-[#8ED1A4]/30 text-white rounded-lg border border-[#8ED1A4]/40 text-xs font-semibold transition-colors shadow-sm"
            title="Abrir Monitor de Colas en Tiempo Real"
          >
            <span className="material-symbols-outlined text-[16px] text-[#8ED1A4]">view_timeline</span>
            <span className="hidden md:inline">Monitor Colas</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#8ED1A4] text-[#1E5A52] font-mono text-[10px] font-bold">3</span>
          </button>

          {/* Colombian Health System Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-black/25 rounded-md border border-white/15 text-xs text-white/95">
            <span className="text-base leading-none">🇨🇴</span>
            <div className="flex flex-col text-left">
              <span className="font-bold text-[11px] tracking-wide leading-tight">Colombia (SISPRO)</span>
              <span className="text-[9px] text-[#8ED1A4] leading-none font-mono">Red de Urgencias Nivel 1</span>
            </div>
          </div>

          {/* Doctor Profile Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/15">
            <div className="w-8 h-8 rounded-full bg-[#8ED1A4] text-[#1E5A52] flex items-center justify-center font-bold text-xs shadow-sm">
              VP
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-white leading-tight">Dra. Valeria Pérez</span>
              <span className="text-[10px] text-white/70 leading-tight">Guardia Urgencias • #MED-9482</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper Pipeline: 7 Stages with Glow & Interactive Navigation */}
      <div className="px-4 sm:px-6 py-2 bg-[#16443E] border-t border-white/10 overflow-x-auto custom-scrollbar">
        <div className="flex items-center justify-between min-w-[940px] max-w-7xl mx-auto text-xs py-0.5">
          {/* Step 1: RECIBIDO */}
          <button
            onClick={() => onSelectScreen('screen_1_ingest')}
            className={`flex items-center gap-1.5 transition-all text-left ${
              activeStage === '1_RECIBIDO'
                ? 'bg-[#8ED1A4] text-[#10322E] px-3 py-1 rounded-full font-bold shadow-md shadow-[#8ED1A4]/30 ring-2 ring-[#8ED1A4]/50'
                : 'text-[#8ED1A4] font-medium opacity-90 hover:opacity-100'
            }`}
          >
            <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
              activeStage === '1_RECIBIDO' ? 'bg-[#10322E] text-[#8ED1A4]' : 'bg-[#8ED1A4]/20 border border-[#8ED1A4]'
            }`}>
              ✓
            </span>
            <span className="tracking-tight text-[11px] font-semibold">1. RECIBIDO</span>
          </button>

          <div className={`h-0.5 flex-1 mx-2 ${
            ['2_VALIDADO', '3_CLASIFICADO', '4_EXTRAIDO', '5_EVALUADO', '6_EN_REVISION', '7_ENTREGADO'].includes(activeStage)
              ? 'bg-[#8ED1A4]'
              : 'bg-[#8ED1A4]/40'
          }`} />

          {/* Step 2: VALIDADO */}
          <button
            onClick={() => onSelectScreen('screen_1_ingest')}
            className={`flex items-center gap-1.5 transition-all text-left ${
              activeStage === '2_VALIDADO'
                ? 'bg-[#8ED1A4] text-[#10322E] px-3 py-1 rounded-full font-bold shadow-md ring-2 ring-[#8ED1A4]/50'
                : 'text-[#8ED1A4] font-medium opacity-90 hover:opacity-100'
            }`}
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#8ED1A4]/20 border border-[#8ED1A4] text-[10px] font-bold">
              ✓
            </span>
            <span className="tracking-tight text-[11px] font-semibold">2. VALIDADO</span>
          </button>

          <div className={`h-0.5 flex-1 mx-2 ${
            ['3_CLASIFICADO', '4_EXTRAIDO', '5_EVALUADO', '6_EN_REVISION', '7_ENTREGADO'].includes(activeStage)
              ? 'bg-[#8ED1A4]'
              : 'bg-[#8ED1A4]/40'
          }`} />

          {/* Step 3: CLASIFICADO */}
          <button
            onClick={() => onSelectScreen('screen_2_processing')}
            className={`flex items-center gap-1.5 transition-all text-left ${
              activeStage === '3_CLASIFICADO'
                ? 'bg-[#8ED1A4] text-[#10322E] px-3 py-1 rounded-full font-bold shadow-md ring-2 ring-[#8ED1A4]/50'
                : 'text-[#8ED1A4] font-medium opacity-90 hover:opacity-100'
            }`}
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#8ED1A4]/20 border border-[#8ED1A4] text-[10px] font-bold">
              ✓
            </span>
            <span className="tracking-tight text-[11px] font-semibold">3. CLASIFICADO</span>
          </button>

          <div className={`h-0.5 flex-1 mx-2 ${
            ['4_EXTRAIDO', '5_EVALUADO', '6_EN_REVISION', '7_ENTREGADO'].includes(activeStage)
              ? 'bg-[#8ED1A4]'
              : 'bg-[#8ED1A4]/40'
          }`} />

          {/* Step 4: EXTRAIDO */}
          <button
            onClick={() => onSelectScreen('screen_2_processing')}
            className={`flex items-center gap-1.5 transition-all text-left ${
              activeStage === '4_EXTRAIDO'
                ? 'bg-[#8ED1A4] text-[#10322E] px-3 py-1 rounded-full font-bold shadow-md ring-2 ring-[#8ED1A4]/50 animate-pulse-subtle'
                : 'text-[#8ED1A4] font-medium opacity-90 hover:opacity-100'
            }`}
          >
            <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
              activeStage === '4_EXTRAIDO' ? 'bg-[#10322E] text-[#8ED1A4]' : 'bg-[#8ED1A4]/20 border border-[#8ED1A4]'
            }`}>
              {activeStage === '4_EXTRAIDO' ? '⟳' : '✓'}
            </span>
            <span className="tracking-tight text-[11px] font-semibold">4. EXTRAIDO</span>
          </button>

          <div className={`h-0.5 flex-1 mx-2 ${
            ['5_EVALUADO', '6_EN_REVISION', '7_ENTREGADO'].includes(activeStage)
              ? 'bg-[#8ED1A4]'
              : 'bg-[#8ED1A4]/40'
          }`} />

          {/* Step 5: EVALUADO (CRÍTICO) */}
          <button
            onClick={() => onSelectScreen('screen_4_critical_alert')}
            className={`flex items-center gap-1.5 transition-all text-left ${
              activeStage === '5_EVALUADO'
                ? (isCriticalAlertActive
                    ? 'bg-[#D94545] text-white px-3 py-1 rounded-full font-bold shadow-lg shadow-red-500/30 ring-2 ring-red-400 pulsing-alert-ring'
                    : 'bg-[#8ED1A4] text-[#10322E] px-3 py-1 rounded-full font-bold shadow-md ring-2 ring-[#8ED1A4]/50')
                : 'text-[#8ED1A4] font-medium opacity-90 hover:opacity-100'
            }`}
          >
            <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
              activeStage === '5_EVALUADO' ? (isCriticalAlertActive ? 'bg-white text-[#D94545]' : 'bg-[#10322E] text-[#8ED1A4]') : 'bg-[#8ED1A4]/20 border border-[#8ED1A4]'
            }`}>
              {activeStage === '5_EVALUADO' ? (isCriticalAlertActive ? '!' : '●') : '✓'}
            </span>
            <span className="tracking-tight text-[11px] font-semibold">
              5. EVALUADO {activeStage === '5_EVALUADO' ? (isCriticalAlertActive ? '(CRÍTICO)' : '(ACTIVO)') : ''}
            </span>
          </button>

          <div className={`h-0.5 flex-1 mx-2 ${
            ['6_EN_REVISION', '7_ENTREGADO'].includes(activeStage)
              ? 'bg-[#8ED1A4]'
              : 'bg-[#8ED1A4]/40'
          }`} />

          {/* Step 6: EN REVISIÓN / ENRUTADO */}
          <button
            onClick={() => onSelectScreen('screen_5_human_review')}
            className={`flex items-center gap-1.5 transition-all text-left ${
              activeStage === '6_EN_REVISION'
                ? 'bg-[#E8A238] text-[#1A2F2B] px-3 py-1 rounded-full font-bold shadow-md ring-2 ring-amber-300'
                : 'text-[#8ED1A4] font-medium opacity-90 hover:opacity-100'
            }`}
          >
            <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
              activeStage === '6_EN_REVISION' ? 'bg-[#1A2F2B] text-[#E8A238]' : 'bg-[#8ED1A4]/20 border border-[#8ED1A4]'
            }`}>
              {activeStage === '6_EN_REVISION' ? '✎' : '✓'}
            </span>
            <span className="tracking-tight text-[11px] font-semibold">
              {activeStage === '6_EN_REVISION' ? '6. EN REVISIÓN' : '6. ENRUTADO'}
            </span>
          </button>

          <div className={`h-0.5 flex-1 mx-2 ${
            activeStage === '7_ENTREGADO' ? 'bg-[#8ED1A4]' : 'bg-[#8ED1A4]/40'
          }`} />

          {/* Step 7: ENTREGADO */}
          <button
            onClick={() => onSelectScreen('screen_6_delivered')}
            className={`flex items-center gap-1.5 transition-all text-left ${
              activeStage === '7_ENTREGADO'
                ? 'bg-[#8ED1A4] text-[#10322E] px-3.5 py-1 rounded-full font-bold shadow-lg shadow-[#8ED1A4]/30 ring-2 ring-[#8ED1A4]/50 animate-pulse-subtle'
                : 'text-white/60 font-medium opacity-80 hover:opacity-100'
            }`}
          >
            <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
              activeStage === '7_ENTREGADO' ? 'bg-[#10322E] text-[#8ED1A4]' : 'bg-white/10 border border-white/20'
            }`}>
              ✓
            </span>
            <span className="tracking-tight text-[11px] font-semibold">7. ENTREGADO</span>
            {activeStage === '7_ENTREGADO' && (
              <span className="text-[9px] font-normal uppercase tracking-wider bg-[#10322E]/20 px-1 py-0.2 rounded hidden sm:inline">
                Éxito
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
