/**
 * Storage and mock data utility for Role-Specific Home Dashboards in IntegraMed.
 * Provides live appointments, clinical to-dos, AI suggestions, and role queues.
 */

import { loadAppointmentsFromFhir } from './appointmentStorage.js';
import {
  loadPayloadCollection,
  upsertPayloadItem,
  deletePayloadItem,
  preferRemote
} from '../services/fhirPayloadStore.js';

const STORAGE_KEYS = {
  TODAY_APPOINTMENTS: 'integramed_today_appointments',
  PENDING_TASKS: 'integramed_pending_tasks',
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
    status: 'in_room', // 'in_room' (En sala) | 'waiting' (En espera) | 'confirmed' (Confirmada) | 'in_consultation' | 'finished'
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
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TODAY_APPOINTMENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TODAY_APPOINTMENTS, JSON.stringify(INITIAL_TODAY_APPOINTMENTS));
      return INITIAL_TODAY_APPOINTMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_TODAY_APPOINTMENTS;
  }
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

export const APPOINTMENT_STATUS_CONFIG = {
  planned: { label: 'Programada', color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
  waiting: { label: 'En espera', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  in_room: { label: 'En sala', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  confirmed: { label: 'Confirmada', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
  in_consultation: { label: 'En consulta', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
  finished: { label: 'Finalizada', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  completed: { label: 'Completada', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  cancelled: { label: 'Cancelada', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' }
};

export function getActiveTodayAppointments() {
  const all = getTodayAppointments();
  return all.filter(a => a.status !== 'finished' && a.status !== 'completed' && a.status !== 'cancelled');
}

export function updateAppointmentStatus(id, newStatus) {
  const list = getTodayAppointments();
  const cfg = APPOINTMENT_STATUS_CONFIG[newStatus] || APPOINTMENT_STATUS_CONFIG.waiting;

  const updated = list.map(appt => {
    if (appt.id === id) {
      return {
        ...appt,
        status: newStatus,
        statusLabel: cfg.label,
        statusColor: cfg.color,
        statusBg: cfg.bg,
        statusBorder: cfg.border,
        updatedAt: new Date().toISOString()
      };
    }
    return appt;
  });

  saveTodayAppointments(updated);
  return updated;
}

export function updateAppointmentStatusByPatientId(patientId, newStatus) {
  if (!patientId) return getTodayAppointments();
  const list = getTodayAppointments();
  const cfg = APPOINTMENT_STATUS_CONFIG[newStatus] || APPOINTMENT_STATUS_CONFIG.waiting;
  const pIdStr = String(patientId).toLowerCase().trim();

  let matched = false;
  const updated = list.map(appt => {
    const matchesPatient = (appt.patientId && String(appt.patientId).toLowerCase().trim() === pIdStr) ||
      (appt.id && String(appt.id).toLowerCase().trim() === pIdStr) ||
      (appt.patientName && appt.patientName.toLowerCase().includes(pIdStr));

    if (matchesPatient && !matched) {
      matched = true;
      return {
        ...appt,
        status: newStatus,
        statusLabel: cfg.label,
        statusColor: cfg.color,
        statusBg: cfg.bg,
        statusBorder: cfg.border,
        updatedAt: new Date().toISOString()
      };
    }
    return appt;
  });

  if (matched) {
    saveTodayAppointments(updated);
  }
  return updated;
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
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDING_TASKS);
    if (!raw) {
      const initialSorted = sortTasksByCompletion(INITIAL_PENDING_TASKS);
      localStorage.setItem(STORAGE_KEYS.PENDING_TASKS, JSON.stringify(initialSorted));
      return initialSorted;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortTasksByCompletion(parsed) : sortTasksByCompletion(INITIAL_PENDING_TASKS);
  } catch {
    return sortTasksByCompletion(INITIAL_PENDING_TASKS);
  }
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
  const today = new Date().toISOString().slice(0, 10);
  const todayAppts = (appts || [])
    .filter((a) => a.date === today || String(a.period?.start || '').startsWith(today))
    .map((a) => ({
      id: a.id,
      fhirId: a.fhirId,
      time: a.time || String(a.period?.start || '').slice(11, 16),
      period: Number((a.time || '09').slice(0, 2)) >= 12 ? 'PM' : 'AM',
      patientId: a.patientId,
      patientName: a.patientName,
      status: a.status,
      statusLabel: a.statusLabel,
      reason: a.reason,
      room: a.room,
      practitionerName: a.practitionerName,
      vitalSigns: a.vitalSigns || {}
    }));
  if (todayAppts.length > 0) {
    saveTodayAppointments(todayAppts);
  }

  const remoteTasks = await loadPayloadCollection('Task', 'task');
  const tasks = preferRemote(remoteTasks, getPendingTasks());
  savePendingTasks(tasks);
  return { appointments: getTodayAppointments(), tasks };
}
