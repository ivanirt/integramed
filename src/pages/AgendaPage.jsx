import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
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
  Activity
} from 'lucide-react';
import { getEncounters } from '../services/fhirApi';
import ScheduleEncounterModal from '../components/encounters/ScheduleEncounterModal';
import ErrorAlert from '../components/ErrorAlert';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { useLanguage } from '../i18n/LanguageContext';

export default function AgendaPage({ addToast, onOpenScheduleModal }) {
  const navigate = useNavigate();
  const { t, locale } = useLanguage();

  const [encounters, setEncounters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'planned' | 'in-progress' | 'finished'
  const [searchQuery, setSearchQuery] = useState('');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const loadEncounters = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await getEncounters();
      setEncounters(data || []);
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

  // Filtered list
  const filteredEncounters = useMemo(() => {
    return encounters.filter(enc => {
      // Status filter
      if (statusFilter !== 'all' && enc.status !== statusFilter) {
        return false;
      }
      // Search query
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
  }, [encounters, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const planned = encounters.filter(e => e.status === 'planned').length;
    const inProgress = encounters.filter(e => e.status === 'in-progress').length;
    const finished = encounters.filter(e => e.status === 'finished').length;
    return { total: encounters.length, planned, inProgress, finished };
  }, [encounters]);

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
              <Calendar size={20} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {t('agendaTitle')}
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
            {t('agendaSubtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => loadEncounters(true)}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
            title={t('refreshTooltip')}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin-fast' : ''} />
            <span>{t('refresh')}</span>
          </button>

          <button
            onClick={() => setIsScheduleOpen(true)}
            className="btn btn-primary"
            style={{ backgroundColor: '#0f766e', boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)' }}
            id="schedule-encounter-btn"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{t('scheduleEncounterBtn')}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
            <CalendarDays size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('totalEncounters')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{stats.total}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('statusPlanned')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1d4ed8' }}>{stats.planned}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <Activity size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('statusInProgress')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{stats.inProgress}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('statusFinished')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#475569' }}>{stats.finished}</div>
          </div>
        </div>
      </div>

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

      {/* Error state */}
      {error && <ErrorAlert error={error} onRetry={() => loadEncounters()} title={t('errorTitle')} />}

      {/* Loading state */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filteredEncounters.length === 0 ? (
        /* Empty State */
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
            <Calendar size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            {searchQuery || statusFilter !== 'all' ? t('noMatchingEncounters') : t('noEncountersTitle')}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
            {searchQuery || statusFilter !== 'all' ? t('noMatchingEncountersDesc') : t('noEncountersDesc')}
          </p>
          <button
            onClick={() => setIsScheduleOpen(true)}
            className="btn btn-primary"
            style={{ backgroundColor: '#0f766e', margin: '0 auto' }}
          >
            <Plus size={16} />
            <span>{t('scheduleFirstEncounter')}</span>
          </button>
        </div>
      ) : (
        /* Encounters List Cards / Table */
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

      {/* Schedule Encounter Modal */}
      <ScheduleEncounterModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onEncounterScheduled={() => {
          loadEncounters(true);
          if (addToast) {
            addToast('success', t('encounterScheduledToast'), t('toastCreatedTitle'));
          }
        }}
      />
    </div>
  );
}
