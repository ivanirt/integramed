/**
 * Clinic appointment / consult lifecycle.
 * programada → confirmada → en espera → en sala → en consulta → finalizada
 * (cancelada can happen before finalizada)
 */

export const APPOINTMENT_STATUS_CONFIG = {
  planned: { label: 'Programada', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  confirmed: { label: 'Confirmada', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
  waiting: { label: 'En espera', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  in_room: { label: 'En sala', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  in_consultation: { label: 'En consulta', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
  finished: { label: 'Finalizada', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  cancelled: { label: 'Cancelada', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' }
};

export const APPOINTMENT_STATUS_FLOW = [
  'planned',
  'confirmed',
  'waiting',
  'in_room',
  'in_consultation',
  'finished'
];

export const APPOINTMENT_STATUS_OPTIONS = APPOINTMENT_STATUS_FLOW
  .concat('cancelled')
  .map((id) => ({ id, ...APPOINTMENT_STATUS_CONFIG[id] }));

const TERMINAL_STATUSES = new Set(['finished', 'cancelled']);

const STATUS_ALIASES = {
  proposed: 'planned',
  scheduled: 'planned',
  booked: 'confirmed',
  arrived: 'waiting',
  'checked-in': 'in_consultation',
  'in-progress': 'in_consultation',
  in_progress: 'in_consultation',
  fulfilled: 'finished',
  completed: 'finished',
  noshow: 'cancelled'
};

export function normalizeAppointmentStatus(status) {
  if (!status) return 'planned';
  const key = String(status).trim();
  if (APPOINTMENT_STATUS_CONFIG[key]) return key;
  return STATUS_ALIASES[key] || 'planned';
}

export function isTerminalAppointmentStatus(status) {
  return TERMINAL_STATUSES.has(normalizeAppointmentStatus(status));
}

export function decorateAppointmentStatus(status) {
  const id = normalizeAppointmentStatus(status);
  return { status: id, ...APPOINTMENT_STATUS_CONFIG[id] };
}

export function fhirAppointmentStatus(status) {
  switch (normalizeAppointmentStatus(status)) {
    case 'confirmed':
      return 'booked';
    case 'waiting':
    case 'in_room':
      return 'arrived';
    case 'in_consultation':
      return 'checked-in';
    case 'finished':
      return 'fulfilled';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'proposed';
  }
}

const MATCH_PRIORITY = [
  'in_consultation',
  'in_room',
  'waiting',
  'confirmed',
  'planned'
];

export function pickActiveAppointment(list = [], patientId) {
  if (!patientId) return null;
  const pId = String(patientId).toLowerCase().trim();
  const matches = list.filter((appt) => {
    if (isTerminalAppointmentStatus(appt.status)) return false;
    const apptPid = String(appt.patientId || '').toLowerCase().trim();
    const apptId = String(appt.id || '').toLowerCase().trim();
    return apptPid === pId || apptId === pId;
  });
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    const ia = MATCH_PRIORITY.indexOf(normalizeAppointmentStatus(a.status));
    const ib = MATCH_PRIORITY.indexOf(normalizeAppointmentStatus(b.status));
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return matches[0];
}

export function localTodayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isAppointmentOnDate(appt, dateStr) {
  if (!appt || !dateStr) return false;
  if (appt.date === dateStr) return true;
  const start = String(appt.period?.start || '');
  return start.startsWith(dateStr);
}
