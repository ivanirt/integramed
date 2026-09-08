/**
 * Persistent Appointment & Encounter Storage for IntegraMed
 * Manages full CRUD for clinic appointments across Monday to Sunday (08:00 - 22:00)
 * Persists in LocalStorage and syncs with FHIR server.
 */

import { generateWeeklySampleEncounters } from './weeklyAgendaData.js';
import { createEncounter, updateEncounter, deleteEncounter } from '../services/fhirApi.js';

const STORAGE_KEY = 'integramed_weekly_appointments_v2';

export const APPOINTMENT_STATUS_OPTIONS = [
  { id: 'planned', label: 'Programada', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  { id: 'confirmed', label: 'Confirmada', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
  { id: 'waiting', label: 'En espera', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  { id: 'in_room', label: 'En sala', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { id: 'in_consultation', label: 'En consulta', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
  { id: 'finished', label: 'Finalizada', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  { id: 'cancelled', label: 'Cancelada', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' }
];

/**
 * Retrieve all appointments from persistent storage
 */
export function getStoredAppointments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse appointments from storage, generating seed:', err);
  }

  // Initialize with weekly sample encounters
  const initial = generateWeeklySampleEncounters(new Date());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch (e) {
    console.error('Storage write error:', e);
  }
  return initial;
}

/**
 * Save complete appointments array to storage & notify subscribers
 */
export function saveStoredAppointments(appointments) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
    window.dispatchEvent(new CustomEvent('integramed_appointments_changed', { detail: appointments }));
    return true;
  } catch (err) {
    console.error('Failed to save appointments:', err);
    return false;
  }
}

/**
 * CREATE: Add a new appointment
 */
export async function createAppointment(data) {
  const all = getStoredAppointments();
  const id = data.id || `appt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Determine normalized date & time
  let date = data.date || '';
  let time = data.time || '';

  if (data.startTime && (!date || !time)) {
    try {
      if (typeof data.startTime === 'string' && data.startTime.includes('T')) {
        const [dPart, tPart] = data.startTime.split('T');
        if (!date) date = dPart.slice(0, 10);
        if (!time) time = tPart.slice(0, 5);
      } else {
        const d = new Date(data.startTime);
        if (!date) {
          date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        if (!time) {
          time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
      }
    } catch {}
  }

  const statusCfg = APPOINTMENT_STATUS_OPTIONS.find(s => s.id === data.status) || APPOINTMENT_STATUS_OPTIONS[0];

  const newAppt = {
    id,
    date,
    time: time || '09:00',
    period: {
      start: `${date}T${time || '09:00'}:00`,
      end: `${date}T${time || '09:00'}:30`
    },
    patientId: data.patientId || '',
    patientName: data.patientName || 'Paciente General',
    practitionerId: data.practitionerId || '',
    practitionerName: data.practitionerName || 'Dr. Alejandro Morales',
    practitionerSpecialty: data.practitionerSpecialty || 'Medicina General',
    reason: data.reason || 'Consulta médica',
    status: data.status || 'planned',
    statusLabel: statusCfg.label,
    room: data.room || 'Consultorio 101',
    subject: {
      display: data.patientName || 'Paciente General',
      reference: data.patientId ? `Patient/${data.patientId}` : undefined
    },
    participant: [
      {
        individual: {
          display: data.practitionerName || 'Dr. Alejandro Morales',
          reference: data.practitionerId ? `Practitioner/${data.practitionerId}` : undefined
        }
      }
    ],
    reasonCode: [{ text: data.reason || 'Consulta médica' }],
    type: [{ text: data.type || 'Consulta General' }],
    createdAt: new Date().toISOString()
  };

  const updated = [newAppt, ...all];
  saveStoredAppointments(updated);

  // Sync with FHIR server if available
  try {
    await createEncounter({
      patientId: newAppt.patientId || 'temp-patient',
      patientName: newAppt.patientName,
      practitionerId: newAppt.practitionerId,
      practitionerName: newAppt.practitionerName,
      type: newAppt.type?.[0]?.text,
      status: newAppt.status,
      startTime: newAppt.period.start,
      reason: newAppt.reason
    });
  } catch (fhirErr) {
    console.info('FHIR background sync skipped or offline:', fhirErr.message);
  }

  return newAppt;
}

/**
 * UPDATE: Modify an existing appointment
 */
export async function updateAppointment(id, fields) {
  const all = getStoredAppointments();
  let found = false;
  let updatedItem = null;

  const updated = all.map(appt => {
    if (appt.id === id) {
      found = true;
      const statusCfg = APPOINTMENT_STATUS_OPTIONS.find(s => s.id === (fields.status || appt.status));

      // Recompute period if date or time changed
      const newDate = fields.date || appt.date;
      const newTime = fields.time || appt.time;
      const newPeriod = (fields.date || fields.time) ? {
        start: `${newDate}T${newTime}:00`,
        end: `${newDate}T${newTime}:30`
      } : appt.period;

      updatedItem = {
        ...appt,
        ...fields,
        date: newDate,
        time: newTime,
        period: newPeriod,
        statusLabel: statusCfg ? statusCfg.label : appt.statusLabel,
        subject: {
          ...appt.subject,
          display: fields.patientName || appt.patientName
        },
        participant: [
          {
            individual: {
              ...appt.participant?.[0]?.individual,
              display: fields.practitionerName || appt.practitionerName
            }
          }
        ],
        reasonCode: [{ text: fields.reason || appt.reason }],
        updatedAt: new Date().toISOString()
      };
      return updatedItem;
    }
    return appt;
  });

  if (found) {
    saveStoredAppointments(updated);

    // Sync with FHIR server in background if possible
    try {
      await updateEncounter(id, {
        patientId: updatedItem.patientId,
        patientName: updatedItem.patientName,
        practitionerId: updatedItem.practitionerId,
        practitionerName: updatedItem.practitionerName,
        type: updatedItem.type?.[0]?.text,
        status: updatedItem.status,
        startTime: updatedItem.period?.start,
        reason: updatedItem.reason
      });
    } catch (fhirErr) {
      console.info('FHIR background sync for update skipped or offline:', fhirErr.message);
    }
  }

  return updatedItem;
}

/**
 * DELETE: Remove / Cancel an appointment
 */
export async function deleteAppointment(id) {
  const all = getStoredAppointments();
  const filtered = all.filter(a => a.id !== id);
  saveStoredAppointments(filtered);

  // Sync with FHIR server in background
  try {
    await deleteEncounter(id);
  } catch (fhirErr) {
    console.info('FHIR background delete skipped or offline:', fhirErr.message);
  }

  return true;
}

/**
 * Reset all appointments to weekly default
 */
export function resetAppointmentsToDefault() {
  const initial = generateWeeklySampleEncounters(new Date());
  saveStoredAppointments(initial);
  return initial;
}
