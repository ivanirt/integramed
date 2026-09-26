import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Sparkles,
  PartyPopper,
  Check
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function HolidaysCalendarPicker({
  holidays = [],
  onAddHoliday,
  onRemoveHoliday
}) {
  const { t } = useLanguage();

  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDateForNew, setSelectedDateForNew] = useState(null);
  const [newHolidayName, setNewHolidayName] = useState('');

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const holidaysMap = useMemo(() => {
    const map = {};
    holidays.forEach(h => {
      map[h.date] = h;
    });
    return map;
  }, [holidays]);

  const monthYearLabel = useMemo(() => {
    const monthNames = [
      t('monthJanuary'), t('monthFebruary'), t('monthMarch'), t('monthApril'),
      t('monthMay'), t('monthJune'), t('monthJuly'), t('monthAugust'),
      t('monthSeptember'), t('monthOctober'), t('monthNovember'), t('monthDecember')
    ];
    return `${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
  }, [viewDate, t]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const startOffset = (firstDayIndex + 6) % 7;

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dayNum, dateStr, isCurrentMonth: false });
    }

    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextDate = new Date(year, month + 1, dayNum);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dayNum, dateStr, isCurrentMonth: false });
    }

    return days;
  }, [viewDate, todayStr]);

  const handleCellClick = (dateStr) => {
    const existing = holidaysMap[dateStr];
    if (existing) {
      if (onRemoveHoliday) onRemoveHoliday(existing.id);
    } else {
      setSelectedDateForNew(dateStr);
      setNewHolidayName('');
    }
  };

  const handleConfirmNewHoliday = (e) => {
    e.preventDefault();
    if (!selectedDateForNew || !newHolidayName.trim()) return;
    if (onAddHoliday) {
      onAddHoliday({
        date: selectedDateForNew,
        name: newHolidayName.trim()
      });
    }
    setSelectedDateForNew(null);
    setNewHolidayName('');
  };

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
      {/* Month Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
            <PartyPopper size={17} />
          </div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            {monthYearLabel}
          </h4>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', padding: '2px' }}>
            <button
              type="button"
              onClick={() => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              style={{ border: 'none', background: 'transparent', padding: '0.3rem 0.45rem', borderRadius: '0.375rem', cursor: 'pointer', color: '#475569' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              style={{ border: 'none', background: 'transparent', padding: '0.3rem 0.45rem', borderRadius: '0.375rem', cursor: 'pointer', color: '#475569' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
        {t('holidayCalendarInstruction')}
      </div>

      {/* Weekday Labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {weekDayHeaders.map((header, idx) => (
          <div key={idx} style={{ padding: '0.35rem 0', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            {header}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {calendarDays.map((day) => {
          const holiday = holidaysMap[day.dateStr];
          const isSelected = selectedDateForNew === day.dateStr;

          return (
            <div
              key={day.dateStr}
              onClick={() => handleCellClick(day.dateStr)}
              style={{
                height: '52px',
                padding: '0.3rem',
                borderRadius: '0.5rem',
                border: holiday
                  ? '1.5px solid #f59e0b'
                  : isSelected
                  ? '2px solid #0f766e'
                  : '1px solid #f1f5f9',
                backgroundColor: holiday
                  ? '#fef3c7'
                  : isSelected
                  ? '#f0fdfa'
                  : day.isCurrentMonth
                  ? '#ffffff'
                  : '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease'
              }}
              title={holiday ? `${holiday.name} (Clic para eliminar)` : `Clic para marcar festivo`}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: holiday || isSelected ? 800 : 600,
                    color: holiday ? '#92400e' : isSelected ? '#0f766e' : day.isCurrentMonth ? '#0f172a' : '#cbd5e1'
                  }}
                >
                  {day.dayNum}
                </span>

                {holiday && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d97706' }} />
                )}
              </div>

              {holiday && (
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#78350f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {holiday.name}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Add Name Input Modal / Inline Bar */}
      {selectedDateForNew && (
        <form
          onSubmit={handleConfirmNewHoliday}
          style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            backgroundColor: '#fefce8',
            border: '1px solid #fef08a',
            borderRadius: '0.625rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#854d0e', whiteSpace: 'nowrap' }}>
            {selectedDateForNew}:
          </div>

          <input
            type="text"
            className="form-input"
            value={newHolidayName}
            onChange={(e) => setNewHolidayName(e.target.value)}
            placeholder={t('holidayNamePlaceholder')}
            autoFocus
            style={{ height: '32px', fontSize: '0.8125rem', flex: 1 }}
          />

          <button
            type="submit"
            className="btn btn-primary btn-sm"
            style={{ backgroundColor: '#0f766e', height: '32px', fontSize: '0.75rem' }}
          >
            <Check size={14} />
            <span>{t('addHolidayBtn')}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDateForNew(null)}
            className="btn btn-secondary btn-sm"
            style={{ height: '32px', fontSize: '0.75rem' }}
          >
            {t('btnCancel')}
          </button>
        </form>
      )}
    </div>
  );
}
