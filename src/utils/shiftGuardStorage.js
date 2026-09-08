/**
 * Shift, On-Call Guards & Substitute Coverages Storage for IntegraMed
 */

import {
  loadPayloadCollection,
  upsertPayloadItem,
  deletePayloadItem,
  preferRemote
} from '../services/fhirPayloadStore.js';

export const GUARD_TYPES = {
  presential_24h: {
    id: 'presential_24h',
    labelEs: 'Guardia Presencial 24 Horas',
    labelEn: '24-Hour Presential Guard',
    hours: '08:00 - 08:00 (+1 día)',
    color: '#e11d48',
    bgColor: '#ffe4e6',
    badgeClass: 'badge-rose'
  },
  night_12h: {
    id: 'night_12h',
    labelEs: 'Guardia Nocturna 12 Horas',
    labelEn: '12-Hour Night Guard',
    hours: '20:00 - 08:00',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    badgeClass: 'badge-purple'
  },
  on_call_passive: {
    id: 'on_call_passive',
    labelEs: 'Guardia Pasiva / Localizable (On-Call)',
    labelEn: 'Passive / On-Call Duty',
    hours: 'Localizable por radiolocalizador/celular',
    color: '#0284c7',
    bgColor: '#e0f2fe',
    badgeClass: 'badge-sky'
  },
  weekend_day: {
    id: 'weekend_day',
    labelEs: 'Guardia Fin de Semana Diurna',
    labelEn: 'Weekend Day Guard',
    hours: '08:00 - 20:00 (Sáb / Dom)',
    color: '#d97706',
    bgColor: '#fef3c7',
    badgeClass: 'badge-amber'
  }
};

export const INITIAL_GUARDS = [
  {
    id: 'g-1',
    date: '2026-09-07',
    practitionerId: 'staff-jesus-robledo',
    practitionerName: 'Dr. Jesús Robledo',
    role: 'doctor',
    guardType: 'presential_24h',
    locationName: 'Plantel Santa Fe — Sede Principal',
    department: 'Urgencias Médicas y Triage',
    shiftHours: '08:00 - 08:00 (+1)',
    status: 'scheduled',
    notes: 'Jefe de guardia médica presencial'
  },
  {
    id: 'g-2',
    date: '2026-09-07',
    practitionerId: 'staff-lluvia-robledo',
    practitionerName: 'Enf. Lluvia Robledo',
    role: 'nurse',
    guardType: 'night_12h',
    locationName: 'Plantel Santa Fe — Sede Principal',
    department: 'Estación de Terapia y Choque',
    shiftHours: '20:00 - 08:00',
    status: 'scheduled',
    notes: 'Guardia nocturna de enfermería y cuidados críticos'
  },
  {
    id: 'g-3',
    date: '2026-09-08',
    practitionerId: 'staff-edgar-robledo',
    practitionerName: 'Dr. Edgar Robledo',
    role: 'doctor',
    guardType: 'night_12h',
    locationName: 'Plantel Pedregal — Clínica de Especialidades',
    department: 'Medicina General y Consulta Continua',
    shiftHours: '20:00 - 08:00',
    status: 'scheduled',
    notes: 'Médico de guardia continua'
  },
  {
    id: 'g-4',
    date: '2026-09-09',
    practitionerId: 'staff-carmen-saldana',
    practitionerName: 'Enf. Carmen Saldaña',
    role: 'nurse',
    guardType: 'night_12h',
    locationName: 'Plantel Santa Fe — Sede Principal',
    department: 'Triage de Urgencias',
    shiftHours: '20:00 - 08:00',
    status: 'scheduled',
    notes: 'Guardia nocturna'
  },
  {
    id: 'g-5',
    date: '2026-09-12',
    practitionerId: 'staff-sofia-mendiola',
    practitionerName: 'Lic. Sofía Mendiola',
    role: 'therapist',
    guardType: 'weekend_day',
    locationName: 'Plantel Polanco — Centro de Rehabilitación',
    department: 'Rehabilitación Integral',
    shiftHours: '08:00 - 16:00',
    status: 'scheduled',
    notes: 'Guardia de fin de semana para terapia programada'
  }
];

export const INITIAL_COVERAGES = [
  {
    id: 'cov-1',
    date: '2026-09-10',
    originalPractitionerId: 'staff-edgar-robledo',
    originalPractitionerName: 'Dr. Edgar Robledo',
    substitutePractitionerId: 'staff-jesus-robledo',
    substitutePractitionerName: 'Dr. Jesús Robledo',
    role: 'doctor',
    shiftType: 'morning',
    shiftHours: '08:00 - 14:00',
    locationName: 'Plantel Santa Fe',
    reasonType: 'congress',
    reason: 'Asistencia al Congreso Nacional de Medicina Interna y Fisioterapia',
    status: 'approved',
    approvedBy: 'Dirección Médica IntegraMed',
    notes: 'Relevo asignado y confirmado para cubrir 8 consultas programadas.'
  },
  {
    id: 'cov-2',
    date: '2026-09-15',
    originalPractitionerId: 'staff-lluvia-robledo',
    originalPractitionerName: 'Enf. Lluvia Robledo',
    substitutePractitionerId: 'staff-carmen-saldana',
    substitutePractitionerName: 'Enf. Carmen Saldaña',
    role: 'nurse',
    shiftType: 'morning',
    shiftHours: '07:00 - 15:00',
    locationName: 'Plantel Santa Fe',
    reasonType: 'vacation',
    reason: 'Periodo vacacional semestral',
    status: 'approved',
    approvedBy: 'Jefatura de Enfermería',
    notes: 'Relevo completo en estación de enfermería A.'
  },
  {
    id: 'cov-3',
    date: '2026-09-18',
    originalPractitionerId: 'staff-mariana-dominguez',
    originalPractitionerName: 'Enf. Mariana Domínguez',
    substitutePractitionerId: 'staff-lluvia-robledo',
    substitutePractitionerName: 'Enf. Lluvia Robledo',
    role: 'nurse',
    shiftType: 'morning',
    shiftHours: '08:00 - 15:30',
    locationName: 'Plantel Santa Fe',
    reasonType: 'medical_leave',
    reason: 'Incapacidad médica por salud personal',
    status: 'pending',
    approvedBy: 'Pendiente de confirmación',
    notes: 'Solicitud de sustituto ingresada por jefa de piso.'
  }
];

const GUARDS_STORAGE_KEY = 'integramed_guards_schedule';
const COVERAGES_STORAGE_KEY = 'integramed_staff_coverages';

export function getGuards() {
  try {
    const raw = localStorage.getItem(GUARDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error reading guards schedule', e);
  }
  try {
    localStorage.setItem(GUARDS_STORAGE_KEY, JSON.stringify(INITIAL_GUARDS));
  } catch {}
  return INITIAL_GUARDS;
}

export function saveGuards(guardsList) {
  try {
    localStorage.setItem(GUARDS_STORAGE_KEY, JSON.stringify(guardsList));
  } catch (e) {
    console.error('Failed to save guards list', e);
  }
}

export function saveGuard(guardData) {
  const list = getGuards();
  const index = list.findIndex(g => g.id === guardData.id);
  let updated;
  if (index >= 0) {
    updated = [...list];
    updated[index] = { ...updated[index], ...guardData };
  } else {
    updated = [guardData, ...list];
  }
  saveGuards(updated);
  const saved = updated.find(g => g.id === guardData.id) || guardData;
  upsertPayloadItem({
    resourceType: 'Appointment',
    kind: 'guard',
    item: saved,
    buildBase: (p) => ({
      status: p.status === 'cancelled' ? 'cancelled' : 'booked',
      description: p.notes || p.department,
      start: p.date ? `${p.date}T08:00:00` : undefined,
      participant: [{ actor: { display: p.practitionerName }, status: 'accepted' }]
    })
  }).catch((err) => console.info('FHIR guard Appointment sync skipped:', err.message));
  return updated;
}

export function deleteGuard(guardId) {
  const list = getGuards();
  const target = list.find(g => g.id === guardId);
  const updated = list.filter(g => g.id !== guardId);
  saveGuards(updated);
  if (target?.fhirId) deletePayloadItem('Appointment', target.fhirId);
  return updated;
}

export function getCoverages() {
  try {
    const raw = localStorage.getItem(COVERAGES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error reading coverages', e);
  }
  try {
    localStorage.setItem(COVERAGES_STORAGE_KEY, JSON.stringify(INITIAL_COVERAGES));
  } catch {}
  return INITIAL_COVERAGES;
}

export function saveCoverages(coveragesList) {
  try {
    localStorage.setItem(COVERAGES_STORAGE_KEY, JSON.stringify(coveragesList));
  } catch (e) {
    console.error('Failed to save coverages list', e);
  }
}

export function saveCoverage(coverageData) {
  const list = getCoverages();
  const index = list.findIndex(c => c.id === coverageData.id);
  let updated;
  if (index >= 0) {
    updated = [...list];
    updated[index] = { ...updated[index], ...coverageData };
  } else {
    updated = [coverageData, ...list];
  }
  saveCoverages(updated);
  const saved = updated.find(c => c.id === coverageData.id) || coverageData;
  upsertPayloadItem({
    resourceType: 'Appointment',
    kind: 'coverage',
    item: saved,
    buildBase: (p) => ({
      status: 'booked',
      description: p.reason || 'Cobertura / suplencia',
      start: p.date ? `${p.date}T08:00:00` : undefined,
      participant: [{ actor: { display: p.substituteName || p.practitionerName }, status: 'accepted' }]
    })
  }).catch((err) => console.info('FHIR coverage Appointment sync skipped:', err.message));
  return updated;
}

export function deleteCoverage(coverageId) {
  const list = getCoverages();
  const target = list.find(c => c.id === coverageId);
  const updated = list.filter(c => c.id !== coverageId);
  saveCoverages(updated);
  if (target?.fhirId) deletePayloadItem('Appointment', target.fhirId);
  return updated;
}

export async function loadShiftGuardFromFhir() {
  const [guards, coverages] = await Promise.all([
    loadPayloadCollection('Appointment', 'guard'),
    loadPayloadCollection('Appointment', 'coverage')
  ]);
  const g = preferRemote(guards, getGuards());
  const c = preferRemote(coverages, getCoverages());
  saveGuards(g);
  saveCoverages(c);
  return { guards: g, coverages: c };
}

export function resetShiftGuardData() {
  saveGuards(INITIAL_GUARDS);
  saveCoverages(INITIAL_COVERAGES);
  return { guards: INITIAL_GUARDS, coverages: INITIAL_COVERAGES };
}
