import React, { useState, useMemo } from 'react';
import { History, Stethoscope, Microscope, FileText, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function ClinicalTimeline({ encounters = [], observations = [], medications = [] }) {
  const { locale, t } = useLanguage();
  const [showAll, setShowAll] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Merge and sort all events chronologically newest first
  const timelineEvents = useMemo(() => {
    const events = [];

    // Encounters
    encounters.forEach(enc => {
      const date = enc.period?.start || enc.meta?.lastUpdated;
      if (!date) return;
      const type = enc.type?.[0]?.text || enc.type?.[0]?.coding?.[0]?.display || 'Consulta Médica';
      const reason = enc.reasonCode?.[0]?.text || enc.type?.[0]?.text || 'Consulta y revisión clínica general.';
      const doctor = enc.participant?.[0]?.individual?.display || 'Personal Médico';

      events.push({
        id: `enc-${enc.id}`,
        type: 'encounter',
        title: type,
        date,
        timestamp: new Date(date).getTime(),
        note: reason,
        doctor,
        badgeBg: '#ecfdf5',
        badgeColor: '#059669',
        icon: Stethoscope
      });
    });

    // Recent key lab observations (group by date)
    const obsByDate = new Map();
    observations.slice(0, 15).forEach(obs => {
      const date = obs.effectiveDateTime || obs.issued;
      if (!date) return;
      const dateKey = date.slice(0, 10);
      const name = obs.code?.text || obs.code?.coding?.[0]?.display || 'Observación';
      const val = obs.valueQuantity ? `${obs.valueQuantity.value} ${obs.valueQuantity.unit || ''}` : '';
      
      const existing = obsByDate.get(dateKey) || [];
      existing.push(`${name}: ${val}`);
      obsByDate.set(dateKey, existing);
    });

    obsByDate.forEach((items, dateKey) => {
      events.push({
        id: `obs-${dateKey}`,
        type: 'lab',
        title: t('labResultsTitle'),
        date: dateKey,
        timestamp: new Date(dateKey).getTime(),
        note: items.slice(0, 3).join(' • '),
        badgeBg: '#f1f5f9',
        badgeColor: '#475569',
        icon: Microscope
      });
    });

    // Medications / Prescriptions
    medications.forEach(med => {
      const date = med.authoredOn || med.meta?.lastUpdated;
      if (!date) return;
      const name = med.medicationCodeableConcept?.text || med.medicationCodeableConcept?.coding?.[0]?.display || 'Medicamento';
      const status = med.status || 'active';

      events.push({
        id: `med-${med.id}`,
        type: 'prescription',
        title: t('prescriptionRenewalTitle'),
        date,
        timestamp: new Date(date).getTime(),
        note: `${name} (${t('status')}: ${status})`,
        badgeBg: '#eff6ff',
        badgeColor: '#2563eb',
        icon: FileText
      });
    });

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }, [encounters, observations, medications, t]);

  const displayedEvents = showAll ? timelineEvents : timelineEvents.slice(0, 5);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.875rem',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={18} color="var(--color-primary-600)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            {t('clinicalTimelineTitle')}
          </h3>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
          {timelineEvents.length} {t('events')}
        </span>
      </div>

      {/* Timeline Stream */}
      {timelineEvents.length > 0 ? (
        <div style={{ position: 'relative', paddingLeft: '1.75rem' }}>
          {/* Vertical Connecting Line */}
          <div
            style={{
              position: 'absolute',
              left: '14px',
              top: '12px',
              bottom: '12px',
              width: '2px',
              backgroundColor: '#e2e8f0'
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {displayedEvents.map((ev) => {
              const Icon = ev.icon;
              return (
                <div key={ev.id} style={{ position: 'relative' }}>
                  {/* Dot / Icon Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-1.75rem',
                      top: '0px',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: ev.badgeBg,
                      border: '2px solid #ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      color: ev.badgeColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2
                    }}
                  >
                    <Icon size={14} />
                  </div>

                  {/* Event Details Card */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                        {ev.title}
                      </h4>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: '#0d9488', fontWeight: 600, marginTop: '1px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={11} />
                      <span>{formatDate(ev.date)}</span>
                    </div>

                    {/* Note Box */}
                    <div
                      style={{
                        marginTop: '0.45rem',
                        padding: '0.65rem 0.85rem',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #f1f5f9',
                        borderRadius: '0.5rem',
                        fontSize: '0.8125rem',
                        color: '#475569',
                        lineHeight: 1.4
                      }}
                    >
                      {ev.note}
                      {ev.doctor && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>
                          👨‍⚕️ {ev.doctor}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toggle Expand / Collapse */}
          {timelineEvents.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              style={{
                marginTop: '1rem',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-primary-700)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>{showAll ? t('showLessHistory') : t('viewFullHistory')}</span>
              {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      ) : (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
          {t('noTimelineEvents')}
        </div>
      )}
    </div>
  );
}
