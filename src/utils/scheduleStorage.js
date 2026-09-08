/**
 * Storage and helper utilities for Clinic Working Schedule, Date Overrides, Holidays, and Doctor Non-Working Days.
 * Persists locally and synchronizes across the application.
 */

import { loadConfigBlob, saveConfigBlob } from '../services/fhirPayloadStore.js';

const STORAGE_KEYS = {
  SCHEDULE: 'integramed_clinic_schedule',
  DATE_OVERRIDES: 'integramed_date_overrides',
  HOLIDAYS: 'integramed_clinic_holidays',
  DOCTOR_LEAVES: 'integramed_doctor_leaves',
  PRACTITIONER_SCHEDULES: 'integramed_practitioner_schedules'
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

// Default Sample Date Overrides (Custom hours for specific calendar days)
export const DEFAULT_DATE_OVERRIDES = [
  {
    id: 'override-1',
    date: '2026-09-18',
    enabled: true,
    start: '07:30',
    end: '15:00',
    hasSplit: false,
    reason: 'Jornada Intensiva de Consultas y Vacunación',
    practitionerId: 'all'
  },
  {
    id: 'override-2',
    date: '2026-10-10',
    enabled: true,
    start: '09:00',
    end: '13:00',
    hasSplit: true,
    startAfternoon: '15:00',
    endAfternoon: '19:00',
    reason: 'Horario especial de fin de semana extendido',
    practitionerId: 'all'
  }
];

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
    practitionerId: 'staff-jesus-robledo',
    practitionerName: 'Dr. Jesús Robledo',
    startDate: '2026-09-21',
    endDate: '2026-09-25',
    reason: 'Congreso',
    notes: 'Congreso Internacional de Medicina Interna'
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

// 1. General Working Schedule Methods
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
    saveConfigBlob('clinic-schedule', schedule).catch((err) => console.info('FHIR schedule sync skipped:', err.message));
    return true;
  } catch (err) {
    console.error('Failed to save clinic schedule:', err);
    return false;
  }
}

// 2. Date-Specific Working Hours Overrides (Cambiar horario de cualquier día específico)
export function getDateOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DATE_OVERRIDES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DATE_OVERRIDES, JSON.stringify(DEFAULT_DATE_OVERRIDES));
      return DEFAULT_DATE_OVERRIDES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DATE_OVERRIDES;
  }
}

export function saveDateOverrides(overrides) {
  try {
    localStorage.setItem(STORAGE_KEYS.DATE_OVERRIDES, JSON.stringify(overrides));
    window.dispatchEvent(new Event('clinic_date_overrides_updated'));
    saveConfigBlob('clinic-date-overrides', overrides).catch((err) => console.info('FHIR date overrides sync skipped:', err.message));
    return true;
  } catch (err) {
    console.error('Failed to save date overrides:', err);
    return false;
  }
}

export function setDateOverride(override) {
  const current = getDateOverrides();
  // Filter out if this date already has an override
  const filtered = current.filter(o => o.date !== override.date);
  const newOverride = {
    id: override.id || `override-${Date.now()}`,
    ...override
  };
  const updated = [...filtered, newOverride].sort((a, b) => a.date.localeCompare(b.date));
  saveDateOverrides(updated);
  return updated;
}

export function removeDateOverride(overrideIdOrDate) {
  const current = getDateOverrides();
  const updated = current.filter(o => o.id !== overrideIdOrDate && o.date !== overrideIdOrDate);
  saveDateOverrides(updated);
  return updated;
}

export function getDateOverrideForDate(dateStr, practitionerId = null) {
  const overrides = getDateOverrides();
  return overrides.find(o => {
    if (o.date !== dateStr) return false;
    if (practitionerId && o.practitionerId && o.practitionerId !== 'all' && o.practitionerId !== practitionerId) {
      return false;
    }
    return true;
  }) || null;
}

// 3. Clinic Holidays Methods
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
    saveConfigBlob('clinic-holidays', holidays).catch((err) => console.info('FHIR holidays sync skipped:', err.message));
    return true;
  } catch (err) {
    console.error('Failed to save clinic holidays:', err);
    return false;
  }
}

export function addClinicHoliday(holiday) {
  const current = getClinicHolidays();
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

// 4. Doctor Non-Working Days / Leaves Methods
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
    saveConfigBlob('doctor-leaves', leaves).catch((err) => console.info('FHIR doctor leaves sync skipped:', err.message));
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

// 5. Unified Resolver: Get Exact Working Hours for ANY Date
export function getWorkingHoursForDate(dateStr, practitionerId = null) {
  // Check Holiday
  const holiday = isDateClinicHoliday(dateStr);
  
  // Check Specific Date Override (Highest precedence for hours)
  const override = getDateOverrideForDate(dateStr, practitionerId);
  if (override) {
    return {
      isWorking: override.enabled,
      source: 'override',
      override,
      start: override.start,
      end: override.end,
      hasSplit: override.hasSplit || false,
      startAfternoon: override.startAfternoon || '',
      endAfternoon: override.endAfternoon || '',
      reason: override.reason || 'Horario especial por fecha'
    };
  }

  // If holiday and no override
  if (holiday) {
    return {
      isWorking: false,
      source: 'holiday',
      holiday,
      reason: `Día Festivo: ${holiday.name}`
    };
  }

  // Check Doctor Leave
  const doctorLeaves = getDoctorLeavesForDate(dateStr, practitionerId);
  if (doctorLeaves.length > 0) {
    return {
      isWorking: false,
      source: 'leave',
      leaves: doctorLeaves,
      reason: `Ausencia Médica: ${doctorLeaves[0].reason}`
    };
  }

  // Standard Weekly Schedule
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  const schedule = getClinicSchedule();
  const dayConfig = schedule.days?.[dayOfWeek] || { enabled: false, start: '08:00', end: '18:00' };

  return {
    isWorking: dayConfig.enabled,
    source: 'weekly',
    dayOfWeek,
    dayName: dayConfig.name,
    start: dayConfig.start || '08:00',
    end: dayConfig.end || '18:00',
    hasSplit: dayConfig.hasSplit || false,
    startAfternoon: dayConfig.startAfternoon || '',
    endAfternoon: dayConfig.endAfternoon || '',
    reason: dayConfig.enabled ? 'Horario estándar de trabajo' : 'Día cerrado'
  };
}

export async function loadScheduleFromFhir() {
  const [scheduleBlob, overridesBlob, holidaysBlob, leavesBlob] = await Promise.all([
    loadConfigBlob('clinic-schedule'),
    loadConfigBlob('clinic-date-overrides'),
    loadConfigBlob('clinic-holidays'),
    loadConfigBlob('doctor-leaves')
  ]);
  if (scheduleBlob?.data) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(scheduleBlob.data));
  }
  if (overridesBlob?.data) {
    localStorage.setItem(STORAGE_KEYS.DATE_OVERRIDES, JSON.stringify(overridesBlob.data));
  }
  if (holidaysBlob?.data) {
    localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(holidaysBlob.data));
  }
  if (leavesBlob?.data) {
    localStorage.setItem(STORAGE_KEYS.DOCTOR_LEAVES, JSON.stringify(leavesBlob.data));
  }
  return {
    schedule: getClinicSchedule(),
    overrides: getDateOverrides(),
    holidays: getClinicHolidays(),
    leaves: getDoctorLeaves()
  };
}
