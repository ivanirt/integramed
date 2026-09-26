import React from 'react';
import { Activity, Calendar, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function ConditionsTable({ conditions = [] }) {
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

  const getConditionName = (cond) => {
    if (!cond) return t('unnamedCondition');
    return cond.code?.text || cond.code?.coding?.[0]?.display || cond.code?.coding?.[0]?.code || t('unnamedCondition');
  };

  const getClinicalStatus = (cond) => {
    const code = cond.clinicalStatus?.coding?.[0]?.code || cond.clinicalStatus?.text || 'active';
    return code.toLowerCase();
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'active':
        return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
      case 'recurrence':
      case 'relapse':
        return { bg: '#fffbeb', text: '#b45309', border: '#fde68a' };
      case 'resolved':
      case 'remission':
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
      default:
        return { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
    }
  };

  if (!conditions || conditions.length === 0) {
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
        <p style={{ fontSize: '0.875rem' }}>{t('noConditionsRecorded')}</p>
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
              <th style={{ width: '45%' }}>{t('conditionName')}</th>
              <th style={{ width: '30%' }}>{t('onsetDate')}</th>
              <th style={{ width: '25%', textAlign: 'right' }}>{t('clinicalStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {conditions.map((cond, idx) => {
              const name = getConditionName(cond);
              const onsetDate = cond.onsetDateTime || cond.recordedDate || cond.onsetPeriod?.start;
              const formattedDate = formatDate(onsetDate);
              const status = getClinicalStatus(cond);
              const badgeStyle = getStatusBadgeStyle(status);
              const codeValue = cond.code?.coding?.[0]?.code;

              return (
                <tr key={cond.id || idx}>
                  {/* Condition Name */}
                  <td>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9375rem' }}>
                        {name}
                      </div>
                      {codeValue && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                          Code: {codeValue}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Onset Date */}
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
