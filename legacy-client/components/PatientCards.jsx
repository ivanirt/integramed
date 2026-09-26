import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Eye, Trash2, Calendar, ChevronRight } from 'lucide-react';
import { getPatientFullName, formatBirthDate, calculateAge, getPatientIdentifier } from '../utils/fhirHelper';
import { useLanguage } from '../i18n/LanguageContext';

export default function PatientCards({ patients, onEdit, onViewDetails, onDelete }) {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();

  const getGenderBadgeClass = (gender) => {
    switch (gender?.toLowerCase()) {
      case 'male': return 'badge-gender badge-gender-male';
      case 'female': return 'badge-gender badge-gender-female';
      case 'other': return 'badge-gender badge-gender-other';
      default: return 'badge-gender badge-gender-unknown';
    }
  };

  const getGenderLabel = (gender) => {
    switch (gender?.toLowerCase()) {
      case 'male': return t('genderMale');
      case 'female': return t('genderFemale');
      case 'other': return t('genderOther');
      default: return t('genderUnknown');
    }
  };

  const getAvatarInitials = (name) => {
    if (!name || name === 'Unnamed Patient' || name === t('unnamedPatient')) return 'PT';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarBg = (gender) => {
    switch (gender?.toLowerCase()) {
      case 'male': return '#0284c7';
      case 'female': return '#db2777';
      case 'other': return '#9333ea';
      default: return '#0d9488';
    }
  };

  const handleCardClick = (patientId) => {
    if (patientId) {
      navigate(`/patient/${patientId}`);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.25rem' }}>
      {patients.map((patient) => {
        const fullName = getPatientFullName(patient);
        const age = calculateAge(patient.birthDate);
        const formattedDate = formatBirthDate(patient.birthDate, locale);
        const initials = getAvatarInitials(fullName);
        const identifier = getPatientIdentifier(patient);

        return (
          <div
            key={patient.id || Math.random()}
            onClick={() => handleCardClick(patient.id)}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            className="patient-card-interactive"
          >
            <div>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: getAvatarBg(patient.gender),
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      flexShrink: 0
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>{fullName === 'Unnamed Patient' ? t('unnamedPatient') : fullName}</span>
                      <ChevronRight size={14} color="#94a3b8" />
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                      {identifier}
                    </div>
                  </div>
                </div>

                <span className={getGenderBadgeClass(patient.gender)}>
                  {getGenderLabel(patient.gender)}
                </span>
              </div>

              {/* Patient Info */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#334155' }}>
                  <Calendar size={14} color="#64748b" />
                  <span>{t('dobLabel')} <strong>{patient.birthDate || 'N/A'}</strong></span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', paddingLeft: '1.25rem' }}>
                  {formattedDate} {age !== null && t('yearsOldLong', { age })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.875rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(patient);
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem' }}
              >
                <Eye size={13} />
                {t('btnDetails')}
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(patient);
                  }}
                  className="btn btn-outline-primary btn-sm"
                  style={{ fontSize: '0.75rem' }}
                >
                  <Edit2 size={13} />
                  {t('btnEdit')}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(patient);
                  }}
                  className="btn btn-secondary btn-sm btn-icon"
                  style={{ color: '#ef4444' }}
                  title={t('btnDelete')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
