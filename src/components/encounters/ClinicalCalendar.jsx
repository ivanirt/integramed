import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  Activity,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function ClinicalCalendar({
  encounters = [],
  selectedDate,
  onSelectDate,
  onScheduleDate,
  onEncounterClick
}) {
  const { t, locale } = useLanguage();

  // Current calendar view month (Date object set to 1st of month)
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Map encounters by ISO date string (YYYY-MM-DD)
  const encountersByDate = useMemo(() => {
    const map = {};
    encounters.forEach(enc => {
      const start = enc.period?.start;
      if (!start) return;
      try {
        const d = new Date(start);
        if (isNaN(d.getTime())) return;
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(enc);
      } catch {
        // ignore invalid dates
      }
    });
    return map;
  }, [encounters]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    if (onSelectDate) onSelectDate(todayStr);
  };

  // Month and Year format
  const monthYearLabel = useMemo(() => {
    const monthNames = [
      t('monthJanuary'), t('monthFebruary'), t('monthMarch'), t('monthApril'),
      t('monthMay'), t('monthJune'), t('monthJuly'), t('monthAugust'),
      t('monthSeptember'), t('monthOctober'), t('monthNovember'), t('monthDecember')
    ];
    return `${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
  }, [viewDate, t]);

  // Calendar Grid Cells Computation
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    // Adjust for Monday start (0: Sun -> 6, 1: Mon -> 0, etc.)
    const startOffset = (firstDayIndex + 6) % 7;

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month days
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
        isPrev: true
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const y = year;
      const m = String(month + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // Next month days to fill 35 or 42 grid cells
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextDate = new Date(year, month + 1, dayNum);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
        isNext: true
      });
    }

    return days;
  }, [viewDate, todayStr]);

  const weekDayHeaders = [
    t('dayMon'), t('dayTue'), t('dayWed'), t('dayThu'), t('dayFri'), t('daySat'), t('daySun')
  ];

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.875rem',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}
    >
      {/* Calendar Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669'
            }}
          >
            <CalendarIcon size={18} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
            {monthYearLabel}
          </h2>
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleGoToday}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem', fontWeight: 600 }}
          >
            {t('today')}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', padding: '2px' }}>
            <button
              onClick={handlePrevMonth}
              title={t('previousMonth')}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '0.35rem 0.5rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#475569'
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNextMonth}
              title={t('nextMonth')}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '0.35rem 0.5rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#475569'
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {weekDayHeaders.map((header, idx) => (
          <div
            key={idx}
            style={{
              padding: '0.5rem 0.25rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: idx >= 5 ? '#94a3b8' : '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            {header}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {calendarDays.map((day) => {
          const dayEncounters = encountersByDate[day.dateStr] || [];
          const isSelected = selectedDate === day.dateStr;
          const hasEncounters = dayEncounters.length > 0;

          return (
            <div
              key={day.dateStr}
              onClick={() => onSelectDate && onSelectDate(day.dateStr)}
              style={{
                minHeight: '84px',
                padding: '0.5rem',
                borderRadius: '0.625rem',
                border: isSelected
                  ? '2px solid #0f766e'
                  : day.isToday
                  ? '1.5px solid #a7f3d0'
                  : '1px solid #f1f5f9',
                backgroundColor: isSelected
                  ? '#f0fdfa'
                  : day.isToday
                  ? '#ecfdf5'
                  : day.isCurrentMonth
                  ? '#ffffff'
                  : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                boxShadow: isSelected ? '0 0 0 1px #0f766e' : 'none'
              }}
              className="calendar-day-cell"
            >
              {/* Top Row: Day Number & Today indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: isSelected || day.isToday ? 800 : 600,
                    color: isSelected
                      ? '#0f766e'
                      : day.isToday
                      ? '#059669'
                      : day.isCurrentMonth
                      ? '#0f172a'
                      : '#cbd5e1',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected ? '#ccfbf1' : 'transparent'
                  }}
                >
                  {day.dayNum}
                </span>

                {/* Quick Add Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onScheduleDate) onScheduleDate(day.dateStr);
                  }}
                  title={t('btnNewAppointment')}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  className="hover:bg-teal-100 hover:text-teal-700"
                >
                  <Plus size={12} strokeWidth={2.5} />
                </button>
              </div>

              {/* Middle/Bottom: Encounters Chips / Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                {dayEncounters.slice(0, 2).map((enc) => {
                  const patientName = enc.subject?.display?.split(' ')?.[0] || 'Paciente';
                  const time = enc.period?.start ? new Date(enc.period.start).toLocaleTimeString(locale === 'es' ? 'es-MX' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '';
                  const statusColor = enc.status === 'planned' ? '#1d4ed8' : enc.status === 'in-progress' ? '#059669' : '#64748b';
                  const statusBg = enc.status === 'planned' ? '#eff6ff' : enc.status === 'in-progress' ? '#ecfdf5' : '#f1f5f9';

                  return (
                    <div
                      key={enc.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEncounterClick) onEncounterClick(enc);
                      }}
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '1px 4px',
                        borderRadius: '4px',
                        backgroundColor: statusBg,
                        color: statusColor,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title={`${time} - ${enc.subject?.display || ''}`}
                    >
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: statusColor, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{time} {patientName}</span>
                    </div>
                  );
                })}

                {dayEncounters.length > 2 && (
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0d9488', paddingLeft: '2px' }}>
                    +{dayEncounters.length - 2} más
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
