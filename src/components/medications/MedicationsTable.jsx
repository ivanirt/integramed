import React from 'react';
import { Pill, Calendar, CheckCircle2, Clock, Ban, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function MedicationsTable({ medications = [] }) {
  const { locale, t } = useLanguage();

  const formatDate = (dateStr) => {
    if (!dateStr) return t('unrecorded');
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const getMedicationName = (med) => {
    if (!med) return t('unnamedMedication');
    return (
      med.medicationCodeableConcept?.text ||
      med.medicationCodeableConcept?.coding?.[0]?.display ||
      med.medicationCodeableConcept?.coding?.[0]?.code ||
      med.medicationReference?.display ||
      t('unnamedMedication')
    );
  };

  const getDosageInstruction = (med) => {
    if (med.dosageInstruction && med.dosageInstruction[0]?.text) {
      return med.dosageInstruction[0].text;
    }
    return null;
  };

  const getStatusBadgeStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
      case 'completed':
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
      case 'stopped':
      case 'cancelled':
        return { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' };
      case 'on-hold':
        return { bg: '#fffbeb', text: '#b45309', border: '#fde68a' };
      default:
        return { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
    }
  };

  if (!medications || medications.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          padding: '3rem 2rem',
          textAlign: 'center',
          color: '#64748b',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}
      >
        <p style={{ fontSize: '0.875rem' }}>{t('noMedicationsRecorded')}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table className="patient-table">
          <thead>
            <tr>
              <th style={{ width: '45%' }}>{t('medicationName')}</th>
              <th style={{ width: '30%' }}>{t('datePrescribed')}</th>
              <th style={{ width: '25%', textAlign: 'right' }}>{t('status')}</th>
            </tr>
          </thead>
          <tbody>
            {medications.map((med, idx) => {
              const name = getMedicationName(med);
              const dosage = getDosageInstruction(med);
              const date = med.authoredOn || med.meta?.lastUpdated;
              const formattedDate = formatDate(date);
              const status = med.status || 'unknown';
              const badgeStyle = getStatusBadgeStyle(status);

              return (
                <tr key={med.id || idx}>
                  {/* Medication Name & Dosage */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#f0fdfa',
                          color: '#0d9488',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px'
                        }}
                      >
                        <Pill size={16} />
                      </div>

                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9375rem' }}>
                          {name}
                        </div>
                        {dosage && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {dosage}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Date Prescribed */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: '#334155' }}>
                      <Calendar size={14} color="#64748b" />
                      <span>{formattedDate}</span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '9999px',
                        backgroundColor: badgeStyle.bg,
                        color: badgeStyle.text,
                        border: `1px solid ${badgeStyle.border}`
                      }}
                    >
                      {status === 'active' && <CheckCircle2 size={12} />}
                      {status === 'completed' && <Clock size={12} />}
                      {(status === 'stopped' || status === 'cancelled') && <Ban size={12} />}
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
