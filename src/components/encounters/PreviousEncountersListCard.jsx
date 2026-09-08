import React, { useState } from 'react';
import {
  History,
  Calendar,
  Clock,
  ChevronRight,
  Stethoscope,
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  Eye,
  Activity,
  Plus,
  Edit2
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function PreviousEncountersListCard({
  encounters = [],
  onSelectEncounter,
  onNewNote,
  maxInitialItems = 3
}) {
  const { t, locale } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const displayedList = isExpanded ? encounters : encounters.slice(0, maxInitialItems);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.875rem',
        border: '1px solid #e2e8f0',
        padding: '1rem',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#0f766e' }}>
          <History size={16} strokeWidth={2.5} />
          <h4 style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            {t('previousEncountersTitle')}
          </h4>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {onNewNote && (
            <button
              type="button"
              onClick={onNewNote}
              style={{
                border: '1px solid #99f6e4',
                backgroundColor: '#f0fdfa',
                color: '#0f766e',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.7rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Comenzar una nueva nota clínica"
            >
              <Plus size={11} strokeWidth={3} />
              <span>+ Nueva Nota</span>
            </button>
          )}

          {encounters.length > 0 && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                padding: '2px 7px',
                borderRadius: '9999px',
                border: '1px solid #bae6fd'
              }}
            >
              {t('previousEncountersBadge', { count: encounters.length })}
            </span>
          )}
        </div>
      </div>

      {/* Encounters List */}
      {encounters.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {displayedList.map((enc) => {
            const dateStr = formatDate(enc.date);
            const primaryDiag = enc.diagnoses?.[0]?.label || enc.type || 'Consulta';
            return (
              <div
                key={enc.id}
                onClick={() => onSelectEncounter(enc)}
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.625rem',
                  border: '1px solid #e2e8f0',
                  padding: '0.65rem 0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0f766e';
                  e.currentTarget.style.backgroundColor = '#f0fdfa';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(15, 118, 110, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                title={t('reviewPastEncounterBtn')}
              >
                {/* Top Row: Date & Type */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0d9488', fontSize: '0.72rem', fontWeight: 800 }}>
                    <Calendar size={12} />
                    <span>{dateStr}</span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: '#475569',
                      backgroundColor: '#ffffff',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    {enc.type?.slice(0, 18) || 'Consulta'}
                  </span>
                </div>

                {/* Middle: Brief Description / Reason */}
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#1e293b',
                    fontWeight: 600,
                    lineHeight: 1.35,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {enc.reason || enc.summary || 'Revisión y seguimiento clínico.'}
                </div>

                {/* Bottom Row: Doctor & Quick Review Action */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '2px', marginTop: '2px', borderTop: '1px dashed #e2e8f0', fontSize: '0.7rem' }}>
                  <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <User size={11} color="#94a3b8" />
                    <span>{enc.practitionerName?.replace('Dr. ', '').replace('Dra. ', '') || 'Médico'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#0f766e', fontWeight: 700 }}>
                    <span>{t('reviewPastEncounterBtn')}</span>
                    <ChevronRight size={12} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Expand / Collapse Button if more than maxInitialItems */}
          {encounters.length > maxInitialItems && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#0f766e',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0',
                marginTop: '0.2rem'
              }}
            >
              <span>{isExpanded ? t('showLessHistory') : `${t('viewAllHistoryBtn')} (${encounters.length})`}</span>
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
      ) : (
        <div style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
          {t('noPastEncounters')}
        </div>
      )}
    </div>
  );
}
