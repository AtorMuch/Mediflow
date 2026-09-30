/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ScreenId, PatientData, DocumentMetadata, ClinicalVitals, IngestQueueItem } from './types';
import { INITIAL_PATIENT, INITIAL_VITALS, INITIAL_DOCUMENT, MOCK_QUEUE } from './data/mockData';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Screen1Ingest } from './components/screens/Screen1Ingest';
import { Screen2Processing } from './components/screens/Screen2Processing';
import { Screen3IntegratedCockpit } from './components/screens/Screen3IntegratedCockpit';
import { Screen4CriticalAlert } from './components/screens/Screen4CriticalAlert';
import { Screen5HumanReview } from './components/screens/Screen5HumanReview';
import { Screen6Delivered } from './components/screens/Screen6Delivered';
import { QueueMonitorModal } from './components/QueueMonitorModal';
import { HL7JsonModal } from './components/HL7JsonModal';
import { PrintDerivationModal } from './components/PrintDerivationModal';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('screen_1_ingest');
  const [patient, setPatient] = useState<PatientData>(INITIAL_PATIENT);
  const [vitals, setVitals] = useState<ClinicalVitals>(INITIAL_VITALS);
  const [document, setDocument] = useState<DocumentMetadata>(INITIAL_DOCUMENT);
  const [queue, setQueue] = useState<IngestQueueItem[]>(MOCK_QUEUE);

  // Modals state
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSelectSampleCase = (caseType: 'tep' | 'rx' | 'pelvis' | 'malware') => {
    if (caseType === 'tep') {
      setDocument(INITIAL_DOCUMENT);
      setVitals(INITIAL_VITALS);
      setPatient(INITIAL_PATIENT);
      showToast('Caso cargado: TEP Masivo Agudo (C1)');
    } else if (caseType === 'rx') {
      setDocument({
        ...INITIAL_DOCUMENT,
        fileName: 'Receta_Farmaco_Apixaban_Manuscrita.tiff',
        docType: 'Receta Médica Ambulatoria (DOAC)'
      });
      showToast('Caso cargado: Receta con ambigüedad caligráfica');
    }
  };

  return (
    <div className="min-h-screen bg-[#F6FAF8] text-[#1A2F2B] flex flex-col font-sans">
      {/* Top Application Header with Navigation Stepper */}
      <Header
        currentScreen={currentScreen}
        onSelectScreen={(screen) => setCurrentScreen(screen)}
        onOpenQueueModal={() => setIsQueueModalOpen(true)}
        isCriticalAlertActive={currentScreen === 'screen_4_critical_alert'}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {currentScreen === 'screen_1_ingest' && (
          <Screen1Ingest
            onAdvanceToProcessing={() => setCurrentScreen('screen_2_processing')}
            onOpenQueueModal={() => setIsQueueModalOpen(true)}
            document={document}
            queue={queue}
            onSelectSampleCase={handleSelectSampleCase}
          />
        )}

        {currentScreen === 'screen_2_processing' && (
          <Screen2Processing
            onAdvanceToCockpit={() => setCurrentScreen('screen_3_integrated')}
            document={document}
            vitals={vitals}
          />
        )}

        {currentScreen === 'screen_3_integrated' && (
          <Screen3IntegratedCockpit
            onGoToCriticalAlert={() => setCurrentScreen('screen_4_critical_alert')}
            onGoToHumanReview={() => setCurrentScreen('screen_5_human_review')}
            onGoToDelivered={() => {
              showToast('Documento aprobado y enrutado a Urgencias');
              setCurrentScreen('screen_6_delivered');
            }}
            patient={patient}
            document={document}
            vitals={vitals}
          />
        )}

        {currentScreen === 'screen_4_critical_alert' && (
          <Screen4CriticalAlert
            onAdvanceToHumanReview={() => setCurrentScreen('screen_5_human_review')}
            onAdvanceToDelivered={() => {
              showToast('Protocolo de rescate activado');
              setCurrentScreen('screen_6_delivered');
            }}
            vitals={vitals}
            patient={patient}
            document={document}
          />
        )}

        {currentScreen === 'screen_5_human_review' && (
          <Screen5HumanReview
            onConfirmAndResolve={() => {
              showToast('Corrección confirmada: Apixabán 5 mg validado y resuelto');
              setCurrentScreen('screen_6_delivered');
            }}
            onRejectDocument={() => {
              showToast('Documento rechazado para recolección clínica');
              setCurrentScreen('screen_1_ingest');
            }}
            patient={patient}
            document={document}
          />
        )}

        {currentScreen === 'screen_6_delivered' && (
          <Screen6Delivered
            onRestartFlow={() => {
              showToast('Iniciando nuevo flujo de ingesta');
              setCurrentScreen('screen_1_ingest');
            }}
            onOpenQueueModal={() => setIsQueueModalOpen(true)}
            onOpenJsonModal={() => setIsJsonModalOpen(true)}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
            patient={patient}
            document={document}
            vitals={vitals}
          />
        )}
      </main>

      {/* Docked Telemetry Bottom Bar */}
      <Footer
        latency="14ms"
        bufferPercent="99.4%"
        isRedAlert={currentScreen === 'screen_4_critical_alert'}
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-12 right-6 z-50 bg-[#1E5A52] text-white px-4 py-2.5 rounded-lg shadow-xl border border-[#8ED1A4] flex items-center gap-2 text-xs font-semibold animate-fadeIn">
          <span className="material-symbols-outlined text-base text-[#8ED1A4]">info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal: Real-time Hospital Urgency Queue Monitor */}
      <QueueMonitorModal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        onSelectPatientDoc={(docId) => {
          showToast(`Cargado documento ${docId} en el cockpit`);
          setCurrentScreen('screen_3_integrated');
        }}
      />

      {/* Modal: HL7 FHIR JSON Resource Viewer */}
      <HL7JsonModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
      />

      {/* Modal: Printable Clinical Derivation Form */}
      <PrintDerivationModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        patient={patient}
        document={document}
        vitals={vitals}
      />
    </div>
  );
}
