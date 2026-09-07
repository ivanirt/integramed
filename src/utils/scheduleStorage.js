/**
 * Storage and helper utilities for Clinic Working Schedule, Holidays, and Doctor Non-Working Days.
 * Persists locally and synchronizes across the application.
 */

const STORAGE_KEYS = {
  SCHEDULE: 'integramed_clinic_schedule',
  HOLIDAYS: 'integramed_clinic_holidays',
  DOCTOR_LEAVES: 'integramed_doctor_leaves'
};

// Default Working Schedule
export const DEFAULT_SCHEDULE = {
  slotDurationMinutes: 30,
  days: {
    1: { name: 'Lunes', enabled: true, start: '08:00', end: '18:00', hasSplit: false, startAfternoon: '16:00', endAfternoon: '20:00' },
    2: { name: 'Martes', enabled: true, start: '08:00', end: '18:00', hasSplit: false, startAfternoon: '16:00', endAfternoon: '20:00' },
    3: { name: 'Miércoles', enabled: true, start: '08:00', end: '18:00', hasSplit: false, startAfternoon: '16:00', endAfternoon: '20:00' },
    4: { name: 'Jueves', enabled: true, start: '08:00', end: '18:00', hasSplit: false, startAfternoon: '16:00', endAfternoon: '20:00' },
    5: { name: 'Viernes', enabled: true, start: '08:00', end: '18:00', hasSplit: false, startAfternoon: '16:00', endAfternoon: '20:00' },
    6: { name: 'Sábado', enabled: true, start: '09:00', end: '14:00', hasSplit: false, startAfternoon: '15:00', endAfternoon: '18:00' },
    0: { name: 'Domingo', enabled: false, start: '09:00', end: '13:00', hasSplit: false, startAfternoon: '15:00', endAfternoon: '18:00' }
  }
};

// Default Holidays for the current year
export const DEFAULT_HOLIDAYS = [
  { id: 'h-1', date: '2026-01-01', name: 'Año Nuevo' },
  { id: 'h-2', date: '2026-02-02', name: 'Día de la Constitución' },
  { id: 'h-3', date: '2026-03-16', name: 'Natalicio de Benito Juárez' },
  { id: 'h-4', date: '2026-05-01', name: 'Día del Trabajo' },
  { id: 'h-5', date: '2026-09-16', name: 'Día de la Independencia' },
  { id: 'h-6', date: '2026-11-16', name: 'Revolución Mexicana' },
  { id: 'h-7', date: '2026-12-25', name: 'Navidad' }
];

// Default Sample Doctor Leaves
export const DEFAULT_DOCTOR_LEAVES = [
  {
    id: 'leave-1',
    practitionerId: '03ca699c-b020-336a-ad85-aeb60d5b0614',
    practitionerName: 'Dr. Carlos Mendoza Ruiz',
    startDate: '2026-09-21',
    endDate: '2026-09-25',
    reason: 'Congreso',
    notes: 'Congreso Internacional de Cardiología Clínica'
  },
  {
    id: 'leave-2',
    practitionerId: 'all',
    practitionerName: 'Dra. Elena Torres Morales',
    startDate: '2026-10-05',
    endDate: '2026-10-12',
    reason: 'Vacaciones',
    notes: 'Período vacacional anual'
  }
];

// 1. Working Schedule Methods
export function getClinicSchedule() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    if (!raw) return DEFAULT_SCHEDULE;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

export function saveClinicSchedule(schedule) {
  try {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
    window.dispatchEvent(new Event('clinic_schedule_updated'));
    return true;
  } catch (err) {
    console.error('Failed to save clinic schedule:', err);
    return false;
  }
}

// 2. Clinic Holidays Methods
export function getClinicHolidays() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HOLIDAYS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(DEFAULT_HOLIDAYS));
      return DEFAULT_HOLIDAYS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_HOLIDAYS;
  }
}

export function saveClinicHolidays(holidays) {
  try {
    localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(holidays));
    window.dispatchEvent(new Event('clinic_holidays_updated'));
    return true;
  } catch (err) {
    console.error('Failed to save clinic holidays:', err);
    return false;
  }
}

export function addClinicHoliday(holiday) {
  const current = getClinicHolidays();
  // Avoid duplicate date
  const filtered = current.filter(h => h.date !== holiday.date);
  const updated = [...filtered, { id: holiday.id || `h-${Date.now()}`, ...holiday }];
  updated.sort((a, b) => a.date.localeCompare(b.date));
  saveClinicHolidays(updated);
  return updated;
}

export function removeClinicHoliday(holidayIdOrDate) {
  const current = getClinicHolidays();
  const updated = current.filter(h => h.id !== holidayIdOrDate && h.date !== holidayIdOrDate);
  saveClinicHolidays(updated);
  return updated;
}

export function isDateClinicHoliday(dateStr) {
  const holidays = getClinicHolidays();
  return holidays.find(h => h.date === dateStr) || null;
}

// 3. Doctor Non-Working Days / Leaves Methods
export function getDoctorLeaves() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCTOR_LEAVES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DOCTOR_LEAVES, JSON.stringify(DEFAULT_DOCTOR_LEAVES));
      return DEFAULT_DOCTOR_LEAVES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DOCTOR_LEAVES;
  }
}

export function saveDoctorLeaves(leaves) {
  try {
    localStorage.setItem(STORAGE_KEYS.DOCTOR_LEAVES, JSON.stringify(leaves));
    window.dispatchEvent(new Event('doctor_leaves_updated'));
    return true;
  } catch (err) {
    console.error('Failed to save doctor leaves:', err);
    return false;
  }
}

export function addDoctorLeave(leave) {
  const current = getDoctorLeaves();
  const newLeave = {
    id: leave.id || `leave-${Date.now()}`,
    ...leave
  };
  const updated = [newLeave, ...current];
  saveDoctorLeaves(updated);
  return updated;
}

export function removeDoctorLeave(leaveId) {
  const current = getDoctorLeaves();
  const updated = current.filter(l => l.id !== leaveId);
  saveDoctorLeaves(updated);
  return updated;
}

export function getDoctorLeavesForDate(dateStr, practitionerId = null) {
  const leaves = getDoctorLeaves();
  return leaves.filter(l => {
    if (practitionerId && l.practitionerId !== 'all' && l.practitionerId !== practitionerId) {
      return false;
    }
    return dateStr >= l.startDate && dateStr <= l.endDate;
  });
}
