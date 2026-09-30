import { PatientData, DocumentMetadata, ClinicalVitals, IngestQueueItem } from '../types';

export const INITIAL_PATIENT: PatientData = {
  id: 'PAC-8492-CO',
  name: 'Carlos Mendoza Lagos',
  age: 52,
  gender: 'Masculino',
  cedula: '79.845.109',
  anonymizedCedula: '**.***.109',
  anonymizedToken: '[PAC-8492-CO]',
  service: 'Urgencias Cardiorrespiratorias (Reanimación Adultos)',
  assignedBox: 'Box Reanimación 01',
  ingestTimestamp: '17-10-2024 03:42 hrs'
};

export const INITIAL_VITALS: ClinicalVitals = {
  heartRate: 118,
  heartRateStatus: 'taquicardia',
  spO2: 89,
  spO2Status: 'hipoxemia_severa',
  bloodPressureSystolic: 90,
  bloodPressureDiastolic: 60,
  bloodPressureStatus: 'limite',
  respiratoryRate: 26,
  respiratoryRateStatus: 'taquipnea',
  news2Score: 8,
  news2Risk: 'Extremo'
};

export const INITIAL_DOCUMENT: DocumentMetadata = {
  id: '#DOC-8492',
  uuid: 'd9b821-4f11-9a7',
  fileName: 'Epicrisis_AngioTC_TEP_Agudo.pdf',
  docType: 'Informe de Tomografía Axial Computarizada de Tórax (AngioTC)',
  loincCode: '24627-2',
  protocol: 'Sospecha de Tromboembolismo Pulmonar Agudo (TEP)',
  sizeBytes: 2201842,
  sha256: '9e8a5b2fe4c88f3a992bc0148f98c76da34b8212',
  format: 'PDF v1.7 Válido (Texto + OCR)',
  status: 'validado',
  confidence: 95,
  doctorInCharge: 'Dra. Valeria Pérez',
  doctorReg: '#MED-9482'
};

export const MOCK_QUEUE: IngestQueueItem[] = [
  {
    id: 'DOC-8492',
    fileName: 'Epicrisis_Torax_Agudo.pdf',
    stage: 'VALIDANDO',
    location: 'Urgencia C2 • Box 03',
    priority: 'C1',
    timeAgo: 'Hace 42s'
  },
  {
    id: 'DOC-8491',
    fileName: 'RX_Pelvis_Trauma.dcm',
    stage: 'EN COLA',
    location: 'Ambulancia Línea 123 • En ruta',
    priority: 'C1',
    timeAgo: 'Hace 2m'
  },
  {
    id: 'DOC-8490',
    fileName: 'Receta_Farmaco_Manuscrita.jpg',
    stage: 'OCR SCAN',
    location: 'Consulta Externa',
    priority: 'C3',
    timeAgo: 'Hace 5m'
  },
  {
    id: 'DOC-8489',
    fileName: 'TAC_Cerebro_ACV_Agudo.dcm',
    stage: 'REVISIÓN',
    location: 'Neurología Vascular • Box 01',
    priority: 'C1',
    timeAgo: 'Hace 8m'
  }
];

export const FHIR_BUNDLE_SAMPLE = {
  resourceType: "Bundle",
  id: "bundle-mediflow-8492",
  meta: {
    lastUpdated: "2025-09-24T03:40:05.112Z",
    profile: ["http://hl7.org/fhir/StructureDefinition/Bundle"]
  },
  type: "document",
  timestamp: "2025-09-24T03:40:05Z",
  entry: [
    {
      resource: {
        resourceType: "Composition",
        id: "comp-triage-8492",
        status: "final",
        type: {
          coding: [
            {
              system: "http://loinc.org",
              code: "24627-2",
              display: "CT Chest Angiography with contrast"
            }
          ]
        },
        subject: {
          reference: "Patient/PAC-8492-CO",
          display: "[PAC-8492-CO]"
        },
        author: [
          {
            display: "MediFlow Autonomous Triage Engine v6.0"
          },
          {
            display: "Dra. Valeria Pérez (Guardia Urgencias #MED-9482)"
          }
        ],
        title: "Informe Determinístico de Triage Urgencia"
      }
    },
    {
      resource: {
        resourceType: "Observation",
        id: "obs-news2-8492",
        status: "final",
        code: {
          coding: [{ system: "http://loinc.org", code: "96552-5", display: "National Early Warning Score 2" }]
        },
        valueInteger: 8,
        interpretation: [{ text: "Riesgo Clínico Extremo (Alerta Roja Inmediata)" }]
      }
    },
    {
      resource: {
        resourceType: "Condition",
        id: "cond-tep-8492",
        clinicalStatus: { coding: [{ code: "active" }] },
        verificationStatus: { coding: [{ code: "confirmed" }] },
        code: {
          coding: [
            {
              system: "http://hl7.org/fhir/sid/icd-10",
              code: "I26.9",
              display: "Tromboembolismo Pulmonar masivo sin mención de cor pulmonale agudo"
            }
          ]
        },
        subject: { reference: "Patient/PAC-8492-CO" }
      }
    },
    {
      resource: {
        resourceType: "MedicationRequest",
        id: "med-apixaban-8492",
        status: "active",
        intent: "order",
        medicationCodeableConcept: {
          coding: [{ system: "http://www.whocc.no/atc", code: "B01AF02", display: "Apixabán" }]
        },
        dosageInstruction: [
          {
            text: "5 mg vía oral cada 12 horas por 7 días (Dosis habitual TEP/TVP)",
            timing: { repeat: { frequency: 2, period: 1, periodUnit: "d" } },
            doseAndRate: [{ doseQuantity: { value: 5, unit: "mg" } }]
          }
        ]
      }
    },
    {
      resource: {
        resourceType: "Provenance",
        id: "prov-ledger-948192",
        target: [{ reference: "Composition/comp-triage-8492" }],
        recorded: "2025-09-24T03:40:05Z",
        activity: { coding: [{ code: "autonomous-routing" }] },
        signature: [
          {
            type: [{ code: "proof-of-verification" }],
            when: "2025-09-24T03:40:05Z",
            who: { display: "MediFlow Sentinel Node #CO-SND-01" },
            data: "ZTRjODhmM2E5OTJiYzAxNDhmOThjNzZkYTM0YjgyMTI="
          }
        ]
      }
    }
  ]
};
