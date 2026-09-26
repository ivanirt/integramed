import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Stethoscope,
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle,
  Activity,
  CalendarDays,
  Filter,
  GripVertical
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import AppointmentMoveConfirmModal from './AppointmentMoveConfirmModal.jsx';
import { updateAppointment } from '../../utils/appointmentStorage.js';

/**
 * Normalizes encounter time into HH:mm (snapped to 00 or 30 min)
 */
function getEncounterNormalizedTime(enc) {
  if (enc.time && typeof enc.time === 'string') {
    const [h, m] = enc.time.split(':').map(Number);
    const snappedMinute = m < 15 ? '00' : m < 45 ? '30' : '00';
    const snappedHour = m >= 45 ? (h || 8) + 1 : (h || 8);
    return `${String(snappedHour).padStart(2, '0')}:${snappedMinute}`;
  }
  if (enc.period?.start) {
    try {
      const startStr = String(enc.period.start);
      if (startStr.includes('T')) {
        const [, tPart] = startStr.split('T');
        if (tPart) {
          const [h, m] = tPart.split(':').map(Number);
          const snappedMinute = m < 15 ? '00' : m < 45 ? '30' : '00';
          const snappedHour = m >= 45 ? (h || 8) + 1 : (h || 8);
          return `${String(snappedHour).padStart(2, '0')}:${snappedMinute}`;
        }
      }
    } catch {}
  }
  return '09:00';
}

function getEncounterNormalizedDate(enc, fallbackDate = '') {
  if (enc.date && typeof enc.date === 'string' && enc.date.length >= 10) {
    return enc.date.slice(0, 10);
  }
  if (enc.period?.start) {
    try {
      const startStr = String(enc.period.start);
      if (startStr.includes('T')) {
        return startStr.split('T')[0].slice(0, 10);
      }
    } catch {}
  }
  return fallbackDate;
}

/**
 * Generates array of 30-minute time slot strings from 08:00 to 22:00
 * (29 half-hour marks from 08:00 to 22:00)
 */
export const WEEKLY_TIME_SLOTS = (() => {
  const slots = [];
  for (let hour = 8; hour <= 22; hour++) {
    const hh = String(hour).padStart(2, '0');
    slots.push(`${hh}:00`);
    if (hour < 22) {
      slots.push(`${hh}:30`);
    }
  }
  return slots;
})();

/**
 * Status visual mapping for appointments
 */
const STATUS_COLORS = {
  in_room: { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669', label: 'En sala' },
  waiting: { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', label: 'En espera' },
  confirmed: { bg: '#e0f2fe', border: '#bae6fd', text: '#0284c7', label: 'Confirmada' },
  in_consultation: { bg: '#fff1f2', border: '#fecdd3', text: '#e11d48', label: 'En consulta' },
  'in-progress': { bg: '#fff1f2', border: '#fecdd3', text: '#e11d48', label: 'En consulta' },
  finished: { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', label: 'Finalizada' },
  planned: { bg: '#fef3c7', border: '#fde68a', text: '#d97706', label: 'Programada' },
  cancelled: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', label: 'Cancelada' }
};

export default function ClinicalWeeklyCalendar({
  encounters = [],
  onSelectDate,
  onScheduleSlot,
  onEncounterClick,
  onAppointmentMove,
  filterPatient = '',
  filterDoctor = '',
  filterReason = ''
}) {
  const { t, locale, language } = useLanguage();

  // Current reference date (defaults to today)
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Drag and drop state for appointments
  const [draggedEncounter, setDraggedEncounter] = useState(null);
  const [dragOverSlotKey, setDragOverSlotKey] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [isDraggingActive, setIsDraggingActive] = useState(false);

  // Move confirmation handler
  const handleConfirmMove = async (moveData) => {
    const { encounter, targetDate, targetTime } = moveData;
    try {
      if (onAppointmentMove) {
        await onAppointmentMove(encounter, targetDate, targetTime);
      } else {
        await updateAppointment(encounter.id, {
          date: targetDate,
          time: targetTime
        });
      }
    } catch (err) {
      console.error('Error confirming appointment move:', err);
    } finally {
      setPendingMove(null);
    }
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Compute Monday of the current week (Monday to Sunday)
  const mondayDate = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday...
    // Distance back to Monday: if Sunday (0), go back 6 days, else day - 1
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
  }, [currentDate]);

  // Compute the 7 days: Monday to Sunday
  const weekDays = useMemo(() => {
    const days = [];
    const dayNamesEs = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const dayNamesEn = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(mondayDate);
      date.setDate(mondayDate.getDate() + i);

      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      days.push({
        index: i,
        date,
        dateStr,
        dayNumber: date.getDate(),
        monthNumber: date.getMonth() + 1,
        dayName: language === 'en' ? dayNamesEn[i] : dayNamesEs[i],
        shortName: (language === 'en' ? dayNamesEn[i] : dayNamesEs[i]).slice(0, 3),
        isToday: dateStr === todayStr
      });
    }
    return days;
  }, [mondayDate, todayStr, language]);

  // Week range label (e.g., "7 al 13 de Septiembre de 2026")
  const weekRangeLabel = useMemo(() => {
    const start = weekDays[0].date;
    const end = weekDays[6].date;
    const startDay = start.getDate();
    const endDay = end.getDate();

    try {
      const monthStart = new Intl.DateTimeFormat(locale, { month: 'long' }).format(start);
      const monthEnd = new Intl.DateTimeFormat(locale, { month: 'long' }).format(end);
      const year = end.getFullYear();

      if (start.getMonth() === end.getMonth()) {
        const capitalizedMonth = monthStart.charAt(0).toUpperCase() + monthStart.slice(1);
        return `${startDay} al ${endDay} de ${capitalizedMonth} de ${year}`;
      } else {
        return `${startDay} de ${monthStart} al ${endDay} de ${monthEnd} de ${year}`;
      }
    } catch {
      return `${weekDays[0].dateStr} - ${weekDays[6].dateStr}`;
    }
  }, [weekDays, locale]);

  // Navigation handlers
  const handlePrevWeek = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentDate(now);
    if (onSelectDate) onSelectDate(todayStr);
  };

  // Filter encounters by Patient, Doctor, and Reason
  const filteredEncounters = useMemo(() => {
    return encounters.filter(enc => {
      // Patient filter
      if (filterPatient.trim()) {
        const query = filterPatient.toLowerCase().trim();
        const pName = (enc.patientName || enc.subject?.display || '').toLowerCase();
        if (!pName.includes(query)) return false;
      }

      // Doctor filter
      if (filterDoctor.trim()) {
        const query = filterDoctor.toLowerCase().trim();
        const docName = (enc.practitionerName || enc.participant?.[0]?.individual?.display || '').toLowerCase();
        if (!docName.includes(query)) return false;
      }

      // Reason filter
      if (filterReason.trim()) {
        const query = filterReason.toLowerCase().trim();
        const reason = (enc.reason || enc.reasonCode?.[0]?.text || enc.type?.[0]?.text || '').toLowerCase();
        if (!reason.includes(query)) return false;
      }

      return true;
    });
  }, [encounters, filterPatient, filterDoctor, filterReason]);

  // Helper to extract slot key (YYYY-MM-DD-HH:mm)
  const getSlotKey = (dateStr, timeStr) => `${dateStr}-${timeStr}`;

  // Index encounters by Date and Time Slot
  const encountersBySlot = useMemo(() => {
    const map = {};

    filteredEncounters.forEach(enc => {
      let dateKey = '';
      let timeKey = '';

      // 1. Explicit local date & time fields
      if (enc.date && typeof enc.date === 'string' && enc.date.length >= 10) {
        dateKey = enc.date.slice(0, 10);
      }
      if (enc.time && typeof enc.time === 'string') {
        const [h, m] = enc.time.split(':').map(Number);
        const snappedMinute = m < 15 ? '00' : m < 45 ? '30' : '00';
        const snappedHour = m >= 45 ? (h || 8) + 1 : (h || 8);
        timeKey = `${String(snappedHour).padStart(2, '0')}:${snappedMinute}`;
      }

      // 2. Parse ISO period.start if dateKey or timeKey are missing
      if ((!dateKey || !timeKey) && enc.period?.start) {
        try {
          const startStr = String(enc.period.start);
          if (startStr.includes('T')) {
            const [dPart, tPart] = startStr.split('T');
            if (!dateKey && dPart) dateKey = dPart.slice(0, 10);
            if (!timeKey && tPart) {
              const [h, m] = tPart.split(':').map(Number);
              const snappedMinute = m < 15 ? '00' : m < 45 ? '30' : '00';
              const snappedHour = m >= 45 ? (h || 8) + 1 : (h || 8);
              timeKey = `${String(snappedHour).padStart(2, '0')}:${snappedMinute}`;
            }
          }
          if (!dateKey || !timeKey) {
            const d = new Date(enc.period.start);
            if (!isNaN(d.getTime())) {
              if (!dateKey) dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              if (!timeKey) {
                const h = d.getHours();
                const m = d.getMinutes();
                const snappedMinute = m < 15 ? '00' : m < 45 ? '30' : '00';
                const snappedHour = m >= 45 ? h + 1 : h;
                timeKey = `${String(snappedHour).padStart(2, '0')}:${snappedMinute}`;
              }
            }
          }
        } catch {}
      }

      // 3. Fallback to today if still no dateKey
      if (!dateKey) {
        dateKey = todayStr;
      }

      if (dateKey && timeKey) {
        const slotKey = getSlotKey(dateKey, timeKey);
        if (!map[slotKey]) map[slotKey] = [];
        map[slotKey].push(enc);
      }
    });

    return map;
  }, [filteredEncounters, todayStr]);

  // Count visible appointments in current week
  const visibleAppointmentsCount = useMemo(() => {
    let count = 0;
    weekDays.forEach(day => {
      WEEKLY_TIME_SLOTS.forEach(time => {
        const slotKey = getSlotKey(day.dateStr, time);
        if (encountersBySlot[slotKey]) {
          count += encountersBySlot[slotKey].length;
        }
      });
    });
    return count;
  }, [weekDays, encountersBySlot]);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.875rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* =========================================================================
          1. WEEKLY NAVIGATION & RANGE HEADER BAR
          ========================================================================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#fafbfc',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        {/* Left: Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={handlePrevWeek}
              style={{
                padding: '0.45rem 0.65rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#334155',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Semana anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <div style={{ width: '1px', height: '18px', backgroundColor: '#e2e8f0' }} />
            <button
              type="button"
              onClick={handleNextWeek}
              style={{
                padding: '0.45rem 0.65rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#334155',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Semana siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleGoToday}
            className="btn btn-secondary btn-sm"
            style={{
              fontWeight: 700,
              fontSize: '0.8125rem',
              color: '#0f766e',
              borderColor: '#99f6e4',
              backgroundColor: '#f0fdfa'
            }}
          >
            Hoy
          </button>

          {/* Week Label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
            <CalendarIcon size={18} color="#0f766e" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', margin: 0 }}>
              {weekRangeLabel}
            </h2>
          </div>
        </div>

        {/* Right: Counter & Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#64748b' }}>
            <Clock size={14} color="#0f766e" />
            <span>08:00 AM - 10:00 PM (30 min)</span>
          </div>

          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              padding: '3px 9px',
              borderRadius: '9999px'
            }}
          >
            {visibleAppointmentsCount} citas en la semana
          </span>
        </div>
      </div>

      {/* =========================================================================
          2. WEEKLY CALENDAR TIME GRID (08:00 to 22:00, 30 min slots, Mon to Sun)
          ========================================================================= */}
      <div
        style={{
          overflowX: 'auto',
          maxHeight: '750px',
          overflowY: 'auto',
          position: 'relative'
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: '980px',
            borderCollapse: 'collapse',
            tableLayout: 'fixed'
          }}
        >
          {/* Column definitions: Time column (80px) + 7 days */}
          <colgroup>
            <col style={{ width: '85px' }} />
            {weekDays.map(d => (
              <col key={d.dateStr} style={{ width: 'calc((100% - 85px) / 7)' }} />
            ))}
          </colgroup>

          {/* Sticky Header: 7 Days of the Week (Lunes a Domingo) */}
          <thead style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#ffffff' }}>
            <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
              {/* Corner Time Cell */}
              <th
                style={{
                  padding: '0.85rem 0.5rem',
                  backgroundColor: '#f8fafc',
                  borderRight: '1px solid #e2e8f0',
                  color: '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  textTransform: 'uppercase'
                }}
              >
                Hora
              </th>

              {/* 7 Days: Lunes a Domingo */}
              {weekDays.map((day) => (
                <th
                  key={day.dateStr}
                  onClick={() => onSelectDate && onSelectDate(day.dateStr)}
                  style={{
                    padding: '0.75rem 0.5rem',
                    backgroundColor: day.isToday ? '#f0fdfa' : '#ffffff',
                    borderRight: '1px solid #e2e8f0',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: day.isToday ? '#0f766e' : '#475569', textTransform: 'uppercase' }}>
                      {day.dayName}
                    </span>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: day.isToday ? '#0f766e' : 'transparent',
                        color: day.isToday ? '#ffffff' : '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        fontWeight: 900
                      }}
                    >
                      {day.dayNumber}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Grid Body: 30-min Rows from 08:00 to 22:00 */}
          <tbody>
            {WEEKLY_TIME_SLOTS.map((timeSlot, slotIdx) => {
              const isHourMark = timeSlot.endsWith(':00');

              // Determine maximum appointments in any day for this time slot
              const encountersCountInRow = weekDays.map(day => (encountersBySlot[getSlotKey(day.dateStr, timeSlot)] || []).length);
              const maxEncountersInRow = Math.max(1, ...encountersCountInRow);
              const hasMultipleInRow = maxEncountersInRow > 1;

              return (
                <tr
                  key={timeSlot}
                  style={{
                    borderBottom: isHourMark ? '1px solid #e2e8f0' : '1px dashed #f1f5f9',
                    height: hasMultipleInRow ? 'auto' : '62px'
                  }}
                >
                  {/* Time Slot Label Cell */}
                  <td
                    style={{
                      padding: '0.45rem 0.35rem',
                      textAlign: 'center',
                      verticalAlign: 'top',
                      borderRight: '1px solid #e2e8f0',
                      backgroundColor: isHourMark ? '#f8fafc' : '#ffffff',
                      color: isHourMark ? '#0f172a' : '#64748b',
                      fontSize: '0.75rem',
                      fontWeight: isHourMark ? 800 : 600,
                      fontFamily: 'var(--font-mono)',
                      height: 'auto'
                    }}
                  >
                    <div>{timeSlot}</div>
                    {hasMultipleInRow && (
                      <div
                        style={{
                          marginTop: '0.35rem',
                          fontSize: '0.625rem',
                          fontWeight: 800,
                          color: '#0f766e',
                          backgroundColor: '#f0fdfa',
                          border: '1px solid #99f6e4',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          lineHeight: 1.1
                        }}
                        title={`Horario expandido: hasta ${maxEncountersInRow} citas simultáneas`}
                      >
                        {maxEncountersInRow} citas
                      </div>
                    )}
                  </td>

                  {/* 7 Day Slot Cells */}
                  {weekDays.map((day) => {
                    const slotKey = getSlotKey(day.dateStr, timeSlot);
                    const slotEncounters = encountersBySlot[slotKey] || [];
                    const hasMultipleInCell = slotEncounters.length > 1;
                    const isDragOver = dragOverSlotKey === slotKey;

                    return (
                      <td
                        key={day.dateStr}
                        onClick={() => {
                          if (!isDraggingActive && slotEncounters.length === 0 && onScheduleSlot) {
                            onScheduleSlot(day.dateStr, timeSlot);
                          }
                        }}
                        onDragOver={(e) => {
                          if (!draggedEncounter) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverSlotKey !== slotKey) {
                            setDragOverSlotKey(slotKey);
                          }
                        }}
                        onDragLeave={(e) => {
                          if (dragOverSlotKey === slotKey) {
                            setDragOverSlotKey(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverSlotKey(null);
                          if (!draggedEncounter) return;

                          const enc = draggedEncounter;
                          const originDate = getEncounterNormalizedDate(enc, day.dateStr);
                          const originTime = getEncounterNormalizedTime(enc);
                          const targetDate = day.dateStr;
                          const targetTime = timeSlot;

                          // If dropped on the same date and time slot, do nothing
                          if (originDate === targetDate && originTime === targetTime) {
                            setDraggedEncounter(null);
                            return;
                          }

                          // Trigger confirmation dialog
                          setPendingMove({
                            encounter: enc,
                            originDate,
                            originTime,
                            targetDate,
                            targetTime,
                            targetDayName: day.dayName
                          });
                          setDraggedEncounter(null);
                        }}
                        style={{
                          padding: '0.3rem',
                          verticalAlign: 'top',
                          borderRight: '1px solid #e2e8f0',
                          backgroundColor: isDragOver
                            ? '#ecfdf5'
                            : (day.isToday ? (isHourMark ? '#fafffd' : '#fcfefd') : '#ffffff'),
                          outline: isDragOver ? '2px dashed #0d9488' : 'none',
                          outlineOffset: '-2px',
                          cursor: slotEncounters.length === 0 ? 'pointer' : 'default',
                          position: 'relative',
                          height: 'auto',
                          transition: 'background-color 0.12s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (slotEncounters.length === 0 && !isDragOver) {
                            e.currentTarget.style.backgroundColor = '#f0fdfa';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (slotEncounters.length === 0 && !isDragOver) {
                            e.currentTarget.style.backgroundColor = day.isToday ? (isHourMark ? '#fafffd' : '#fcfefd') : '#ffffff';
                          }
                        }}
                      >
                        {/* Drop hint when dragging over this slot */}
                        {isDragOver && (
                          <div
                            style={{
                              backgroundColor: '#0d9488',
                              color: '#ffffff',
                              borderRadius: '0.375rem',
                              padding: '0.25rem 0.4rem',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              textAlign: 'center',
                              marginBottom: '0.35rem',
                              boxShadow: '0 2px 4px rgba(13,148,136,0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <span>Soltar aquí ({timeSlot})</span>
                          </div>
                        )}

                        {slotEncounters.length === 0 ? (
                          /* Empty slot clickable target */
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              minHeight: hasMultipleInRow ? `${Math.max(48, maxEncountersInRow * 70)}px` : '48px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'transparent',
                              borderRadius: '0.375rem',
                              transition: 'all 0.12s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#0f766e';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'transparent';
                            }}
                            title={`Agendar cita el ${day.dayName} a las ${timeSlot}`}
                          >
                            <Plus size={14} strokeWidth={2.5} />
                          </div>
                        ) : (
                          /* Encounter Cards in Slot - Dynamically Expands */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {hasMultipleInCell && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  backgroundColor: '#f0fdfa',
                                  border: '1px solid #99f6e4',
                                  borderRadius: '0.375rem',
                                  padding: '2px 6px',
                                  fontSize: '0.625rem',
                                  fontWeight: 800,
                                  color: '#0f766e'
                                }}
                              >
                                <span>⚡ {slotEncounters.length} citas concurrentes</span>
                                {onScheduleSlot && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onScheduleSlot(day.dateStr, timeSlot);
                                    }}
                                    style={{
                                      border: 'none',
                                      background: '#0f766e',
                                      color: '#ffffff',
                                      borderRadius: '9999px',
                                      width: '16px',
                                      height: '16px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      padding: 0
                                    }}
                                    title="Añadir otra cita en este mismo horario"
                                  >
                                    <Plus size={10} strokeWidth={3} />
                                  </button>
                                )}
                              </div>
                            )}

                            {slotEncounters.map((enc, encIdx) => {
                              const statusCfg = STATUS_COLORS[enc.status] || STATUS_COLORS.confirmed;
                              const patientName = enc.patientName || enc.subject?.display || 'Paciente General';
                              const practitionerName = enc.practitionerName || enc.participant?.[0]?.individual?.display || 'Dr. Alejandro Morales';
                              const reason = enc.reason || enc.reasonCode?.[0]?.text || enc.type?.[0]?.text || 'Consulta médica';
                              const isBeingDragged = draggedEncounter?.id === enc.id;

                              return (
                                <div
                                  key={enc.id || `${day.dateStr}-${timeSlot}-${patientName}-${encIdx}`}
                                  draggable={true}
                                  onDragStart={(e) => {
                                    setDraggedEncounter(enc);
                                    setIsDraggingActive(true);
                                    e.dataTransfer.setData('text/plain', enc.id || '');
                                    e.dataTransfer.effectAllowed = 'move';
                                  }}
                                  onDragEnd={() => {
                                    setDraggedEncounter(null);
                                    setDragOverSlotKey(null);
                                    setTimeout(() => setIsDraggingActive(false), 80);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isDraggingActive) return;
                                    if (onEncounterClick) onEncounterClick(enc);
                                  }}
                                  style={{
                                    backgroundColor: statusCfg.bg,
                                    border: `1.5px solid ${statusCfg.border}`,
                                    borderRadius: '0.5rem',
                                    padding: '0.45rem 0.55rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.22rem',
                                    cursor: 'grab',
                                    opacity: isBeingDragged ? 0.35 : 1,
                                    boxShadow: isBeingDragged
                                      ? '0 0 0 2px #0d9488, 0 4px 10px rgba(0,0,0,0.1)'
                                      : '0 1px 3px rgba(0,0,0,0.04)',
                                    transition: 'all 0.15s ease',
                                    fontSize: '0.72rem',
                                    userSelect: 'none'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isBeingDragged) {
                                      e.currentTarget.style.transform = 'translateY(-1px)';
                                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isBeingDragged) {
                                      e.currentTarget.style.transform = 'none';
                                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                                    }
                                  }}
                                  title={`Arrastra para mover a otro horario • Clic para detalles: ${patientName} • ${practitionerName}`}
                                >
                                  {/* Header: Drag Grip + Time + Status Pill */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <GripVertical size={12} color="#64748b" style={{ opacity: 0.7, flexShrink: 0 }} />
                                      <span style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem' }}>
                                        {timeSlot}
                                      </span>
                                      {hasMultipleInCell && (
                                        <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600 }}>
                                          (#{encIdx + 1})
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      style={{
                                        fontSize: '0.6rem',
                                        fontWeight: 800,
                                        color: statusCfg.text,
                                        backgroundColor: '#ffffff',
                                        padding: '1px 5px',
                                        borderRadius: '9999px',
                                        border: `1px solid ${statusCfg.border}`
                                      }}
                                    >
                                      {enc.statusLabel || statusCfg.label}
                                    </span>
                                  </div>

                                  {/* 1. PACIENTE */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      fontWeight: 800,
                                      color: '#0f172a',
                                      fontSize: '0.75rem',
                                      lineHeight: 1.2
                                    }}
                                  >
                                    <User size={12} color="#0f766e" style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {patientName}
                                    </span>
                                  </div>

                                  {/* 2. DOCTOR */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      fontWeight: 600,
                                      color: '#334155',
                                      fontSize: '0.6875rem',
                                      lineHeight: 1.2
                                    }}
                                  >
                                    <Stethoscope size={11} color="#0284c7" style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {practitionerName}
                                    </span>
                                  </div>

                                  {/* 3. MOTIVO */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      color: '#64748b',
                                      fontSize: '0.6875rem',
                                      lineHeight: 1.2,
                                      marginTop: '1px'
                                    }}
                                  >
                                    <FileText size={11} color="#d97706" style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {reason}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Option to schedule an additional appointment in this slot */}
                            {!hasMultipleInCell && onScheduleSlot && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onScheduleSlot(day.dateStr, timeSlot);
                                }}
                                style={{
                                  border: '1px dashed #cbd5e1',
                                  background: 'transparent',
                                  color: '#64748b',
                                  borderRadius: '0.375rem',
                                  padding: '0.2rem',
                                  fontSize: '0.625rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.25rem',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = '#0f766e';
                                  e.currentTarget.style.color = '#0f766e';
                                  e.currentTarget.style.backgroundColor = '#f0fdfa';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = '#cbd5e1';
                                  e.currentTarget.style.color = '#64748b';
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                title="Agendar otra cita en este horario (simultánea)"
                              >
                                <Plus size={10} strokeWidth={2.5} />
                                <span>+ Cita simultánea</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Drag & Drop Move Confirmation Modal */}
      <AppointmentMoveConfirmModal
        isOpen={Boolean(pendingMove)}
        moveData={pendingMove}
        onClose={() => setPendingMove(null)}
        onConfirm={handleConfirmMove}
      />
    </div>
  );
}
