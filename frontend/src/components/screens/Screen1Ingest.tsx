import React, { useState } from 'react';
import { DocumentMetadata, IngestQueueItem } from '../../types';

interface Screen1IngestProps {
  onAdvanceToProcessing: () => void;
  onOpenQueueModal: () => void;
  document: DocumentMetadata;
  queue: IngestQueueItem[];
  onSelectSampleCase?: (caseType: 'tep' | 'rx' | 'pelvis' | 'malware') => void;
}

export const Screen1Ingest: React.FC<Screen1IngestProps> = ({
  onAdvanceToProcessing,
  onOpenQueueModal,
  document: doc,
  queue,
  onSelectSampleCase
}) => {
  const [originChannel, setOriginChannel] = useState('ED');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState(doc.fileName);
  const [fileSizeBytes, setFileSizeBytes] = useState(doc.sizeBytes);
  const [parseTime, setParseTime] = useState('0.042 s');
  const [isScanning, setIsScanning] = useState(false);
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.exe') || file.name.endsWith('.sh') || file.name.endsWith('.bat')) {
        setShowSecurityAlert(true);
        return;
      }
      setSelectedFileName(file.name);
      setFileSizeBytes(file.size);
      setParseTime('0.038 s');
      setShowSecurityAlert(false);
    }
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setSelectedFileName('Scan_ADF_600DPI_Receta_Urgencias.tiff');
      setFileSizeBytes(1840210);
      setParseTime('0.045 s');
    }, 1500);
  };

  return (
    <div className="w-full max-w-[1740px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Workspace Subheader: Title, System Context, & Primary Selectors */}
      <section className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#1E5A52]/10 text-[#1E5A52] font-bold border border-[#1E5A52]/20">
              PANTALLA 1 / 5
            </span>
            <span className="text-slate-500 font-mono text-xs">HISTORIA CLÍNICA DIRECTA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A2F2B] font-bold tracking-tight">
            Ingesta y Carga de Archivos Clínicos
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl mt-1">
            Subsistema de ingestión automatizada con verificación criptográfica SHA-256, anonimización preliminar y validación de interoperabilidad HL7/DICOM.
          </p>
        </div>

        {/* Controls: Dropdown Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Jurisdicción fija: instalación exclusiva para Colombia */}
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Jurisdicción Sanitaria
            </span>
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs font-semibold text-[#1A2F2B] shadow-xs">
              <span className="text-base leading-none">🇨🇴</span>
              <span>Colombia (SGSSS · SISPRO)</span>
              <span className="material-symbols-outlined text-[14px] text-[#1E5A52]">lock</span>
            </div>
          </div>

          {/* Origin Channel Selector */}
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Canal de Procedencia
            </label>
            <div className="relative inline-block">
              <select
                value={originChannel}
                onChange={(e) => setOriginChannel(e.target.value)}
                className="appearance-none w-full sm:w-60 bg-white border border-slate-300 rounded-lg px-3.5 py-2 pr-9 text-xs font-semibold text-[#1A2F2B] focus:outline-none focus:ring-2 focus:ring-[#1E5A52]/20 focus:border-[#1E5A52] shadow-xs cursor-pointer"
              >
                <option value="ED">🚨 Guardia de Urgencias (Triage)</option>
                <option value="EXT">🩺 Consulta Externa General</option>
                <option value="SURG">💉 Pabellón Quirúrgico / UCI</option>
                <option value="AMB">🚑 Triage Prehospitalario (Línea 123)</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[18px]">
                expand_more
              </span>
            </div>
          </div>

          {/* Refresh Pipeline Action */}
          <div className="flex flex-col justify-end self-end">
            <button
              onClick={() => {
                setParseTime('0.029 s');
              }}
              className="h-9 px-3 flex items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-600 hover:text-[#1E5A52] hover:border-[#1E5A52] transition-colors shadow-xs"
              title="Sincronizar feeds HL7"
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
            </button>
          </div>
        </div>
      </section>

      {/* Bento Grid Section: Primary Ingest Area & Telemetry Context */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Center Main Ingest Column (8 Columns) */}
        <section className="lg:col-span-8 space-y-5">
          {/* Large Drag-and-Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                setSelectedFileName(file.name);
                setFileSizeBytes(file.size);
              }
            }}
            className={`relative group rounded-xl border-2 border-dashed p-8 lg:p-10 text-center transition-all duration-200 shadow-xs cursor-pointer ${
              isDragging ? 'bg-[#EDF7F2] border-[#1E5A52]' : 'bg-[#F2FAF6] hover:bg-[#EDF7F2] border-[#8ED1A4]'
            }`}
          >
            {/* Subtle corner accent cues */}
            <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-[#1E5A52]/40 rounded-tl"></div>
            <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-[#1E5A52]/40 rounded-tr"></div>
            <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-[#1E5A52]/40 rounded-bl"></div>
            <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-[#1E5A52]/40 rounded-br"></div>

            <input
              type="file"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              title="Seleccionar archivo"
            />

            <div className="max-w-xl mx-auto space-y-3 pointer-events-none">
              {/* Icon Container */}
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-md text-[#1E5A52] ring-1 ring-[#8ED1A4]/40 group-hover:scale-105 transition-transform duration-200">
                <span className="material-symbols-outlined text-[32px] text-[#1E5A52]">
                  {isScanning ? 'sync' : 'upload_file'}
                </span>
              </div>

              {/* Main Directives */}
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg text-[#1A2F2B] font-bold tracking-tight">
                  Arrastra aquí el archivo clínico (PDF, DICOM o Receta) o haz clic para explorar
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Formatos soportados: PDF nativo, DICOM (.dcm), imágenes radiológicas JPEG/PNG y recetas manuscritas de alta resolución.
                </p>
              </div>

              {/* Regulatory compliance note */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-slate-200 text-xs text-slate-600 font-medium">
                <span className="material-symbols-outlined text-[14px] text-[#296a45]">verified_user</span>
                <span>Encriptación homomórfica en tránsito • Conforme a Ley 1581 de 2012 y Estándar FHIR R4</span>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3 pointer-events-auto relative z-20">
                <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1E5A52] hover:bg-[#16443E] active:scale-[0.98] text-white font-semibold text-xs shadow-md transition-all cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">folder_open</span>
                  <span>Explorar Archivos Locales</span>
                  <input type="file" onChange={handleFileUpload} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={handleSimulateScan}
                  disabled={isScanning}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#8ED1A4]/20 hover:bg-[#8ED1A4]/35 border border-[#8ED1A4] text-[#1E5A52] font-semibold text-xs active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-[16px] ${isScanning ? 'animate-spin' : ''}`}>
                    scanner
                  </span>
                  <span>{isScanning ? 'Escaneando...' : 'Conectar Escáner USB / ADF'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Preset Cases Selector */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-[#1E5A52]">bookmark</span>
              Cargar Casos Clínicos de Muestra:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setSelectedFileName('Epicrisis_AngioTC_TEP_Agudo.pdf');
                  setFileSizeBytes(2201842);
                  setShowSecurityAlert(false);
                }}
                className="px-2.5 py-1 rounded bg-[#F6FAF8] hover:bg-[#8ED1A4]/20 text-[#1E5A52] border border-[#1E5A52]/20 font-semibold"
              >
                🫁 Caso 1: AngioTC TEP (Agudo C1)
              </button>
              <button
                onClick={() => {
                  setSelectedFileName('Receta_Farmaco_Apixaban_Manuscrita.tiff');
                  setFileSizeBytes(1450210);
                  setShowSecurityAlert(false);
                }}
                className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold"
              >
                💊 Caso 2: Receta Apixabán (Duda Óptica)
              </button>
              <button
                onClick={() => {
                  setShowSecurityAlert(true);
                }}
                className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 font-semibold"
              >
                🛡️ Caso 3: Archivo Malicioso (.exe)
              </button>
            </div>
          </div>

          {/* Immediate File Validation Status Card (RECIBIDO / VALIDADO) */}
          <article className="bg-white rounded-xl p-5 border border-[#8ED1A4]/60 shadow-xs relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#296a45]"></div>
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4 pl-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#adf2c3]/30 border border-[#8ED1A4] flex items-center justify-center text-[#296a45] shrink-0">
                  <span className="material-symbols-outlined text-[22px] fill-1">check_circle</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-[#1A2F2B]">
                      Validación Criptográfica y de Formato Instantánea
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#adf2c3]/40 text-[#296a45] border border-[#8ED1A4]/60">
                      ESTADO: VALIDADO
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    El motor determinístico ejecutó 4 comprobaciones de integridad en 42ms. Integración lista para el Clasificador de Urgencia.
                  </p>
                </div>
              </div>
              {/* Micro latency gauge */}
              <div className="shrink-0 text-right bg-[#F6FAF8] px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="font-mono text-[10px] text-slate-500 block">Tiempo de Parseo</span>
                <span className="font-mono text-xs font-bold text-[#1E5A52]">{parseTime}</span>
              </div>
            </div>

            {/* Metadata Pill Badges Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 pt-2 pl-1">
              {/* Badge 1: Format */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F6FAF8] border border-slate-200 text-xs">
                <span className="material-symbols-outlined text-[16px] text-[#1E5A52]">picture_as_pdf</span>
                <div className="truncate">
                  <span className="text-slate-500 text-[10px] block leading-none font-semibold">TIPO DOCUMENTAL</span>
                  <span className="font-mono font-semibold text-[#1A2F2B] truncate block">
                    {selectedFileName.endsWith('.tiff') ? 'TIFF 600DPI Multipage' : 'PDF v1.7 Válido (Texto + OCR)'}
                  </span>
                </div>
              </div>

              {/* Badge 2: Size */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F6FAF8] border border-slate-200 text-xs">
                <span className="material-symbols-outlined text-[16px] text-[#1E5A52]">straighten</span>
                <div className="truncate">
                  <span className="text-slate-500 text-[10px] block leading-none font-semibold">PESO BINARIO</span>
                  <span className="font-mono font-semibold text-[#1A2F2B]">
                    {(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB ({fileSizeBytes.toLocaleString()} bytes)
                  </span>
                </div>
              </div>

              {/* Badge 3: Document ID */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F6FAF8] border border-slate-200 text-xs">
                <span className="material-symbols-outlined text-[16px] text-[#1E5A52]">tag</span>
                <div className="truncate">
                  <span className="text-slate-500 text-[10px] block leading-none font-semibold">IDENTIFICADOR INTERNO</span>
                  <span className="font-mono font-bold text-[#1E5A52]">{doc.id}</span>
                </div>
              </div>

              {/* Badge 4: Hash SHA-256 */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F6FAF8] border border-slate-200 text-xs sm:col-span-2">
                <span className="material-symbols-outlined text-[16px] text-[#296a45]">lock</span>
                <div className="truncate">
                  <span className="text-slate-500 text-[10px] block leading-none font-semibold">FIRMA CRIPTOGRÁFICA SHA-256</span>
                  <span className="font-mono text-[#1A2F2B] tracking-wider font-medium text-[11px]">
                    9e8a5b2f...3b21 <span className="text-[#296a45] font-bold">[INTEGRIDAD OK]</span>
                  </span>
                </div>
              </div>

              {/* Badge 5: Token Privacy */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#8ED1A4]/15 border border-[#8ED1A4]/40 text-xs sm:col-span-1">
                <span className="material-symbols-outlined text-[16px] text-[#1E5A52]">shield_person</span>
                <div className="truncate">
                  <span className="text-slate-500 text-[10px] block leading-none font-semibold">TOKEN PRIVACIDAD ASIGNADO</span>
                  <span className="font-mono font-bold text-[#1E5A52]">[PAC-8492-CO]</span>
                </div>
              </div>
            </div>

            {/* Advance to Processing CTA inside the card */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-[#296a45]">verified</span>
                Archivo verificado. Listo para extracción determinística de entidades.
              </span>
              <button
                onClick={onAdvanceToProcessing}
                className="px-4 py-2 bg-[#1E5A52] hover:bg-[#16443E] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all group cursor-pointer"
              >
                <span>Avanzar a Extracción IA</span>
                <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </button>
            </div>
          </article>

          {/* Small Alert Card: Rejected Branch / Negative Validation Example */}
          {showSecurityAlert && (
            <article className="bg-white rounded-xl p-4 border-l-4 border-l-[#D94545] border border-red-200 shadow-sm animate-fadeIn">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 border border-red-300 flex items-center justify-center text-red-700 shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[20px]">security_update_warning</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                        Bifurcación: RECHAZADO
                      </span>
                      <span className="text-xs text-red-700 font-bold tracking-wide uppercase">
                        Ciberseguridad Perimetral Activa
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      <strong className="text-slate-900 font-semibold">Ejemplo de descarte:</strong> Archivo ejecutable binario malformado no permitido por protocolo de ciberseguridad hospitalaria (Ley 1581 de 2012 (Habeas Data)). Documento aislado inmediatamente en sandbox forense.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSecurityAlert(false)}
                  className="shrink-0 text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-1 rounded bg-slate-100 border border-slate-200 transition-colors"
                >
                  Cerrar Alerta
                </button>
              </div>
            </article>
          )}
        </section>

        {/* Right Diagnostic Rail (4 Columns) */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Clinical Ingest Queue Live Snapshot */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1E5A52] text-[20px]">queue_play_next</span>
                <h3 className="font-bold text-sm text-[#1A2F2B]">Bandeja de Ingesta Activa</h3>
              </div>
              <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-[#1E5A52]/10 text-[#1E5A52]">
                3 En Fila
              </span>
            </div>

            {/* Mini items list */}
            <div className="space-y-2.5">
              {/* Item 1 */}
              <div className="p-3 rounded-lg border-l-4 border-l-[#8ED1A4] bg-[#F6FAF8] border border-slate-200 flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-[#1E5A52]">DOC-8492</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#adf2c3] text-[#00210f] font-semibold">
                      VALIDANDO
                    </span>
                  </div>
                  <p className="text-xs text-[#1A2F2B] font-medium truncate max-w-[180px]">
                    Epicrisis_Torax_Agudo.pdf
                  </p>
                  <span className="text-[11px] text-slate-500 font-mono">Urgencia C2 • Box 03</span>
                </div>
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#296a45] shadow-xs">
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                </div>
              </div>

              {/* Item 2 */}
              <div className="p-3 rounded-lg border-l-4 border-l-[#E8A238] bg-white border border-slate-200 flex items-center justify-between gap-2 opacity-90">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-[#1A2F2B]">DOC-8491</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ffe082]/60 text-[#795548] font-semibold">
                      EN COLA
                    </span>
                  </div>
                  <p className="text-xs text-[#1A2F2B] font-medium truncate max-w-[180px]">
                    RX_Pelvis_Trauma.dcm
                  </p>
                  <span className="text-[11px] text-slate-500 font-mono">Ambulancia Línea 123 • En ruta</span>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-[18px]">hourglass_top</span>
              </div>

              {/* Item 3 */}
              <div className="p-3 rounded-lg border-l-4 border-l-slate-400 bg-white border border-slate-200 flex items-center justify-between gap-2 opacity-75">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-[#1A2F2B]">DOC-8490</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold">
                      OCR SCAN
                    </span>
                  </div>
                  <p className="text-xs text-[#1A2F2B] font-medium truncate max-w-[180px]">
                    Receta_Farmaco_Manuscrita.jpg
                  </p>
                  <span className="text-[11px] text-slate-500 font-mono">Consulta Externa</span>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-[18px]">document_scanner</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onOpenQueueModal}
                className="w-full py-2 text-center text-xs font-semibold text-[#1E5A52] hover:text-[#16443E] hover:underline flex items-center justify-center gap-1"
              >
                <span>Abrir Monitor Maestro de Colas</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </button>
            </div>
          </div>

          {/* Telemetry & Diagnostic Health Card */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Métricas de Ingesta (HUD)
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#296a45] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#296a45]"></span>
                Óptimo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-[#F6FAF8] border border-slate-200">
                <span className="text-[10px] font-mono text-slate-500 block">BUFFER DISPONIBLE</span>
                <span className="text-xl font-bold text-[#1A2F2B] font-mono">99.4%</span>
                <span className="text-[10px] text-emerald-800 font-medium block">9.8 GB libres</span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#F6FAF8] border border-slate-200">
                <span className="text-[10px] font-mono text-slate-500 block">TIEMPO PROMEDIO</span>
                <span className="text-xl font-bold text-[#1E5A52] font-mono">140ms</span>
                <span className="text-[10px] text-[#296a45] font-medium block">Sub-segundo OK</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#1E5A52]/5 border border-[#1E5A52]/15 text-xs space-y-1">
              <div className="flex items-center justify-between text-[#1E5A52] font-semibold">
                <span>Seguridad Criptográfica</span>
                <span className="font-mono text-[11px]">FIPS 140-3</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-tight">
                Los archivos son escaneados contra 12 firmas de exploits y convertidos a estructuras canónicas HL7 v2.5.1 en memoria volátil protegida.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
