export type PipelineStage = 
  | '1_RECIBIDO'
  | '2_VALIDADO'
  | '3_CLASIFICADO'
  | '4_EXTRAIDO'
  | '5_EVALUADO'
  | '6_EN_REVISION'
  | '7_ENTREGADO';

export type ScreenId = 
  | 'screen_1_ingest'
  | 'screen_2_processing'
  | 'screen_3_integrated'
  | 'screen_4_critical_alert'
  | 'screen_5_human_review'
  | 'screen_6_delivered';

export interface ClinicalVitals {
  heartRate: number; // lpm
  heartRateStatus: 'normal' | 'taquicardia' | 'bradicardia';
  spO2: number; // %
  spO2Status: 'normal' | 'hipoxemia_leve' | 'hipoxemia_severa';
  bloodPressureSystolic: number; // mmHg
  bloodPressureDiastolic: number; // mmHg
  bloodPressureStatus: 'normal' | 'limite' | 'hipertension' | 'hipotension';
  respiratoryRate: number; // rpm
  respiratoryRateStatus: 'normal' | 'taquipnea';
  news2Score: number;
  news2Risk: 'Bajo' | 'Medio' | 'Extremo';
}

export interface PatientData {
  id: string;
  name: string;
  age: number;
  gender: 'Femenino' | 'Masculino';
  cedula: string;
  anonymizedCedula: string;
  anonymizedToken: string;
  service: string;
  assignedBox: string;
  ingestTimestamp: string;
}

export interface DocumentMetadata {
  id: string;
  uuid: string;
  fileName: string;
  docType: string;
  loincCode: string;
  protocol: string;
  sizeBytes: number;
  sha256: string;
  format: string;
  status: 'validando' | 'validado' | 'en_revision' | 'entregado' | 'rechazado';
  confidence: number;
  doctorInCharge: string;
  doctorReg: string;
}

export interface IngestQueueItem {
  id: string;
  fileName: string;
  stage: 'VALIDANDO' | 'EN COLA' | 'OCR SCAN' | 'REVISIÓN';
  location: string;
  priority: 'C1' | 'C2' | 'C3';
  timeAgo: string;
}
