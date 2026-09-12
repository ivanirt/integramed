/**
 * Persistent Appointment & Encounter Storage for IntegraMed
 * Manages full CRUD for clinic appointments across Monday to Sunday (08:00 - 22:00)
 * Persists in LocalStorage and syncs with FHIR server.
 */

import {
  upsertPayloadItem,
  deletePayloadItem,
  preferRemote,
  readCachedArray,
  loadKindOrNative,
  mapNativeAppointment
} from '../services/fhirPayloadStore.js';
import {
  APPOINTMENT_STATUS_OPTIONS,
  decorateAppointmentStatus,
  fhirAppointmentStatus
} from './appointmentStatus.js';

const STORAGE_KEY = 'integramed_weekly_appointments_fhir';

export { APPOINTMENT_STATUS_OPTIONS };

/**
 * Retrieve all appointments from persistent storage
 */
export function getStoredAppointments() {
  return readCachedArray(STORAGE_KEY);
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

function weeklyFhirStatus(status) {
  return fhirAppointmentStatus(status);
}

async function persistAppointmentResource(appt) {
  const remote = await upsertPayloadItem({
    resourceType: 'Appointment',
    kind: 'appointment',
    item: appt,
    buildBase: (p) => ({
      status: weeklyFhirStatus(p.status),
      description: p.reason,
      start: p.period?.start,
      end: p.period?.end,
      participant: [
        {
          actor: {
            reference: p.patientId ? `Patient/${p.patientId}` : undefined,
            display: p.patientName
          },
          status: 'accepted'
        },
        {
          actor: {
            reference: p.practitionerId ? `Practitioner/${p.practitionerId}` : undefined,
            display: p.practitionerName
          },
          status: 'accepted'
        }
      ]
    })
  });
  if (remote?.fhirId) {
    const all = getStoredAppointments().map((a) => (a.id === appt.id ? { ...a, fhirId: remote.fhirId } : a));
    saveStoredAppointments(all);
  }
  return remote;
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

  const decorated = decorateAppointmentStatus(data.status || 'planned');

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
    status: decorated.status,
    statusLabel: decorated.label,
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

  try {
    await persistAppointmentResource(newAppt);
  } catch (fhirErr) {
    console.info('FHIR Appointment sync skipped:', fhirErr.message);
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
      const decorated = decorateAppointmentStatus(fields.status || appt.status);

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
        status: decorated.status,
        statusLabel: decorated.label,
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
      await persistAppointmentResource(updatedItem);
    } catch (fhirErr) {
      console.info('FHIR Appointment update skipped:', fhirErr.message);
    }
  }

  return updatedItem;
}

/**
 * DELETE: Remove / Cancel an appointment
 */
export async function deleteAppointment(id) {
  const all = getStoredAppointments();
  const target = all.find(a => a.id === id);
  const filtered = all.filter(a => a.id !== id);
  saveStoredAppointments(filtered);

  try {
    if (target?.fhirId) await deletePayloadItem('Appointment', target.fhirId);
  } catch (fhirErr) {
    console.info('FHIR background delete skipped or offline:', fhirErr.message);
  }

  return true;
}

export async function loadAppointmentsFromFhir() {
  const remote = await loadKindOrNative('Appointment', 'appointment', mapNativeAppointment);
  const merged = preferRemote(remote, getStoredAppointments());
  saveStoredAppointments(merged);
  window.dispatchEvent(new CustomEvent('integramed_appointments_changed', { detail: merged }));
  return merged;
}

export function resetAppointmentsToDefault() {
  saveStoredAppointments([]);
  return [];
}
