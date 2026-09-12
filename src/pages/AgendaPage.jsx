import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Stethoscope,
  Plus,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  ArrowRight,
  RefreshCw,
  UserCheck,
  CalendarDays,
  Activity,
  CalendarRange,
  ListFilter,
  Layers,
  FileText,
  X
} from 'lucide-react';
import { getEncounters } from '../services/fhirApi';
import ClinicalCalendar from '../components/encounters/ClinicalCalendar';
import ClinicalWeeklyCalendar from '../components/encounters/ClinicalWeeklyCalendar';
import ScheduleEncounterModal from '../components/encounters/ScheduleEncounterModal';
import AppointmentManageModal from '../components/encounters/AppointmentManageModal';
import ErrorAlert from '../components/ErrorAlert';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { useLanguage } from '../i18n/LanguageContext';
import { getStaffList } from '../utils/staffStorage';
import { getStoredAppointments, updateAppointment, loadAppointmentsFromFhir } from '../utils/appointmentStorage';

export default function AgendaPage({ addToast, onOpenScheduleModal }) {
  const navigate = useNavigate();
  const { t, locale } = useLanguage();

  const [encounters, setEncounters] = useState([]);
  const [storedAppointments, setStoredAppointments] = useState(() => getStoredAppointments());
  const [selectedEncounterForManage, setSelectedEncounterForManage] = useState(null);
  const [isManageOpen, setIsManageOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // View Mode: 'calendar' | 'list'
  const [viewMode, setViewMode] = useState('calendar');

  // Selected date on calendar (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Three required filters: Paciente, Doctor, Motivo
  const [filterPatient, setFilterPatient] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterReason, setFilterReason] = useState('');

  // Status & general search filters for list view
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'planned' | 'in-progress' | 'finished'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleInitialDate, setScheduleInitialDate] = useState(null);

  // Listen to appointment changes across app (Create, Update, Delete)
  useEffect(() => {
    const handleSync = () => {
      setStoredAppointments(getStoredAppointments());
    };
    window.addEventListener('integramed_appointments_changed', handleSync);
    return () => window.removeEventListener('integramed_appointments_changed', handleSync);
  }, []);

  const loadEncounters = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [data, stored] = await Promise.all([
        getEncounters(),
        loadAppointmentsFromFhir()
      ]);
      setEncounters(data || []);
      setStoredAppointments(stored || getStoredAppointments());
    } catch (err) {
      console.error('Failed to load encounters:', err);
      setError(err);
      if (addToast) {
        addToast('error', err.message || 'Failed to fetch encounters from FHIR server', t('toastErrorTitle'));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    loadEncounters();
  }, [loadEncounters]);

  // Doctors & therapists for the filter dropdown
  const doctorsList = useMemo(() => {
    try {
      const staff = getStaffList();
      return staff.filter(s => s.roles?.includes('doctor') || s.roles?.includes('therapist'));
    } catch {
      return [];
    }
  }, []);

  // Handle scheduling for a specific date
  const handleOpenScheduleForDate = (dateStr) => {
    setScheduleInitialDate(dateStr || selectedDate);
    setIsScheduleOpen(true);
  };

  // Handle scheduling for a specific 30-min slot from weekly grid
  const handleOpenScheduleForSlot = (dateStr, timeStr) => {
    setScheduleInitialDate(`${dateStr}T${timeStr}:00`);
    setIsScheduleOpen(true);
  };

  // Combined encounters: persistent stored appointments (CRUD) + real FHIR encounters + today's appointments
  const allEncounters = useMemo(() => {
    const list = [...storedAppointments];
    const seenIds = new Set(storedAppointments.map(e => e.id));

    // Include any external FHIR encounters not already in local storage
    encounters.forEach(enc => {
      if (!seenIds.has(enc.id)) {
        seenIds.add(enc.id);
        list.push(enc);
      }
    });

    // Add any today appointments from dashboardStorage
    try {
      const todayAppts = getTodayAppointments();
      todayAppts.forEach(appt => {
        if (!seenIds.has(appt.id)) {
          seenIds.add(appt.id);
          list.push({
            id: appt.id,
            date: todayStr,
            time: appt.time,
            patientId: appt.patientId,
            patientName: appt.patientName,
            practitionerName: appt.practitionerName || '',
            reason: appt.reason,
            status: appt.status,
            statusLabel: appt.statusLabel,
            room: appt.room,
            subject: { display: appt.patientName, reference: `Patient/${appt.patientId}` },
            participant: [{ individual: { display: appt.practitionerName || '' } }],
            reasonCode: [{ text: appt.reason }],
            type: [{ text: appt.reason }]
          });
        }
      });
    } catch (e) {
      console.warn('Error loading today appointments into agenda:', e);
    }

    return list;
  }, [storedAppointments, encounters, todayStr]);

  // Filtered encounters for list view & stats
  const filteredEncounters = useMemo(() => {
    return allEncounters.filter(enc => {
      // Status filter
      if (statusFilter !== 'all' && enc.status !== statusFilter) {
        return false;
      }
      // Patient filter
      if (filterPatient.trim()) {
        const pQuery = filterPatient.toLowerCase().trim();
        const pName = (enc.patientName || enc.subject?.display || '').toLowerCase();
        if (!pName.includes(pQuery)) return false;
      }
      // Doctor filter
      if (filterDoctor.trim()) {
        const dQuery = filterDoctor.toLowerCase().trim();
        const docName = (enc.practitionerName || enc.participant?.[0]?.individual?.display || '').toLowerCase();
        if (!docName.includes(dQuery)) return false;
      }
      // Reason filter
      if (filterReason.trim()) {
        const rQuery = filterReason.toLowerCase().trim();
        const reason = (enc.reason || enc.reasonCode?.[0]?.text || enc.type?.[0]?.text || '').toLowerCase();
        if (!reason.includes(rQuery)) return false;
      }
      // General search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const subjectDisplay = enc.subject?.display?.toLowerCase() || '';
        const practitionerDisplay = enc.participant?.[0]?.individual?.display?.toLowerCase() || '';
        const reason = enc.reasonCode?.[0]?.text?.toLowerCase() || '';
        const typeText = enc.type?.[0]?.text?.toLowerCase() || '';
        if (!subjectDisplay.includes(query) && !practitionerDisplay.includes(query) && !reason.includes(query) && !typeText.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [allEncounters, statusFilter, filterPatient, filterDoctor, filterReason, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const planned = allEncounters.filter(e => e.status === 'planned').length;
    const inProgress = allEncounters.filter(e => e.status === 'in-progress' || e.status === 'in_consultation' || e.status === 'in_room').length;
    const finished = allEncounters.filter(e => e.status === 'finished' || e.status === 'completed').length;
    return { total: allEncounters.length, planned, inProgress, finished };
  }, [allEncounters]);

  const formatEncounterDate = (isoString) => {
    if (!isoString) return { dateStr: t('unrecordedDate'), timeStr: '' };
    try {
      const date = new Date(isoString);
      const dateStr = date.toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const timeStr = date.toLocaleTimeString(locale === 'es' ? 'es-MX' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return { dateStr, timeStr };
    } catch {
      return { dateStr: isoString, timeStr: '' };
    }
  };

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return '';
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate, locale]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'planned':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
            <Clock size={12} />
            {t('statusPlanned')}
          </span>
        );
      case 'in-progress':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
            <Activity size={12} />
            {t('statusInProgress')}
          </span>
        );
      case 'finished':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
            <CheckCircle2 size={12} />
            {t('statusFinished')}
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
            {status || 'Unknown'}
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '1.75rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <CalendarIcon size={20} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {t('agendaTitle')}
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
            {t('agendaSubtitle')}
          </p>
        </div>

        {/* Top Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* View Mode Toggle: Calendar vs List */}
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', padding: '3px', gap: '2px' }}>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                border: 'none',
                background: viewMode === 'calendar' ? '#ffffff' : 'transparent',
                color: viewMode === 'calendar' ? '#0f766e' : '#64748b',
                fontWeight: viewMode === 'calendar' ? 700 : 500,
                fontSize: '0.8125rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: viewMode === 'calendar' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <CalendarDays size={15} />
              <span>{t('calendarView')}</span>
            </button>

            <button
              onClick={() => setViewMode('list')}
              style={{
                border: 'none',
                background: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? '#0f766e' : '#64748b',
                fontWeight: viewMode === 'list' ? 700 : 500,
                fontSize: '0.8125rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <ListFilter size={15} />
              <span>{t('listView')}</span>
            </button>
          </div>

          <button
            onClick={() => loadEncounters(true)}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
            title={t('refreshTooltip')}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin-fast' : ''} />
            <span>{t('refresh')}</span>
          </button>

          {/* Primary Action Button with + btnNewAppointment text */}
          <button
            onClick={() => handleOpenScheduleForDate(selectedDate)}
            className="btn btn-primary"
            style={{ backgroundColor: '#0f766e', boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)', gap: '0.4rem' }}
            id="new-appointment-btn"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{t('btnNewAppointment')}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
            <CalendarDays size={19} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{t('totalEncounters')}</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{stats.total}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
            <Clock size={19} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{t('statusPlanned')}</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1d4ed8' }}>{stats.planned}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <Activity size={19} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{t('statusInProgress')}</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669' }}>{stats.inProgress}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <CheckCircle2 size={19} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{t('statusFinished')}</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#475569' }}>{stats.finished}</div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && <ErrorAlert error={error} onRetry={() => loadEncounters()} title={t('errorTitle')} />}

      {/* Loading Skeleton */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : viewMode === 'calendar' ? (
        /* =========================================================================
           WEEKLY CALENDAR VIEW: Monday to Sunday (08:00 - 22:00, 30 min intervals)
           With direct filtering by: Paciente, Doctor, and Motivo
           ========================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Filter Bar: Paciente, Doctor, Motivo */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.875rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f766e' }}>
                  <Filter size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Filtros de Agenda
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Filtre citas por paciente, doctor o motivo clínico
                  </span>
                </div>
                {(filterPatient || filterDoctor || filterReason) && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, backgroundColor: '#ccfbf1', color: '#0f766e', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #99f6e4' }}>
                    Filtros activos
                  </span>
                )}
              </div>

              {(filterPatient || filterDoctor || filterReason) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterPatient('');
                    setFilterDoctor('');
                    setFilterReason('');
                  }}
                  style={{
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#b91c1c',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.35rem 0.8rem',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <X size={13} />
                  <span>Limpiar filtros</span>
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.875rem' }}>
              {/* 1. FILTRAR POR PACIENTE */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <User size={13} color="#0f766e" />
                  <span>Paciente</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={filterPatient}
                    onChange={(e) => setFilterPatient(e.target.value)}
                    placeholder="Escriba el nombre del paciente..."
                    style={{
                      paddingRight: filterPatient ? '2rem' : '0.75rem',
                      height: '38px',
                      fontSize: '0.8125rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.5rem',
                      width: '100%'
                    }}
                  />
                  {filterPatient && (
                    <button
                      type="button"
                      onClick={() => setFilterPatient('')}
                      style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
                      title="Limpiar paciente"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. FILTRAR POR DOCTOR */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <Stethoscope size={13} color="#0284c7" />
                  <span>Doctor / Terapeuta</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="form-input"
                    value={filterDoctor}
                    onChange={(e) => setFilterDoctor(e.target.value)}
                    style={{
                      height: '38px',
                      fontSize: '0.8125rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.5rem',
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Todos los doctores / terapeutas</option>
                    {doctorsList.map((doc) => (
                      <option key={doc.id || doc.name} value={doc.name}>
                        {doc.name} {doc.specialty ? `— ${doc.specialty}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. FILTRAR POR MOTIVO */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <FileText size={13} color="#d97706" />
                  <span>Motivo de Consulta</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={filterReason}
                    onChange={(e) => setFilterReason(e.target.value)}
                    placeholder="Filtrar por motivo, diagnóstico o tipo..."
                    style={{
                      paddingRight: filterReason ? '2rem' : '0.75rem',
                      height: '38px',
                      fontSize: '0.8125rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.5rem',
                      width: '100%'
                    }}
                  />
                  {filterReason && (
                    <button
                      type="button"
                      onClick={() => setFilterReason('')}
                      style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
                      title="Limpiar motivo"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Interactive Grid (Mon to Sun, 08:00 - 22:00, 30 min slots) */}
          <ClinicalWeeklyCalendar
            encounters={allEncounters}
            filterPatient={filterPatient}
            filterDoctor={filterDoctor}
            filterReason={filterReason}
            onSelectDate={(dateStr) => setSelectedDate(dateStr)}
            onScheduleSlot={(dateStr, timeStr) => {
              handleOpenScheduleForSlot(dateStr, timeStr);
            }}
            onEncounterClick={(enc) => {
              setSelectedEncounterForManage(enc);
              setIsManageOpen(true);
            }}
            onAppointmentMove={async (enc, targetDate, targetTime) => {
              try {
                const updated = await updateAppointment(enc.id, {
                  date: targetDate,
                  time: targetTime
                });
                setStoredAppointments(getStoredAppointments());
                const patientName = enc.patientName || enc.subject?.display || 'Paciente';
                if (addToast) {
                  addToast(
                    'success',
                    `Cita de ${patientName} reprogramada al ${targetDate} a las ${targetTime} hrs`,
                    'Agenda'
                  );
                }
                return updated;
              } catch (err) {
                console.error('Error al reprogramar cita:', err);
                if (addToast) {
                  addToast('error', 'No se pudo mover la cita', 'Error');
                }
              }
            }}
          />
        </div>
      ) : (
        /* =========================================================================
           LIST VIEW: Filterable table/cards of all encounters
           ========================================================================= */
        <div>
          {/* Filter and Search Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            {/* Status Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '0.5rem', gap: '3px' }}>
              {[
                { id: 'all', label: `${t('filterAll')} (${stats.total})` },
                { id: 'planned', label: `${t('statusPlanned')} (${stats.planned})` },
                { id: 'in-progress', label: `${t('statusInProgress')} (${stats.inProgress})` },
                { id: 'finished', label: `${t('statusFinished')} (${stats.finished})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    border: 'none',
                    background: statusFilter === tab.id ? '#ffffff' : 'transparent',
                    color: statusFilter === tab.id ? '#0f766e' : '#64748b',
                    fontWeight: statusFilter === tab.id ? 700 : 500,
                    fontSize: '0.8125rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    boxShadow: statusFilter === tab.id ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchEncountersPlaceholder')}
                style={{
                  paddingLeft: '2.25rem',
                  height: '36px',
                  fontSize: '0.8125rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem'
                }}
              />
            </div>
          </div>

          {filteredEncounters.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                padding: '4rem 2rem',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#f0fdf4',
                  border: '2px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto',
                  color: '#16a34a'
                }}
              >
                <CalendarIcon size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                {searchQuery || statusFilter !== 'all' ? t('noMatchingEncounters') : t('noEncountersTitle')}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
                {searchQuery || statusFilter !== 'all' ? t('noMatchingEncountersDesc') : t('noEncountersDesc')}
              </p>
              <button
                onClick={() => handleOpenScheduleForDate(todayStr)}
                className="btn btn-primary"
                style={{ backgroundColor: '#0f766e', margin: '0 auto', gap: '0.4rem' }}
              >
                <Plus size={16} />
                <span>{t('btnNewAppointment')}</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredEncounters.map((enc) => {
                const { dateStr, timeStr } = formatEncounterDate(enc.period?.start);
                const patientRef = enc.subject?.reference || '';
                const patientId = patientRef.replace('Patient/', '');
                const patientName = enc.subject?.display || patientRef || t('unnamedPatient');
                const practitionerName = enc.participant?.[0]?.individual?.display || t('unassignedPractitioner');
                const encounterType = enc.type?.[0]?.text || enc.type?.[0]?.coding?.[0]?.display || 'Consulta General';
                const reason = enc.reasonCode?.[0]?.text || enc.reasonCode?.[0]?.coding?.[0]?.display;

                return (
                  <div
                    key={enc.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '0.75rem',
                      border: '1px solid #e2e8f0',
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Left: Date, Time & Icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: '220px' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '0.625rem',
                          backgroundColor: enc.status === 'planned' ? '#eff6ff' : enc.status === 'in-progress' ? '#ecfdf5' : '#f8fafc',
                          border: `1px solid ${enc.status === 'planned' ? '#bfdbfe' : enc.status === 'in-progress' ? '#a7f3d0' : '#e2e8f0'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Clock size={18} color={enc.status === 'planned' ? '#1d4ed8' : enc.status === 'in-progress' ? '#059669' : '#64748b'} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', marginTop: '2px' }}>
                          {timeStr}
                        </span>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a' }}>
                          {dateStr}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>FHIR ID: {enc.id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Patient & Practitioner */}
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div
                          onClick={() => patientId && navigate(`/patient/${patientId}`)}
                          style={{
                            fontSize: '0.9375rem',
                            fontWeight: 700,
                            color: patientId ? 'var(--color-primary-700)' : '#0f172a',
                            cursor: patientId ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <User size={15} color="var(--color-primary-600)" />
                          <span>{patientName}</span>
                        </div>

                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>•</span>

                        <span style={{ fontSize: '0.8125rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Stethoscope size={14} color="#0d9488" />
                          {practitionerName}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', backgroundColor: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                          {encounterType}
                        </span>
                        {reason && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                            "{reason}"
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Status badge & Navigate CTA */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {getStatusBadge(enc.status)}

                      <button
                        onClick={() => {
                          setSelectedEncounterForManage(enc);
                          setIsManageOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ borderRadius: '9999px', fontSize: '0.75rem', gap: '0.35rem' }}
                        title="Ver o editar cita"
                      >
                        <CalendarIcon size={13} />
                        <span>Detalles</span>
                      </button>

                      {patientId && (
                        <button
                          onClick={() => navigate(`/patient/${patientId}`)}
                          className="btn btn-secondary btn-sm"
                          style={{ borderRadius: '9999px', fontSize: '0.75rem', gap: '0.35rem' }}
                        >
                          <span>{t('viewProfile')}</span>
                          <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Schedule Encounter Modal */}
      <ScheduleEncounterModal
        isOpen={isScheduleOpen}
        initialDate={scheduleInitialDate}
        onClose={() => {
          setIsScheduleOpen(false);
          setScheduleInitialDate(null);
        }}
        onEncounterScheduled={() => {
          setStoredAppointments(getStoredAppointments());
          loadEncounters(true);
          if (addToast) {
            addToast('success', t('encounterScheduledToast'), t('toastCreatedTitle'));
          }
        }}
      />

      {/* Manage / Edit / Delete Appointment Modal */}
      <AppointmentManageModal
        isOpen={isManageOpen}
        encounter={selectedEncounterForManage}
        onClose={() => {
          setIsManageOpen(false);
          setSelectedEncounterForManage(null);
        }}
        onUpdated={(updated) => {
          setStoredAppointments(getStoredAppointments());
          setSelectedEncounterForManage(updated);
          if (addToast) {
            addToast('success', 'Cita médica actualizada correctamente', 'Agenda');
          }
        }}
        onDeleted={() => {
          setStoredAppointments(getStoredAppointments());
          setIsManageOpen(false);
          setSelectedEncounterForManage(null);
          if (addToast) {
            addToast('info', 'Cita eliminada de la agenda', 'Agenda');
          }
        }}
      />
    </div>
  );
}
