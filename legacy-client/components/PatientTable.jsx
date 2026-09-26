import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Eye, Trash2, Calendar, ChevronRight } from 'lucide-react';
import { getPatientFullName, formatBirthDate, calculateAge, getPatientIdentifier } from '../utils/fhirHelper';
import { useLanguage } from '../i18n/LanguageContext';

export default function PatientTable({ patients, onEdit, onViewDetails, onDelete }) {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();

  const getGenderBadgeClass = (gender) => {
    switch (gender?.toLowerCase()) {
      case 'male':
        return 'badge-gender badge-gender-male';
      case 'female':
        return 'badge-gender badge-gender-female';
      case 'other':
        return 'badge-gender badge-gender-other';
      default:
        return 'badge-gender badge-gender-unknown';
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

  const handleRowClick = (patientId) => {
    if (patientId) {
      navigate(`/patient/${patientId}`);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)'
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table className="patient-table">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>{t('thPatientName')}</th>
              <th style={{ width: '18%' }}>{t('thGender')}</th>
              <th style={{ width: '25%' }}>{t('thDobAge')}</th>
              <th style={{ width: '22%', textAlign: 'right' }}>{t('thActions')}</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => {
              const fullName = getPatientFullName(patient);
              const age = calculateAge(patient.birthDate);
              const formattedDate = formatBirthDate(patient.birthDate, locale);
              const initials = getAvatarInitials(fullName);
              const identifier = getPatientIdentifier(patient);

              return (
                <tr
                  key={patient.id || Math.random()}
                  onClick={() => handleRowClick(patient.id)}
                  style={{ cursor: 'pointer' }}
                  title={`View details for ${fullName}`}
                  className="patient-row-interactive"
                >
                  {/* Patient Name + Avatar */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: getAvatarBg(patient.gender),
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                          letterSpacing: '0.02em',
                          flexShrink: 0,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        {initials}
                      </div>

                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-primary-800)', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>{fullName === 'Unnamed Patient' ? t('unnamedPatient') : fullName}</span>
                          <ChevronRight size={14} color="#94a3b8" />
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontFamily: 'var(--font-mono)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            marginTop: '2px'
                          }}
                        >
                          <span>{identifier}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Gender */}
                  <td>
                    <span className={getGenderBadgeClass(patient.gender)}>
                      {getGenderLabel(patient.gender)}
                    </span>
                  </td>

                  {/* Date of Birth & Age */}
                  <td>
                    <div>
                      <div style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={14} color="#64748b" />
                        <span>{patient.birthDate || 'N/A'}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        {patient.birthDate ? (
                          <>
                            {formattedDate} {age !== null && <span style={{ fontWeight: 600, color: '#0f766e' }}>({t('yearsOld', { age })})</span>}
                          </>
                        ) : t('dateUnrecorded')}
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td>
                    <div
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(patient);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.35rem 0.65rem' }}
                        title={t('btnEdit')}
                        id={`edit-patient-${patient.id}`}
                      >
                        <Edit2 size={13} color="#0d9488" />
                        <span>{t('btnEdit')}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(patient);
                        }}
                        className="btn btn-secondary btn-sm btn-icon"
                        title={t('btnDetails')}
                        id={`view-patient-${patient.id}`}
                      >
                        <Eye size={14} color="#64748b" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(patient);
                        }}
                        className="btn btn-secondary btn-sm btn-icon"
                        style={{ color: '#ef4444' }}
                        title={t('btnDelete')}
                        id={`delete-patient-${patient.id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
