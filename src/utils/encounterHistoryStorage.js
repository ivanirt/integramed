/**
 * Storage and mock seed utility for Clinical Encounters / Consultation History.
 * Stores full SOAP notes, vitals, diagnoses, and prescriptions for previous patient visits.
 */

import { updateEncounter, deleteEncounter } from '../services/fhirApi.js';

const STORAGE_KEY = 'integramed_patient_encounters_history';

// Realistic sample previous encounters for demo patients
export const DEFAULT_PAST_ENCOUNTERS = [
  {
    id: 'enc-mariana-003',
    patientId: 'mariana-silva',
    patientName: 'Mariana Silva Ruiz',
    date: '2026-06-12T10:30:00Z',
    type: 'Consulta de Seguimiento HTA',
    status: 'finished',
    practitionerName: 'Dr. Jesús Robledo',
    practitionerSpecialty: 'Medicina Interna',
    locationName: 'Plantel Central - Consultorio 102',
    reason: 'Control trimestral de HTA y ajuste de tratamiento antihipertensivo.',
    summary: 'Presión arterial en metas (124/80 mmHg). Se renueva Losartán 50mg y se solicitan laboratorios de control.',
    vitals: {
      bloodPressure: '124/80',
      heartRate: '72',
      temperature: '36.5',
      respiratoryRate: '16',
      oxygenSaturation: '99',
      weight: '62.8',
      height: '165',
      bmi: '23.1'
    },
    subjective: 'Paciente femenina acude a su consulta trimestral de control para Hipertensión Arterial. Refiere buena tolerancia al Losartán 50mg, sin mareos ortostáticos ni edemas. Menciona leve estrés laboral ocasional pero niega cefaleas intensas o palpitaciones.',
    physicalExam: 'Paciente orientada en tiempo, espacio y persona. Buen estado general. Cuello sin ingurgitación yugular ni soplos carotídeos. Cardiopulmonar: ruidos cardíacos rítmicos, regulares, no soplos. Campos pulmonares bien ventilados sin estertores ni sibilancias. Abdomen blando, no doloroso. Extremidades sin edema.',
    diagnoses: [
      { code: 'BA00', label: 'Hipertensión esencial' },
      { code: '8A80', label: 'Asma leve intermitente' }
    ],
    assessment: 'Hipertensión arterial esencial estadio I bajo adecuado control terapéutico. Asma leve intermitente sin exacerbaciones recientes.',
    plan: '1. Mantener Losartán 50 mg VO cada 24 horas por las mañanas.\n2. Continuar Salbutamol 100 mcg inhalador solo en caso de rescate (PRN).\n3. Solicitar perfil lipídico, glucosa en ayunas, creatinina sérica y examen general de orina.\n4. Mantener dieta DASH baja en sodio y actividad física aeróbica 150 min/semana.\n5. Próxima cita de control en 3 meses.',
    medications: [
      { name: 'Losartán 50mg', dosage: '1 tableta cada 24h', duration: '90 días' },
      { name: 'Salbutamol 100mcg', dosage: '1-2 disparos PRN', duration: 'Según necesidad' }
    ]
  },
  {
    id: 'enc-mariana-002',
    patientId: 'mariana-silva',
    patientName: 'Mariana Silva Ruiz',
    date: '2026-03-05T09:15:00Z',
    type: 'Revisión por Exacerbación Asmática Leve',
    status: 'finished',
    practitionerName: 'Dra. Elena Torres Morales',
    practitionerSpecialty: 'Neumología y Medicina General',
    locationName: 'Plantel Central - Consultorio 105',
    reason: 'Cuadro de tos seca, sibilancias nocturnas y opresión torácica tras cambio de clima.',
    summary: 'Broncoespasmo leve resuelto en consulta con Salbutamol en aerosol. Se ajustan medidas ambientales.',
    vitals: {
      bloodPressure: '130/84',
      heartRate: '84',
      temperature: '36.7',
      respiratoryRate: '20',
      oxygenSaturation: '96',
      weight: '63.0',
      height: '165',
      bmi: '23.1'
    },
    subjective: 'Refiere 4 días con tos seca predominantemente nocturna, sensación de "pecho cerrado" y ligera disnea al subir escaleras. Sin fiebre ni rinorrea purulenta.',
    physicalExam: 'Faringe normal, sin exudados. Auscultación pulmonar con sibilancias espiratorias bilaterales dispersas de tono agudo. Sin tiraje intercostal. Ruidos cardíacos rítmicos sin soplos.',
    diagnoses: [
      { code: '8A80', label: 'Asma leve con exacerbación aguda' },
      { code: 'BA00', label: 'Hipertensión esencial' }
    ],
    assessment: 'Crisis asmática leve desencadenada por factores ambientales (frío/alérgenos). Buena respuesta a broncodilatador de acción corta.',
    plan: '1. Salbutamol 100mcg inhalador: 2 inhalaciones cada 6 horas por 5 días, luego solo por razón necesaria.\n2. Evitar exposición a polvos y cambios bruscos de temperatura.\n3. Mantener su medicación antihipertensiva habitual (Losartán 50mg).\n4. Cita abierta a urgencias si presenta disnea en reposo o cianosis.',
    medications: [
      { name: 'Salbutamol 100mcg aerosol', dosage: '2 disparos c/6h por 5 días', duration: '5 días' },
      { name: 'Losartán 50mg', dosage: '1 tableta cada 24h', duration: 'Continuo' }
    ]
  },
  {
    id: 'enc-mariana-001',
    patientId: 'mariana-silva',
    patientName: 'Mariana Silva Ruiz',
    date: '2025-11-18T11:00:00Z',
    type: 'Chequeo Médico Preventivo Anual',
    status: 'finished',
    practitionerName: 'Dr. Marco Aurelio Soto',
    practitionerSpecialty: 'Medicina Familiar',
    locationName: 'Sede Norte - Consultorio 204',
    reason: 'Examen de salud preventivo anual, revisión de perfil metabólico y despistaje.',
    summary: 'Evaluación integral favorable. Se detecta PA limítrofe en consulta, se inicia bitácora de automonitoreo domiciliario.',
    vitals: {
      bloodPressure: '135/88',
      heartRate: '76',
      temperature: '36.4',
      respiratoryRate: '15',
      oxygenSaturation: '99',
      weight: '63.5',
      height: '165',
      bmi: '23.3'
    },
    subjective: 'Acude a revisión anual de medicina preventiva asintomática. Refiere trabajo de oficina sedentario y dieta con moderado consumo de sodio.',
    physicalExam: 'Hábito constitucional normal. Cabeza y cuello sin alteraciones. Cardiopulmonar normal. Abdomen blando, depresible, no visceromegalias. Pulsos periféricos simétricos.',
    diagnoses: [
      { code: 'BA00', label: 'Hipertensión arterial estadio 1' },
      { code: 'QA00', label: 'Examen médico de rutina' }
    ],
    assessment: 'Paciente femenina de 33 años con cifras tensionales en rango de HTA grado I. Antecedente de asma leve controlada.',
    plan: '1. Bitácora de automonitoreo de presión arterial (mañana y noche) durante 7 días.\n2. Laboratorios de rutina: Biometría hemática, química sanguínea de 6 elementos, perfil lipídico.\n3. Recomendar disminución de sal en la dieta y caminata diaria de 30 minutos.\n4. Cita de revaloración con resultados de bitácora en 2 semanas.',
    medications: []
  },
  {
    id: 'enc-carlos-001',
    patientId: 'carlos-mendoza',
    patientName: 'Carlos Mendoza Morales',
    date: '2026-05-20T11:30:00Z',
    type: 'Control de Diabetes Tipo 2',
    status: 'finished',
    practitionerName: 'Dr. Jesús Robledo',
    practitionerSpecialty: 'Medicina Interna',
    locationName: 'Plantel Central - Consultorio 102',
    reason: 'Revisión semestral de HbA1c y ajuste farmacológico de Metformina.',
    summary: 'HbA1c en 6.8%. Buen apego a estilo de vida y medicación oral.',
    vitals: {
      bloodPressure: '122/78',
      heartRate: '70',
      temperature: '36.6',
      respiratoryRate: '16',
      oxygenSaturation: '98',
      weight: '78.5',
      height: '174',
      bmi: '25.9'
    },
    subjective: 'Paciente masculino de 52 años acude a control de Diabetes Mellitus tipo 2. No refiere hipoglucemias ni polidipsia/poliuria.',
    physicalExam: 'Campos pulmonares limpios. Ruidos cardíacos normales. Pulsos pedios presentes y simétricos. Sensibilidad conservada con monofilamento en ambos pies.',
    diagnoses: [
      { code: '5A11', label: 'Diabetes mellitus tipo 2 sin complicaciones' }
    ],
    assessment: 'Diabetes tipo 2 en adecuado control metabólico sin signos de neuropatía ni nefropatía aparente.',
    plan: '1. Continuar Metformina 850mg con la cena.\n2. Cita con Oftalmología para fondo de ojo anual.\n3. Repetir HbA1c y microalbuminuria en 6 meses.',
    medications: [
      { name: 'Metformina 850mg', dosage: '1 tableta c/24h con cena', duration: '180 días' }
    ]
  }
];

/**
 * Get all stored patient encounters from LocalStorage (or initial defaults).
 */
export function getAllPatientEncounters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PAST_ENCOUNTERS));
      return DEFAULT_PAST_ENCOUNTERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_PAST_ENCOUNTERS;
  } catch {
    return DEFAULT_PAST_ENCOUNTERS;
  }
}

/**
 * Get past encounters for a specific patient ID, sorted newest first.
 * If exact ID doesn't match and patient is Mariana/Demo, returns relevant sample encounters.
 */
export function getPatientPastEncounters(patientId, patientName = '') {
  const all = getAllPatientEncounters();
  if (!patientId && !patientName) return all;

  const idNorm = String(patientId || '').toLowerCase();
  const nameNorm = String(patientName || '').toLowerCase();

  const matched = all.filter(enc => {
    const encPatId = String(enc.patientId || '').toLowerCase();
    const encPatName = String(enc.patientName || '').toLowerCase();

    if (encPatId === idNorm || idNorm.includes(encPatId) || encPatId.includes(idNorm)) {
      return true;
    }
    if (nameNorm && (encPatName.includes(nameNorm) || nameNorm.includes(encPatName))) {
      return true;
    }
    return false;
  });

  // If no match was found, provide the demo encounters adapted to this patient
  if (matched.length === 0) {
    const fallbackList = DEFAULT_PAST_ENCOUNTERS.slice(0, 3).map((enc, idx) => ({
      ...enc,
      id: `enc-${idNorm || 'pat'}-hist-${idx + 1}`,
      patientId: patientId || enc.patientId,
      patientName: patientName || enc.patientName
    }));
    return fallbackList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  return matched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Save a newly finished or updated encounter to the history storage.
 */
export function savePatientEncounter(encounterData) {
  try {
    const all = getAllPatientEncounters();
    const newEncounter = {
      id: encounterData.id || `enc-${Date.now()}`,
      date: encounterData.date || new Date().toISOString(),
      status: encounterData.status || 'finished',
      ...encounterData
    };

    // Filter out if updating an existing one
    const filtered = all.filter(e => e.id !== newEncounter.id);
    const updated = [newEncounter, ...filtered];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('integramed_encounters_updated', { detail: newEncounter }));
    return newEncounter;
  } catch (err) {
    console.error('Failed to save encounter history:', err);
    return encounterData;
  }
}

/**
 * Update an existing clinical encounter / note in history storage.
 */
export async function updatePatientEncounter(id, fields) {
  try {
    const all = getAllPatientEncounters();
    let updatedItem = null;

    const updated = all.map(enc => {
      if (enc.id === id) {
        updatedItem = {
          ...enc,
          ...fields,
          updatedAt: new Date().toISOString()
        };
        return updatedItem;
      }
      return enc;
    });

    if (updatedItem) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('integramed_encounters_updated', { detail: updatedItem }));

      // Background FHIR sync
      try {
        await updateEncounter(id, {
          patientId: updatedItem.patientId,
          patientName: updatedItem.patientName,
          type: updatedItem.type,
          status: updatedItem.status || 'finished',
          startTime: updatedItem.date,
          reason: updatedItem.reason || updatedItem.summary
        });
      } catch (fhirErr) {
        console.info('FHIR encounter update sync skipped or offline:', fhirErr.message);
      }
    }

    return updatedItem;
  } catch (err) {
    console.error('Failed to update patient encounter:', err);
    throw err;
  }
}

/**
 * Delete a clinical encounter / note from history storage.
 */
export async function deletePatientEncounter(id) {
  try {
    const all = getAllPatientEncounters();
    const filtered = all.filter(e => e.id !== id);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('integramed_encounters_updated', { detail: { deletedId: id } }));

    // Background FHIR sync
    try {
      await deleteEncounter(id);
    } catch (fhirErr) {
      console.info('FHIR encounter delete sync skipped or offline:', fhirErr.message);
    }

    return true;
  } catch (err) {
    console.error('Failed to delete patient encounter:', err);
    throw err;
  }
}

/**
 * Consultation Draft Management
 */
const DRAFT_KEY_PREFIX = 'integramed_consultation_draft_';

export function saveConsultationDraft(patientId, draftData) {
  if (!patientId) return null;
  try {
    const dataWithTimestamp = {
      ...draftData,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(`${DRAFT_KEY_PREFIX}${patientId}`, JSON.stringify(dataWithTimestamp));
    return dataWithTimestamp;
  } catch (e) {
    console.error('Failed to save consultation draft:', e);
    return null;
  }
}

export function getConsultationDraft(patientId) {
  if (!patientId) return null;
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY_PREFIX}${patientId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearConsultationDraft(patientId) {
  if (!patientId) return;
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${patientId}`);
  } catch {}
}

/**
 * Reset encounters history to factory default.
 */
export function resetEncountersHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PAST_ENCOUNTERS));
    window.dispatchEvent(new Event('integramed_encounters_updated'));
    return DEFAULT_PAST_ENCOUNTERS;
  } catch {
    return DEFAULT_PAST_ENCOUNTERS;
  }
}
