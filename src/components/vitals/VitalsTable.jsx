import React, { useState, useMemo } from 'react';
import { Calendar, Filter, ArrowUpDown } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function VitalsTable({ readings = [] }) {
  const { locale, t } = useLanguage();
  const [selectedType, setSelectedType] = useState('all');
  const [sortAsc, setSortAsc] = useState(false);

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Distinct types
  const types = useMemo(() => {
    const set = new Set(readings.map(r => r.type));
    return Array.from(set);
  }, [readings]);

  // Filtered & sorted readings
  const displayedReadings = useMemo(() => {
    let list = selectedType === 'all' ? [...readings] : readings.filter(r => r.type === selectedType);
    list.sort((a, b) => sortAsc ? a.timestamp - b.timestamp : b.timestamp - a.timestamp);
    return list;
  }, [readings, selectedType, sortAsc]);

  if (!readings || readings.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          padding: '3rem 2rem',
          textAlign: 'center',
          color: '#64748b'
        }}
      >
        <p>{t('noObservationsRecorded')}</p>
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
      {/* Table Filter Bar */}
      <div
        style={{
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={14} color="#64748b" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
            {t('filterByType')}:
          </span>
          <select
            className="form-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.8125rem', height: '32px', width: 'auto' }}
          >
            <option value="all">{t('filterAll')} ({readings.length})</option>
            {types.map(tType => (
              <option key={tType} value={tType}>{tType}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.75rem' }}
        >
          <ArrowUpDown size={13} />
          <span>{sortAsc ? t('sortOldestFirst') : t('sortNewestFirst')}</span>
        </button>
      </div>

      {/* Readings Table */}
      <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
        <table className="patient-table">
          <thead>
            <tr>
              <th style={{ width: '28%' }}>{t('dateRecorded')}</th>
              <th style={{ width: '28%' }}>{t('vitalSign')}</th>
              <th style={{ width: '18%' }}>LOINC</th>
              <th style={{ width: '16%' }}>{t('valueUnit')}</th>
              <th style={{ width: '10%', textAlign: 'right' }}>{t('status')}</th>
            </tr>
          </thead>
          <tbody>
            {displayedReadings.map((row, idx) => (
              <tr key={row.id || idx}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: '#1e293b' }}>
                    <Calendar size={13} color="#64748b" />
                    <span>{formatDate(row.date)}</span>
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                  {row.type}
                </td>
                <td>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      backgroundColor: '#f1f5f9',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      color: '#475569'
                    }}
                  >
                    {row.code}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: '#0d9488', fontSize: '0.9375rem' }}>
                    {row.value}
                  </span>{' '}
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.unit}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      backgroundColor: row.status === 'final' ? '#ecfdf5' : '#f1f5f9',
                      color: row.status === 'final' ? '#047857' : '#64748b',
                      border: `1px solid ${row.status === 'final' ? '#a7f3d0' : '#e2e8f0'}`
                    }}
                  >
                    {row.status || 'final'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
