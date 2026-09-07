import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Settings,
  Clock,
  Calendar,
  PartyPopper,
  UserCheck,
  Building2,
  Server,
  Save,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  CalendarRange,
  Briefcase,
  Layers,
  ChevronRight,
  Copy,
  Sun,
  Sunset,
  CalendarDays,
  CalendarPlus,
  Filter
} from 'lucide-react';
import {
  getClinicSchedule,
  saveClinicSchedule,
  getDateOverrides,
  setDateOverride,
  removeDateOverride,
  getClinicHolidays,
  addClinicHoliday,
  removeClinicHoliday,
  saveClinicHolidays,
  DEFAULT_HOLIDAYS,
  getDoctorLeaves,
  addDoctorLeave,
  removeDoctorLeave
} from '../utils/scheduleStorage';
import { getPractitioners, updateProxyConfig, checkProxyHealth } from '../services/fhirApi';
import HolidaysCalendarPicker from '../components/settings/HolidaysCalendarPicker';
import FacilitiesPage from './FacilitiesPage';
import { useLanguage } from '../i18n/LanguageContext';

export default function SettingsPage({ addToast, serverInfo, onConfigUpdated, defaultTab }) {
  const { t, locale, language } = useLanguage();
  const location = useLocation();

  const getInitialTab = () => {
    if (defaultTab) return defaultTab;
    try {
      const params = new URLSearchParams(location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['schedule', 'holidays', 'leaves', 'facilities', 'fhir'].includes(tabParam)) {
        return tabParam;
      }
    } catch (e) {}
    return 'schedule';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['schedule', 'holidays', 'leaves', 'facilities', 'fhir'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    } catch (e) {}
  }, [location.search]);

  // 1. Working Schedule State
  const [schedule, setSchedule] = useState(getClinicSchedule());
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // 2. Date-Specific Working Hours Overrides State
  const [dateOverrides, setDateOverrides] = useState(getDateOverrides());
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideEnabled, setOverrideEnabled] = useState(true);
  const [overrideStart, setOverrideStart] = useState('08:00');
  const [overrideEnd, setOverrideEnd] = useState('16:00');
  const [overrideHasSplit, setOverrideHasSplit] = useState(false);
  const [overrideStartAfternoon, setOverrideStartAfternoon] = useState('17:00');
  const [overrideEndAfternoon, setOverrideEndAfternoon] = useState('20:00');
  const [overrideReason, setOverrideReason] = useState('');
  const [overridePractitionerId, setOverridePractitionerId] = useState('all');

  // 3. Holidays State
  const [holidays, setHolidays] = useState(getClinicHolidays());
  const [manualHolidayDate, setManualHolidayDate] = useState('');
  const [manualHolidayName, setManualHolidayName] = useState('');

  // 4. Doctor Leaves State
  const [doctorLeaves, setDoctorLeaves] = useState(getDoctorLeaves());
  const [practitioners, setPractitioners] = useState([]);
  const [leaveDoctorId, setLeaveDoctorId] = useState('all');
  const [leaveReason, setLeaveReason] = useState('Congreso');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveNotes, setLeaveNotes] = useState('');

  // 5. FHIR Server State
  const [fhirUrl, setFhirUrl] = useState(serverInfo?.serverUrl || '');
  const [fhirToken, setFhirToken] = useState('');
  const [isSavingFhir, setIsSavingFhir] = useState(false);
  const [fhirStatusMsg, setFhirStatusMsg] = useState(null);

  // Load practitioners
  useEffect(() => {
    getPractitioners()
      .then(docs => {
        setPractitioners(docs || []);
      })
      .catch(console.error);
  }, []);

  // Update schedule day toggle
  const handleToggleDay = (dayKey) => {
    setSchedule(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...prev.days[dayKey],
          enabled: !prev.days[dayKey].enabled
        }
      }
    }));
  };

  // Update schedule day hours
  const handleDayHourChange = (dayKey, field, value) => {
    setSchedule(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...prev.days[dayKey],
          [field]: value
        }
      }
    }));
  };

  // Toggle split shift for a day
  const handleToggleSplitShift = (dayKey) => {
    setSchedule(prev => {
      const current = prev.days[dayKey];
      const hasSplit = !current.hasSplit;
      return {
        ...prev,
        days: {
          ...prev.days,
          [dayKey]: {
            ...current,
            hasSplit,
            startAfternoon: current.startAfternoon || '16:00',
            endAfternoon: current.endAfternoon || '20:00'
          }
        }
      };
    });
  };

  // Copy schedule from one day to all weekdays (Lunes a Viernes)
  const handleCopyDaySchedule = (sourceDayKey) => {
    const source = schedule.days[sourceDayKey];
    if (!source) return;

    setSchedule(prev => {
      const newDays = { ...prev.days };
      [1, 2, 3, 4, 5].forEach(key => {
        newDays[key] = {
          ...newDays[key],
          enabled: source.enabled,
          start: source.start,
          end: source.end,
          hasSplit: source.hasSplit,
          startAfternoon: source.startAfternoon,
          endAfternoon: source.endAfternoon
        };
      });
      return { ...prev, days: newDays };
    });

    if (addToast) {
      addToast('info', t('copiedScheduleToast'), t('toastUpdatedTitle'));
    }
  };

  // Save Working Schedule
  const handleSaveSchedule = (e) => {
    e.preventDefault();
    setIsSavingSchedule(true);
    saveClinicSchedule(schedule);
    setTimeout(() => {
      setIsSavingSchedule(false);
      if (addToast) {
        addToast('success', t('scheduleSavedToast'), t('toastUpdatedTitle'));
      }
    }, 400);
  };

  // Date Overrides Actions (Cambiar horario de cualquier día concreto)
  const handleAddDateOverride = (e) => {
    e.preventDefault();
    if (!overrideDate) return;

    let practitionerName = t('allClinicStaff');
    if (overridePractitionerId !== 'all') {
      const doc = practitioners.find(p => p.id === overridePractitionerId);
      if (doc) {
        const prefix = doc.name?.[0]?.prefix?.[0] || 'Dr.';
        const given = doc.name?.[0]?.given?.join(' ') || '';
        const family = doc.name?.[0]?.family || '';
        practitionerName = `${prefix} ${given} ${family}`.trim();
      }
    }

    const updated = setDateOverride({
      date: overrideDate,
      enabled: overrideEnabled,
      start: overrideStart,
      end: overrideEnd,
      hasSplit: overrideHasSplit,
      startAfternoon: overrideStartAfternoon,
      endAfternoon: overrideEndAfternoon,
      reason: overrideReason.trim() || (overrideEnabled ? 'Horario especial de atención' : 'Cerrado extraordinario'),
      practitionerId: overridePractitionerId,
      practitionerName
    });

    setDateOverrides(updated);
    setOverrideDate('');
    setOverrideReason('');
    setOverrideHasSplit(false);

    if (addToast) {
      addToast('success', t('dateOverrideAddedToast'), t('toastCreatedTitle'));
    }
  };

  const handleRemoveDateOverride = (overrideId) => {
    const updated = removeDateOverride(overrideId);
    setDateOverrides(updated);
    if (addToast) {
      addToast('info', t('dateOverrideRemovedToast'), t('toastDeletedTitle'));
    }
  };

  // Holidays Actions
  const handleAddManualHoliday = (e) => {
    e.preventDefault();
    if (!manualHolidayDate || !manualHolidayName.trim()) return;
    const updated = addClinicHoliday({
      date: manualHolidayDate,
      name: manualHolidayName.trim()
    });
    setHolidays(updated);
    setManualHolidayDate('');
    setManualHolidayName('');
    if (addToast) {
      addToast('success', t('holidayAddedToast'), t('toastCreatedTitle'));
    }
  };

  const handleRemoveHoliday = (holidayId) => {
    const updated = removeClinicHoliday(holidayId);
    setHolidays(updated);
    if (addToast) {
      addToast('info', t('holidayRemovedToast'), t('toastDeletedTitle'));
    }
  };

  const handleLoadOfficialHolidays = () => {
    saveClinicHolidays(DEFAULT_HOLIDAYS);
    setHolidays(DEFAULT_HOLIDAYS);
    if (addToast) {
      addToast('success', t('officialHolidaysLoadedToast'), t('toastCreatedTitle'));
    }
  };

  // Doctor Leave Actions
  const handleAddDoctorLeave = (e) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate) return;

    let doctorName = t('allDoctors');
    if (leaveDoctorId !== 'all') {
      const doc = practitioners.find(p => p.id === leaveDoctorId);
      if (doc) {
        const prefix = doc.name?.[0]?.prefix?.[0] || 'Dr.';
        const given = doc.name?.[0]?.given?.join(' ') || '';
        const family = doc.name?.[0]?.family || '';
        doctorName = `${prefix} ${given} ${family}`.trim();
      }
    }

    const updated = addDoctorLeave({
      practitionerId: leaveDoctorId,
      practitionerName: doctorName,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason: leaveReason,
      notes: leaveNotes.trim()
    });

    setDoctorLeaves(updated);
    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveNotes('');
    if (addToast) {
      addToast('success', t('doctorLeaveAddedToast'), t('toastCreatedTitle'));
    }
  };

  const handleRemoveDoctorLeave = (leaveId) => {
    const updated = removeDoctorLeave(leaveId);
    setDoctorLeaves(updated);
    if (addToast) {
      addToast('info', t('doctorLeaveRemovedToast'), t('toastDeletedTitle'));
    }
  };

  // FHIR Server Save
  const handleSaveFhirSettings = async (e) => {
    e.preventDefault();
    setIsSavingFhir(true);
    setFhirStatusMsg(null);

    try {
      await updateProxyConfig(fhirUrl, fhirToken || undefined);
      const updatedHealth = await checkProxyHealth();
      setFhirStatusMsg({ type: 'success', text: t('settingsSuccess') });
      if (onConfigUpdated) onConfigUpdated(updatedHealth);
      if (addToast) {
        addToast('success', t('settingsSuccess'), t('toastUpdatedTitle'));
      }
    } catch (err) {
      setFhirStatusMsg({ type: 'error', text: err.message || 'Failed to update settings.' });
    } finally {
      setIsSavingFhir(false);
    }
  };

  const tabs = [
    { id: 'schedule', label: t('tabClinicSchedule'), icon: Clock },
    { id: 'holidays', label: `${t('tabHolidays')} (${holidays.length})`, icon: PartyPopper },
    { id: 'leaves', label: `${t('tabDoctorLeaves')} (${doctorLeaves.length})`, icon: UserCheck },
    { id: 'facilities', label: t('tabFacilities') || 'Planteles & Sedes', icon: Building2 },
    { id: 'fhir', label: t('tabFhirConnection'), icon: Server }
  ];

  const daysList = [
    { key: 1, label: t('dayMondayFull') },
    { key: 2, label: t('dayTuesdayFull') },
    { key: 3, label: t('dayWednesdayFull') },
    { key: 4, label: t('dayThursdayFull') },
    { key: 5, label: t('dayFridayFull') },
    { key: 6, label: t('daySaturdayFull') },
    { key: 0, label: t('daySundayFull') }
  ];

  return (
    <div style={{ padding: '1.75rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#059669'
          }}
        >
          <Settings size={22} strokeWidth={2.5} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            {t('settingsPageTitle')}
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {t('settingsPageSubtitle')}
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1.75rem',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 0.5rem',
                border: 'none',
                background: 'transparent',
                fontSize: '0.9375rem',
                fontWeight: isActive ? 800 : 600,
                color: isActive ? '#0f766e' : '#64748b',
                borderBottom: isActive ? '3px solid #0f766e' : '3px solid transparent',
                cursor: 'pointer',
                marginBottom: '-2px',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={17} color={isActive ? '#0f766e' : '#64748b'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: HORARIOS DE ATENCIÓN (SEMANAL + EXCEPCIONES POR CUALQUIER DÍA)
          ========================================================================= */}
      {activeTab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Formulario de Horarios Semanales Estándar */}
          <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* General Consultation Settings */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                {t('generalScheduleSettingsTitle')}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
                {t('generalScheduleSettingsDesc')}
              </p>

              <div style={{ maxWidth: '320px' }}>
                <label className="form-label">{t('slotDurationLabel')}</label>
                <select
                  value={schedule.slotDurationMinutes}
                  onChange={(e) => setSchedule(prev => ({ ...prev, slotDurationMinutes: Number(e.target.value) }))}
                  className="form-input"
                >
                  <option value={15}>15 minutos</option>
                  <option value={20}>20 minutos</option>
                  <option value={30}>30 minutos (Estándar)</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos (1 hora)</option>
                </select>
              </div>
            </div>

            {/* Days of the Week Schedule */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {t('weeklyWorkingDaysTitle')}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                    Configura las horas de apertura, cierre y turnos vespertinos para cada día habitual.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {daysList.map(({ key, label }) => {
                  const dayConfig = schedule.days?.[key] || { enabled: false, start: '08:00', end: '18:00', hasSplit: false, startAfternoon: '16:00', endAfternoon: '20:00' };

                  return (
                    <div
                      key={key}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '0.75rem',
                        border: dayConfig.enabled ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                        backgroundColor: dayConfig.enabled ? '#f0fdf4' : '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        {/* Day Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '160px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={dayConfig.enabled}
                              onChange={() => handleToggleDay(key)}
                              style={{ width: '18px', height: '18px', accentColor: '#0f766e', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.9375rem', fontWeight: dayConfig.enabled ? 800 : 500, color: dayConfig.enabled ? '#0f172a' : '#64748b' }}>
                              {label}
                            </span>
                          </label>
                        </div>

                        {/* Hours Ranges & Actions */}
                        {dayConfig.enabled ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            {/* Turno Matutino / Principal */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#ffffff', padding: '4px 8px', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                              <Sun size={14} color="#f59e0b" />
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('startTime')}:</span>
                              <input
                                type="time"
                                className="form-input"
                                value={dayConfig.start || '08:00'}
                                onChange={(e) => handleDayHourChange(key, 'start', e.target.value)}
                                style={{ width: '105px', height: '32px', fontSize: '0.8125rem', padding: '2px 6px' }}
                              />
                              <span style={{ color: '#94a3b8' }}>—</span>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('endTime')}:</span>
                              <input
                                type="time"
                                className="form-input"
                                value={dayConfig.end || '18:00'}
                                onChange={(e) => handleDayHourChange(key, 'end', e.target.value)}
                                style={{ width: '105px', height: '32px', fontSize: '0.8125rem', padding: '2px 6px' }}
                              />
                            </div>

                            {/* Split Shift Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleSplitShift(key)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '4px 10px',
                                borderRadius: '0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                border: dayConfig.hasSplit ? '1px solid #0d9488' : '1px solid #cbd5e1',
                                backgroundColor: dayConfig.hasSplit ? '#ccfbf1' : '#ffffff',
                                color: dayConfig.hasSplit ? '#0f766e' : '#64748b',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Sunset size={14} />
                              <span>{dayConfig.hasSplit ? 'Turno vespertino activo' : '+ Turno vespertino'}</span>
                            </button>

                            {/* Copy to weekdays button */}
                            {key >= 1 && key <= 5 && (
                              <button
                                type="button"
                                onClick={() => handleCopyDaySchedule(key)}
                                title={t('copyScheduleToWeekdays')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '4px 8px',
                                  borderRadius: '0.5rem',
                                  fontSize: '0.75rem',
                                  color: '#0d9488',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #99f6e4',
                                  cursor: 'pointer'
                                }}
                              >
                                <Copy size={13} />
                                <span>Copiar a L-V</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            {t('closedDay')}
                          </span>
                        )}
                      </div>

                      {/* Turno Vespertino Detallado (si está activo) */}
                      {dayConfig.enabled && dayConfig.hasSplit && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem 0.75rem',
                            backgroundColor: '#ffffff',
                            borderRadius: '0.5rem',
                            border: '1px dashed #0d9488',
                            marginLeft: '1.75rem',
                            maxWidth: '480px'
                          }}
                        >
                          <Sunset size={15} color="#0d9488" />
                          <span style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 700 }}>
                            {t('afternoonShift')}:
                          </span>
                          <input
                            type="time"
                            className="form-input"
                            value={dayConfig.startAfternoon || '16:00'}
                            onChange={(e) => handleDayHourChange(key, 'startAfternoon', e.target.value)}
                            style={{ width: '105px', height: '30px', fontSize: '0.8125rem', padding: '2px 6px' }}
                          />
                          <span style={{ color: '#94a3b8' }}>—</span>
                          <input
                            type="time"
                            className="form-input"
                            value={dayConfig.endAfternoon || '20:00'}
                            onChange={(e) => handleDayHourChange(key, 'endAfternoon', e.target.value)}
                            style={{ width: '105px', height: '30px', fontSize: '0.8125rem', padding: '2px 6px' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={isSavingSchedule}
                className="btn btn-primary"
                style={{ backgroundColor: '#0f766e', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
              >
                <Save size={16} />
                <span>{isSavingSchedule ? t('savingSettings') : t('saveScheduleBtn')}</span>
              </button>
            </div>
          </form>

          {/* =========================================================================
              SECCIÓN: CAMBIAR HORARIO DE CUALQUIER DÍA CONCRETO (EXCEPCIONES POR FECHA)
              ========================================================================= */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CalendarDays size={20} color="#0d9488" />
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {t('dateOverridesSectionTitle')}
                  </h3>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem', marginBottom: 0 }}>
                  {t('dateOverridesSectionDesc')}
                </p>
              </div>

              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: '#f0fdfa',
                  color: '#0f766e',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: '1px solid #99f6e4'
                }}
              >
                {dateOverrides.length} {dateOverrides.length === 1 ? 'día con horario especial' : 'días con horario especial'}
              </span>
            </div>

            {/* Formulario para Registrar Horario Especial para un Día Específico */}
            <form
              onSubmit={handleAddDateOverride}
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CalendarPlus size={16} color="#0f766e" />
                <span>{t('addDateOverrideTitle')}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {/* 1. Selector de Fecha Específica */}
                <div>
                  <label className="form-label">{t('fieldSpecificDate')} *</label>
                  <input
                    type="date"
                    required
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                {/* 2. Tipo de Horario (Abierto con horario especial o Cerrado) */}
                <div>
                  <label className="form-label">Estado de Atención</label>
                  <select
                    value={overrideEnabled ? 'open' : 'closed'}
                    onChange={(e) => setOverrideEnabled(e.target.value === 'open')}
                    className="form-input"
                  >
                    <option value="open">{t('specialHoursTypeWorking')}</option>
                    <option value="closed">{t('specialHoursTypeClosed')}</option>
                  </select>
                </div>

                {/* 3. Profesional / Personal aplicable */}
                <div>
                  <label className="form-label">{t('appliesToPractitioner')}</label>
                  <select
                    value={overridePractitionerId}
                    onChange={(e) => setOverridePractitionerId(e.target.value)}
                    className="form-input"
                  >
                    <option value="all">{t('allClinicStaff')}</option>
                    {practitioners.map(doc => {
                      const prefix = doc.name?.[0]?.prefix?.[0] || 'Dr.';
                      const given = doc.name?.[0]?.given?.join(' ') || '';
                      const family = doc.name?.[0]?.family || '';
                      const name = `${prefix} ${given} ${family}`.trim() || `Doctor (${doc.id})`;
                      return (
                        <option key={doc.id} value={doc.id}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Horas configurables si está abierto */}
              {overrideEnabled && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', backgroundColor: '#ffffff', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sun size={15} color="#f59e0b" />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Turno Principal:</span>
                    <input
                      type="time"
                      value={overrideStart}
                      onChange={(e) => setOverrideStart(e.target.value)}
                      className="form-input"
                      style={{ width: '110px', height: '34px', fontSize: '0.8125rem' }}
                    />
                    <span style={{ color: '#94a3b8' }}>—</span>
                    <input
                      type="time"
                      value={overrideEnd}
                      onChange={(e) => setOverrideEnd(e.target.value)}
                      className="form-input"
                      style={{ width: '110px', height: '34px', fontSize: '0.8125rem' }}
                    />
                  </div>

                  {/* Toggle Split Shift */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: '#0f766e', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
                    <input
                      type="checkbox"
                      checked={overrideHasSplit}
                      onChange={(e) => setOverrideHasSplit(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#0f766e' }}
                    />
                    <span>{t('splitShiftToggle')}</span>
                  </label>

                  {overrideHasSplit && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', paddingTop: '0.5rem', borderTop: '1px dashed #e2e8f0' }}>
                      <Sunset size={15} color="#0d9488" />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f766e' }}>{t('afternoonShift')}:</span>
                      <input
                        type="time"
                        value={overrideStartAfternoon}
                        onChange={(e) => setOverrideStartAfternoon(e.target.value)}
                        className="form-input"
                        style={{ width: '110px', height: '34px', fontSize: '0.8125rem' }}
                      />
                      <span style={{ color: '#94a3b8' }}>—</span>
                      <input
                        type="time"
                        value={overrideEndAfternoon}
                        onChange={(e) => setOverrideEndAfternoon(e.target.value)}
                        className="form-input"
                        style={{ width: '110px', height: '34px', fontSize: '0.8125rem' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Motivo o descripción */}
              <div>
                <label className="form-label">{t('specialHoursReasonLabel')}</label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder={t('specialHoursReasonPlaceholder')}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#0d9488', gap: '0.4rem' }}
                >
                  <Plus size={16} />
                  <span>{t('addSpecialScheduleBtn')}</span>
                </button>
              </div>
            </form>

            {/* Listado de Días con Horarios Especiales Programados */}
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem' }}>
                {t('registeredDateOverridesTitle')}
              </h4>

              {dateOverrides.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '0.875rem' }}>
                  {t('noDateOverridesRegistered')}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
                  {dateOverrides.map(item => {
                    return (
                      <div
                        key={item.id}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.75rem',
                          padding: '0.875rem 1rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                              {item.date}
                            </span>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                backgroundColor: item.enabled ? '#ccfbf1' : '#ffe4e6',
                                color: item.enabled ? '#0f766e' : '#be123c'
                              }}
                            >
                              {item.enabled ? 'Horario Especial' : 'Cerrado'}
                            </span>
                          </div>

                          {item.enabled ? (
                            <div style={{ fontSize: '0.8125rem', color: '#0d9488', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                              <Clock size={13} />
                              <span>{item.start} - {item.end}</span>
                              {item.hasSplit && (
                                <span style={{ color: '#0f766e', fontWeight: 600 }}>
                                  y {item.startAfternoon} - {item.endAfternoon}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#be123c', fontWeight: 600, marginBottom: '0.25rem' }}>
                              Día No Laborable Extraordinario
                            </div>
                          )}

                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            <strong>Motivo:</strong> {item.reason}
                          </div>

                          {item.practitionerName && item.practitionerName !== t('allClinicStaff') && (
                            <div style={{ fontSize: '0.6875rem', color: '#7c3aed', fontWeight: 600, marginTop: '2px' }}>
                              Personal: {item.practitionerName}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveDateOverride(item.id)}
                          title="Eliminar este horario especial"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            transition: 'color 0.15s ease'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: DÍAS FESTIVOS DE LA CLÍNICA
          ========================================================================= */}
      {activeTab === 'holidays' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(360px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left: Interactive Holiday Calendar */}
          <div>
            <HolidaysCalendarPicker
              holidays={holidays}
              onAddHoliday={(newH) => {
                const updated = addClinicHoliday(newH);
                setHolidays(updated);
                if (addToast) addToast('success', t('holidayAddedToast'), t('toastCreatedTitle'));
              }}
              onRemoveHoliday={(hId) => handleRemoveHoliday(hId)}
            />
          </div>

          {/* Right: Holiday List & Manual Form */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  {t('registeredHolidaysTitle')}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {holidays.length} {t('holidaysCount')}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLoadOfficialHolidays}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#0f766e' }}
              >
                <Sparkles size={14} />
                <span>{t('loadOfficialHolidaysBtn')}</span>
              </button>
            </div>

            {/* Manual Holiday Form */}
            <form onSubmit={handleAddManualHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.625rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
                {t('addManualHolidayTitle')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="date"
                  required
                  value={manualHolidayDate}
                  onChange={(e) => setManualHolidayDate(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.8125rem' }}
                />
                <input
                  type="text"
                  required
                  value={manualHolidayName}
                  onChange={(e) => setManualHolidayName(e.target.value)}
                  placeholder={t('holidayNamePlaceholder')}
                  className="form-input"
                  style={{ fontSize: '0.8125rem' }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#0f766e', padding: '0.5rem 0.875rem' }}
                >
                  <Plus size={16} />
                  <span>{t('addBtn')}</span>
                </button>
              </div>
            </form>

            {/* Holidays List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '380px', overflowY: 'auto' }}>
              {holidays.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No hay días festivos configurados.
                </div>
              ) : (
                holidays.map(h => (
                  <div
                    key={h.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.875rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f766e', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
                        {h.date}
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                        {h.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveHoliday(h.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: DÍAS NO LABORABLES POR MÉDICO (CONGRESOS, VACACIONES, ETC)
          ========================================================================= */}
      {activeTab === 'leaves' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Register Leave Form */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
              {t('registerDoctorLeaveTitle')}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              {t('registerDoctorLeaveDesc')}
            </p>

            <form onSubmit={handleAddDoctorLeave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Doctor Selection */}
                <div>
                  <label className="form-label">{t('fieldPractitioner')}</label>
                  <select
                    value={leaveDoctorId}
                    onChange={(e) => setLeaveDoctorId(e.target.value)}
                    className="form-input"
                  >
                    <option value="all">{t('allDoctors')}</option>
                    {practitioners.map(doc => {
                      const prefix = doc.name?.[0]?.prefix?.[0] || 'Dr.';
                      const given = doc.name?.[0]?.given?.join(' ') || '';
                      const family = doc.name?.[0]?.family || '';
                      const name = `${prefix} ${given} ${family}`.trim() || `Doctor (${doc.id})`;
                      return (
                        <option key={doc.id} value={doc.id}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label className="form-label">{t('leaveReasonLabel')}</label>
                  <select
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    className="form-input"
                  >
                    <option value="Congreso">{t('reasonCongress')}</option>
                    <option value="Vacaciones">{t('reasonVacation')}</option>
                    <option value="Incapacidad">{t('reasonMedicalLeave')}</option>
                    <option value="Permiso Personal">{t('reasonPersonal')}</option>
                    <option value="Otro">{t('reasonOther')}</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="form-label">{t('startDate')} *</label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="form-label">{t('endDate')} *</label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">{t('leaveNotesLabel')}</label>
                <input
                  type="text"
                  value={leaveNotes}
                  onChange={(e) => setLeaveNotes(e.target.value)}
                  placeholder={t('leaveNotesPlaceholder')}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#0f766e', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
                >
                  <Plus size={16} />
                  <span>{t('registerLeaveBtn')}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Registered Doctor Leaves */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {t('registeredLeavesTitle')}
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {doctorLeaves.length} ausencias registradas
              </span>
            </div>

            {doctorLeaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                {t('noDoctorLeavesRegistered')}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {doctorLeaves.map(leave => {
                  return (
                    <div
                      key={leave.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a' }}>
                            {leave.practitionerName}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1'
                            }}
                          >
                            {leave.reason}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.8125rem', color: '#0f766e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                          <CalendarRange size={14} />
                          <span>{leave.startDate} al {leave.endDate}</span>
                        </div>

                        {leave.notes && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                            "{leave.notes}"
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoctorLeave(leave.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            color: '#ef4444',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SERVIDOR FHIR PROXY & CONEXIÓN
          ========================================================================= */}
      {activeTab === 'fhir' && (
        <form onSubmit={handleSaveFhirSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
              {t('settingsTitle')}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.5rem' }}>
              {t('settingsSubtitle')}
            </p>

            {fhirStatusMsg && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1.25rem',
                  backgroundColor: fhirStatusMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${fhirStatusMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                  color: fhirStatusMsg.type === 'success' ? '#065f46' : '#991b1b',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {fhirStatusMsg.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                <span>{fhirStatusMsg.text}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '650px' }}>
              <div>
                <label className="form-label">{t('fhirUrlLabel')}</label>
                <input
                  type="url"
                  className="form-input"
                  value={fhirUrl}
                  onChange={(e) => setFhirUrl(e.target.value)}
                  placeholder="https://fhir.medblocks.com/fhir/..."
                  required
                />
                <span className="form-helper">{t('fhirUrlHelper')}</span>
              </div>

              <div>
                <label className="form-label">{t('bearerTokenLabel')}</label>
                <input
                  type="password"
                  className="form-input"
                  value={fhirToken}
                  onChange={(e) => setFhirToken(e.target.value)}
                  placeholder={serverInfo?.hasToken ? t('tokenConfigured') : t('enterToken')}
                />
                <span className="form-helper">{t('bearerTokenHelper')}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isSavingFhir}
              className="btn btn-primary"
              style={{ backgroundColor: '#0f766e', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
            >
              <Save size={16} />
              <span>{isSavingFhir ? t('savingSettings') : t('btnSaveSettings')}</span>
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 5: PLANTELES & SEDES (ORGANIZATIONS & LOCATIONS)
          ========================================================================= */}
      {activeTab === 'facilities' && (
        <div>
          <FacilitiesPage addToast={addToast} embedded={true} />
        </div>
      )}
    </div>
  );
}
