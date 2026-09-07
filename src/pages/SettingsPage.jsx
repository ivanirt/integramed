import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Clock,
  Calendar,
  PartyPopper,
  UserCheck,
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
  ChevronRight
} from 'lucide-react';
import {
  getClinicSchedule,
  saveClinicSchedule,
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
import { useLanguage } from '../i18n/LanguageContext';

export default function SettingsPage({ addToast, serverInfo, onConfigUpdated }) {
  const { t, locale } = useLanguage();

  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'holidays' | 'leaves' | 'fhir'

  // 1. Working Schedule State
  const [schedule, setSchedule] = useState(getClinicSchedule());
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // 2. Holidays State
  const [holidays, setHolidays] = useState(getClinicHolidays());
  const [manualHolidayDate, setManualHolidayDate] = useState('');
  const [manualHolidayName, setManualHolidayName] = useState('');

  // 3. Doctor Leaves State
  const [doctorLeaves, setDoctorLeaves] = useState(getDoctorLeaves());
  const [practitioners, setPractitioners] = useState([]);
  const [leaveDoctorId, setLeaveDoctorId] = useState('all');
  const [leaveReason, setLeaveReason] = useState('Congreso');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveNotes, setLeaveNotes] = useState('');

  // 4. FHIR Server State
  const [fhirUrl, setFhirUrl] = useState(serverInfo?.serverUrl || '');
  const [fhirToken, setFhirToken] = useState('');
  const [isSavingFhir, setIsSavingFhir] = useState(false);
  const [fhirStatusMsg, setFhirStatusMsg] = useState(null);

  // Load practitioners for doctor leaves tab
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
          TAB 1: HORARIOS Y DÍAS DE TRABAJO
          ========================================================================= */}
      {activeTab === 'schedule' && (
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
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              {t('weeklyWorkingDaysTitle')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {daysList.map(({ key, label }) => {
                const dayConfig = schedule.days?.[key] || { enabled: false, start: '08:00', end: '18:00' };

                return (
                  <div
                    key={key}
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: '0.75rem',
                      border: dayConfig.enabled ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                      backgroundColor: dayConfig.enabled ? '#f0fdf4' : '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    {/* Day Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '180px' }}>
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

                    {/* Hours Range */}
                    {dayConfig.enabled ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('startTime')}:</span>
                          <input
                            type="time"
                            className="form-input"
                            value={dayConfig.start || '08:00'}
                            onChange={(e) => handleDayHourChange(key, 'start', e.target.value)}
                            style={{ width: '110px', height: '36px', fontSize: '0.8125rem' }}
                          />
                        </div>

                        <span style={{ color: '#94a3b8' }}>—</span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('endTime')}:</span>
                          <input
                            type="time"
                            className="form-input"
                            value={dayConfig.end || '18:00'}
                            onChange={(e) => handleDayHourChange(key, 'end', e.target.value)}
                            style={{ width: '110px', height: '36px', fontSize: '0.8125rem' }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        {t('closedDay')}
                      </span>
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
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', gap: '0.35rem', color: '#b45309', borderColor: '#fde68a', backgroundColor: '#fef3c7' }}
              >
                <Sparkles size={14} />
                <span>{t('loadOfficialHolidaysBtn')}</span>
              </button>
            </div>

            {/* Manual Add Form */}
            <form onSubmit={handleAddManualHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.875rem', backgroundColor: '#f8fafc', borderRadius: '0.625rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                {t('addManualHolidayTitle')}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="date"
                  className="form-input"
                  value={manualHolidayDate}
                  onChange={(e) => setManualHolidayDate(e.target.value)}
                  style={{ width: '140px', height: '34px', fontSize: '0.8125rem' }}
                  required
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('holidayNamePlaceholder')}
                  value={manualHolidayName}
                  onChange={(e) => setManualHolidayName(e.target.value)}
                  style={{ flex: 1, minWidth: '140px', height: '34px', fontSize: '0.8125rem' }}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ backgroundColor: '#0f766e', height: '34px', fontSize: '0.78rem', gap: '0.3rem' }}
                >
                  <Plus size={14} />
                  <span>{t('addBtn')}</span>
                </button>
              </div>
            </form>

            {/* Holidays List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto' }}>
              {holidays.map((h) => (
                <div
                  key={h.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #fef08a',
                    backgroundColor: '#fefce8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#78350f' }}>
                      {h.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#92400e', fontFamily: 'var(--font-mono)' }}>
                      {h.date}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveHoliday(h.id)}
                    style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: '0.35rem', borderRadius: '4px' }}
                    title={t('btnDelete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: AUSENCIAS Y PERMISOS POR MÉDICO
          ========================================================================= */}
      {activeTab === 'leaves' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* New Doctor Leave Registration Form */}
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

            <form onSubmit={handleAddDoctorLeave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {/* Doctor Selector */}
              <div>
                <label className="form-label">{t('fieldPractitioner')}</label>
                <select
                  value={leaveDoctorId}
                  onChange={(e) => setLeaveDoctorId(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="all">{t('allDoctors')}</option>
                  {practitioners.map(doc => {
                    const prefix = doc.name?.[0]?.prefix?.[0] || 'Dr.';
                    const given = doc.name?.[0]?.given?.join(' ') || '';
                    const family = doc.name?.[0]?.family || '';
                    return (
                      <option key={doc.id} value={doc.id}>
                        {prefix} {given} {family} ({doc.qualification?.[0]?.code?.text || 'Especialista'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Leave Reason */}
              <div>
                <label className="form-label">{t('leaveReasonLabel')}</label>
                <select
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="Congreso">{t('reasonCongress')}</option>
                  <option value="Vacaciones">{t('reasonVacation')}</option>
                  <option value="Incapacidad">{t('reasonMedicalLeave')}</option>
                  <option value="Personal">{t('reasonPersonal')}</option>
                  <option value="Otro">{t('reasonOther')}</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="form-label">{t('startDate')}</label>
                <input
                  type="date"
                  className="form-input"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="form-label">{t('endDate')}</label>
                <input
                  type="date"
                  className="form-input"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  required
                />
              </div>

              {/* Notes */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">{t('leaveNotesLabel')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('leaveNotesPlaceholder')}
                  value={leaveNotes}
                  onChange={(e) => setLeaveNotes(e.target.value)}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#0f766e', gap: '0.4rem', padding: '0.6rem 1.3rem' }}
                >
                  <Plus size={16} />
                  <span>{t('registerLeaveBtn')}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active Doctor Leaves Table */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
              {t('registeredLeavesTitle')} ({doctorLeaves.length})
            </h3>

            {doctorLeaves.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                {t('noDoctorLeavesRegistered')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {doctorLeaves.map((leave) => {
                  const badgeColor = leave.reason === 'Congreso'
                    ? { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }
                    : leave.reason === 'Vacaciones'
                    ? { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' }
                    : { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };

                  return (
                    <div
                      key={leave.id}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '0.75rem',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            backgroundColor: '#e0f2fe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.25rem'
                          }}
                        >
                          👨‍⚕️
                        </div>

                        <div>
                          <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a' }}>
                            {leave.practitionerName}
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                            <span>{leave.startDate} al {leave.endDate}</span>
                            {leave.notes && <span>• "{leave.notes}"</span>}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            backgroundColor: badgeColor.bg,
                            color: badgeColor.text,
                            border: `1px solid ${badgeColor.border}`
                          }}
                        >
                          {leave.reason}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveDoctorLeave(leave.id)}
                          style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: '0.35rem', borderRadius: '4px' }}
                          title={t('btnDelete')}
                        >
                          <Trash2 size={16} />
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
          TAB 4: CONEXIÓN SERVIDOR FHIR
          ========================================================================= */}
      {activeTab === 'fhir' && (
        <form
          onSubmit={handleSaveFhirSettings}
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
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              {t('settingsTitle')}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              {t('settingsSubtitle')}
            </p>
          </div>

          {fhirStatusMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: fhirStatusMsg.type === 'success' ? '#f0fdf4' : '#fff1f2',
                border: `1px solid ${fhirStatusMsg.type === 'success' ? '#bbf7d0' : '#fecdd3'}`,
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                color: fhirStatusMsg.type === 'success' ? '#15803d' : '#be123c',
                fontSize: '0.875rem'
              }}
            >
              {fhirStatusMsg.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
              <span>{fhirStatusMsg.text}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{t('fhirUrlLabel')}</label>
            <input
              type="url"
              className="form-input"
              value={fhirUrl}
              onChange={(e) => setFhirUrl(e.target.value)}
              placeholder="https://fhir.medblocks.com/fhir/..."
              required
            />
            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
              {t('fhirUrlHelper')}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">{t('bearerTokenLabel')}</label>
            <input
              type="password"
              className="form-input"
              value={fhirToken}
              onChange={(e) => setFhirToken(e.target.value)}
              placeholder={serverInfo?.hasToken ? t('tokenConfigured') : t('enterToken')}
            />
            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
              {t('bearerTokenHelper')}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={isSavingFhir}
              className="btn btn-primary"
              style={{ backgroundColor: '#0f766e', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
            >
              <Save size={16} />
              <span>{isSavingFhir ? t('btnSaving') : t('btnSaveSettings')}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
