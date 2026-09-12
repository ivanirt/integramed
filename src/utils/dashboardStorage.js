/**
 * Storage and mock data utility for Role-Specific Home Dashboards in IntegraMed.
 * Provides live appointments, clinical to-dos, AI suggestions, and role queues.
 */

import { getStoredAppointments, loadAppointmentsFromFhir, updateAppointment } from './appointmentStorage.js';
import {
  APPOINTMENT_STATUS_CONFIG,
  decorateAppointmentStatus,
  isTerminalAppointmentStatus,
  localTodayDate,
  isAppointmentOnDate,
  pickActiveAppointment,
  normalizeAppointmentStatus
} from './appointmentStatus.js';
import {
  loadPayloadCollection,
  upsertPayloadItem,
  deletePayloadItem,
  preferRemote,
  readCachedArray
} from '../services/fhirPayloadStore.js';

const STORAGE_KEYS = {
  TODAY_APPOINTMENTS: 'integramed_today_appointments_fhir',
  PENDING_TASKS: 'integramed_pending_tasks_fhir',
  ROLE_HOME_PREF: 'integramed_role_home_preference'
};

// Initial Today Appointments for Doctor & Therapist Dashboard
export const INITIAL_TODAY_APPOINTMENTS = [
  {
    id: 'appt-today-01',
    time: '09:00',
    period: 'AM',
    patientId: 'carlos-mendoza',
    patientName: 'Carlos Mendoza Ruiz',
    gender: 'M',
    genderLabel: 'Masculino',
    age: 54,
    documentId: 'CC: 123456789',
    status: 'in_room',
    statusLabel: 'En sala',
    statusColor: '#059669',
    statusBg: '#ecfdf5',
    statusBorder: '#a7f3d0',
    reason: 'Control de Hipertensión',
    room: 'Consultorio 101',
    vitalSigns: { bp: '138/88', hr: '76', temp: '36.6', spo2: '98%' },
    practitionerName: 'Dr. Alejandro Morales',
    isNext: true
  },
  {
    id: 'appt-today-02',
    time: '09:45',
    period: 'AM',
    patientId: 'ana-valenzuela',
    patientName: 'Ana Sofía Valenzuela',
    gender: 'F',
    genderLabel: 'Femenino',
    age: 32,
    documentId: 'CC: 987654321',
    status: 'waiting',
    statusLabel: 'En espera',
    statusColor: '#475569',
    statusBg: '#f1f5f9',
    statusBorder: '#cbd5e1',
    reason: 'Dolor lumbar crónico',
    room: 'Cabina Bobath 2',
    vitalSigns: { bp: '118/75', hr: '68', temp: '36.4', spo2: '99%' },
    practitionerName: 'Lic. Sofía Mendiola',
    isNext: false
  },
  {
    id: 'appt-today-03',
    time: '10:30',
    period: 'AM',
    patientId: 'roberto-silva',
    patientName: 'Roberto Silva',
    gender: 'M',
    genderLabel: 'Masculino',
    age: 45,
    documentId: 'CC: 456123789',
    status: 'confirmed',
    statusLabel: 'Confirmada',
    statusColor: '#0284c7',
    statusBg: '#e0f2fe',
    statusBorder: '#bae6fd',
    reason: 'Revisión post-operatoria',
    room: 'Consultorio 101',
    vitalSigns: null,
    practitionerName: 'Dr. Alejandro Morales',
    isNext: false
  },
  {
    id: 'appt-today-04',
    time: '11:15',
    period: 'AM',
    patientId: 'mariana-silva',
    patientName: 'Mariana Silva Ruiz',
    gender: 'F',
    genderLabel: 'Femenino',
    age: 34,
    documentId: 'CC: 84920112',
    status: 'confirmed',
    statusLabel: 'Confirmada',
    statusColor: '#0284c7',
    statusBg: '#e0f2fe',
    statusBorder: '#bae6fd',
    reason: 'Control de Asma y Tratamiento Antihipertensivo',
    room: 'Consultorio 101',
    vitalSigns: { bp: '124/80', hr: '72', temp: '36.5', spo2: '99%' },
    practitionerName: 'Dr. Alejandro Morales',
    isNext: false
  },
  {
    id: 'appt-today-05',
    time: '12:00',
    period: 'PM',
    patientId: 'valeria-morales',
    patientName: 'Valeria Morales Gómez',
    gender: 'F',
    genderLabel: 'Femenino',
    age: 28,
    documentId: 'CC: 58291043',
    status: 'planned',
    statusLabel: 'Programada',
    statusColor: '#6b7280',
    statusBg: '#f3f4f6',
    statusBorder: '#e5e7eb',
    reason: 'Chequeo Preventivo Anual',
    room: 'Consultorio 101',
    vitalSigns: null,
    practitionerName: 'Dr. Alejandro Morales',
    isNext: false
  }
];

// Initial Tasks Checklist for Doctor / Therapist
export const INITIAL_PENDING_TASKS = [
  {
    id: 'task-1',
    title: 'Firmar alta médica',
    patient: 'Elena Gómez',
    urgent: false,
    badgeText: null,
    completed: false,
    category: 'clinical'
  },
  {
    id: 'task-2',
    title: 'Revisar ecografía',
    patient: 'Luis H.',
    urgent: true,
    badgeText: 'Urgente',
    completed: false,
    category: 'lab'
  },
  {
    id: 'task-3',
    title: 'Aprobar recetas',
    patient: null,
    urgent: false,
    badgeText: '2 pendientes',
    completed: false,
    category: 'prescription',
    link: '/recetas'
  },
  {
    id: 'task-4',
    title: 'Validar reporte de biometría hemática',
    patient: 'Carlos Mendoza Ruiz',
    urgent: false,
    badgeText: 'Laboratorio',
    completed: false,
    category: 'lab',
    link: '/laboratorios'
  }
];

// AI Clinical Suggestions
export const INITIAL_AI_SUGGESTIONS = [
  {
    id: 'ai-sug-1',
    type: 'review',
    badge: 'Revisión sugerida',
    text: 'Carlos Mendoza tiene niveles altos de presión en sus últimos 3 controles. Considere ajustar dosis de medicación.',
    actionLabel: 'Ver historial',
    patientId: 'carlos-mendoza',
    highlight: true
  },
  {
    id: 'ai-sug-2',
    type: 'scheduling',
    badge: 'Optimización de Agenda',
    text: 'Tienes un hueco de 45 min a las 11:30 AM. ¿Deseas adelantar la cita de Roberto Silva?',
    actionLabel: 'Adelantar cita',
    patientId: 'roberto-silva',
    highlight: false
  },
  {
    id: 'ai-sug-3',
    type: 'safety',
    badge: 'Alerta de Interacción',
    text: 'Mariana Silva Ruiz tiene antecedente de Asma leve. Recordatorio: Evitar prescribir AINEs no selectivos.',
    actionLabel: 'Ver ficha',
    patientId: 'mariana-silva',
    highlight: false
  }
];

// Helper methods for Dashboard Data

export function getTodayAppointments() {
  const today = localTodayDate();
  const fromWeekly = getStoredAppointments()
    .filter((appt) => isAppointmentOnDate(appt, today))
    .map((appt) => toTodayAppointment(appt));
  if (fromWeekly.length > 0) return fromWeekly;
  return readCachedArray(STORAGE_KEYS.TODAY_APPOINTMENTS).map((appt) => {
    const decorated = decorateAppointmentStatus(appt.status);
    return {
      ...appt,
      status: decorated.status,
      statusLabel: decorated.label,
      statusColor: decorated.color,
      statusBg: decorated.bg,
      statusBorder: decorated.border
    };
  });
}

export function saveTodayAppointments(appointments) {
  try {
    localStorage.setItem(STORAGE_KEYS.TODAY_APPOINTMENTS, JSON.stringify(appointments));
    window.dispatchEvent(new Event('integramed_appointments_updated'));
    return true;
  } catch (err) {
    console.error('Failed to save appointments:', err);
    return false;
  }
}

export { APPOINTMENT_STATUS_CONFIG };

function applyStatusFields(appt, newStatus) {
  const decorated = decorateAppointmentStatus(newStatus);
  return {
    ...appt,
    status: decorated.status,
    statusLabel: decorated.label,
    statusColor: decorated.color,
    statusBg: decorated.bg,
    statusBorder: decorated.border,
    updatedAt: new Date().toISOString()
  };
}

function toTodayAppointment(weeklyAppt) {
  const decorated = decorateAppointmentStatus(weeklyAppt.status);
  const hour = Number(String(weeklyAppt.time || weeklyAppt.period?.start || '09').slice(0, 2));
  return {
    id: weeklyAppt.id,
    fhirId: weeklyAppt.fhirId,
    time: weeklyAppt.time || String(weeklyAppt.period?.start || '').slice(11, 16) || '09:00',
    period: hour >= 12 ? 'PM' : 'AM',
    patientId: weeklyAppt.patientId,
    patientName: weeklyAppt.patientName,
    gender: weeklyAppt.gender || '',
    age: weeklyAppt.age || '',
    documentId: weeklyAppt.documentId || '',
    status: decorated.status,
    statusLabel: decorated.label,
    statusColor: decorated.color,
    statusBg: decorated.bg,
    statusBorder: decorated.border,
    reason: weeklyAppt.reason,
    room: weeklyAppt.room,
    practitionerName: weeklyAppt.practitionerName,
    vitalSigns: weeklyAppt.vitalSigns || null
  };
}

function syncStatusToWeekly(appt, newStatus) {
  if (!appt?.id) return;
  updateAppointment(appt.id, { status: newStatus }).catch((err) => {
    console.info('Weekly appointment status sync skipped:', err?.message);
  });
}

export function getActiveTodayAppointments() {
  const all = getTodayAppointments();
  return all.filter((a) => !isTerminalAppointmentStatus(a.status));
}

export function updateAppointmentStatus(id, newStatus) {
  const decorated = decorateAppointmentStatus(newStatus);
  const list = getTodayAppointments();
  let matched = null;

  const updated = list.map((appt) => {
    if (appt.id === id) {
      matched = appt;
      return applyStatusFields(appt, decorated.status);
    }
    return appt;
  });

  if (matched) {
    saveTodayAppointments(updated);
    syncStatusToWeekly(matched, decorated.status);
    return updated;
  }

  const today = localTodayDate();
  const weekly = getStoredAppointments().find((a) => a.id === id && isAppointmentOnDate(a, today));
  if (weekly) {
    const todayShape = applyStatusFields(toTodayAppointment(weekly), decorated.status);
    const merged = [...updated, todayShape];
    saveTodayAppointments(merged);
    syncStatusToWeekly(weekly, decorated.status);
    return merged;
  }

  return updated;
}

export function updateAppointmentStatusByPatientId(patientId, newStatus) {
  if (!patientId) return getTodayAppointments();
  const decorated = decorateAppointmentStatus(newStatus);
  const list = getTodayAppointments();
  const target = pickActiveAppointment(list, patientId)
    || (decorated.status === 'finished'
      ? list.find((a) => String(a.patientId) === String(patientId) && normalizeAppointmentStatus(a.status) === 'in_consultation')
      : null);

  if (target) {
    return updateAppointmentStatus(target.id, decorated.status);
  }

  const today = localTodayDate();
  const weeklyMatch = pickActiveAppointment(
    getStoredAppointments().filter((a) => isAppointmentOnDate(a, today)),
    patientId
  );
  if (weeklyMatch) {
    return updateAppointmentStatus(weeklyMatch.id, decorated.status);
  }

  return list;
}

/**
 * Helper to sort tasks: uncompleted tasks first, completed tasks at the end.
 * Preserves relative order within each group.
 */
export function sortTasksByCompletion(tasks) {
  if (!Array.isArray(tasks)) return [];
  const uncompleted = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);
  return [...uncompleted, ...completed];
}

export function getPendingTasks() {
  return sortTasksByCompletion(readCachedArray(STORAGE_KEYS.PENDING_TASKS));
}

export function savePendingTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEYS.PENDING_TASKS, JSON.stringify(tasks));
    window.dispatchEvent(new Event('integramed_tasks_updated'));
    return true;
  } catch (err) {
    console.error('Failed to save tasks:', err);
    return false;
  }
}

export function toggleTaskCompleted(taskId) {
  const tasks = getPendingTasks();
  const updated = tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
  const sorted = sortTasksByCompletion(updated);
  savePendingTasks(sorted);
  const changed = sorted.find((t) => t.id === taskId);
  if (changed) {
    upsertPayloadItem({
      resourceType: 'Task',
      kind: 'task',
      item: changed,
      buildBase: (p) => ({
        status: p.completed ? 'completed' : 'requested',
        description: p.title,
        intent: 'order',
        for: p.patient ? { display: p.patient } : undefined,
        priority: p.urgent ? 'urgent' : 'routine'
      })
    }).catch((err) => console.info('FHIR Task sync skipped:', err.message));
  }
  return sorted;
}

export function reorderTasks(fromIndex, toIndex) {
  const tasks = getPendingTasks();
  if (fromIndex < 0 || fromIndex >= tasks.length || toIndex < 0 || toIndex >= tasks.length || fromIndex === toIndex) {
    return tasks;
  }

  const result = [...tasks];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);

  savePendingTasks(result);
  return result;
}

export function addPendingTask(title, patient = null, urgent = false) {
  const tasks = getPendingTasks();
  const newTask = {
    id: `task-${Date.now()}`,
    title,
    patient,
    urgent,
    badgeText: urgent ? 'Urgente' : null,
    completed: false,
    category: 'general'
  };
  const updated = [newTask, ...tasks];
  const sorted = sortTasksByCompletion(updated);
  savePendingTasks(sorted);
  upsertPayloadItem({
    resourceType: 'Task',
    kind: 'task',
    item: newTask,
    buildBase: (p) => ({
      status: p.completed ? 'completed' : 'requested',
      description: p.title,
      intent: 'order',
      for: p.patient ? { display: p.patient } : undefined,
      priority: p.urgent ? 'urgent' : 'routine'
    })
  }).catch((err) => console.info('FHIR Task sync skipped:', err.message));
  return sorted;
}

export function deleteTask(taskId) {
  const tasks = getPendingTasks();
  const target = tasks.find(t => t.id === taskId);
  const filtered = tasks.filter(t => t.id !== taskId);
  savePendingTasks(filtered);
  if (target?.fhirId) deletePayloadItem('Task', target.fhirId);
  return filtered;
}

export async function loadDashboardFromFhir() {
  const appts = await loadAppointmentsFromFhir();
  const todayAppts = (appts || [])
    .filter((a) => isAppointmentOnDate(a, localTodayDate()))
    .map((a) => toTodayAppointment(a));
  saveTodayAppointments(todayAppts);

  const remoteTasks = await loadPayloadCollection('Task', 'task');
  const tasks = preferRemote(remoteTasks, getPendingTasks());
  savePendingTasks(tasks);
  return { appointments: getTodayAppointments(), tasks };
}

if (typeof window !== 'undefined') {
  window.addEventListener('integramed_appointments_changed', (event) => {
    const weekly = Array.isArray(event.detail) ? event.detail : getStoredAppointments();
    const today = localTodayDate();
    const fromWeekly = weekly.filter((a) => isAppointmentOnDate(a, today)).map(toTodayAppointment);
    if (fromWeekly.length === 0) return;
    const existing = getTodayAppointments();
    const byId = new Map(existing.map((a) => [a.id, a]));
    fromWeekly.forEach((appt) => {
      byId.set(appt.id, { ...(byId.get(appt.id) || {}), ...appt });
    });
    saveTodayAppointments([...byId.values()]);
  });
}
