import React, { useState } from 'react';
import { X, Copy, Check, User, Hash, FileJson } from 'lucide-react';
import { getPatientFullName, formatBirthDate, calculateAge } from '../utils/fhirHelper';
import { useLanguage } from '../i18n/LanguageContext';

export default function PatientDetailModal({ isOpen, patient, onClose }) {
  const { t, locale } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !patient) return null;

  const fullName = getPatientFullName(patient);
  const age = calculateAge(patient.birthDate);
  const formattedDate = formatBirthDate(patient.birthDate, locale);

  const getGenderLabel = (gender) => {
    switch (gender?.toLowerCase()) {
      case 'male': return t('genderMale');
      case 'female': return t('genderFemale');
      case 'other': return t('genderOther');
      default: return t('genderUnknown');
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(patient, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-modal-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary-100)',
                color: 'var(--color-primary-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}
            >
              <User size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                {fullName === 'Unnamed Patient' ? t('unnamedPatient') : fullName}
              </h3>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                FHIR ID: {patient.id}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            style={{ border: 'none', color: '#64748b' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Clinical Overview Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{t('thGender')}</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', textTransform: 'capitalize', marginTop: '2px' }}>
                {getGenderLabel(patient.gender)}
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{t('birthDateLabel')}</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                {patient.birthDate || t('dateUnrecorded')}
              </div>
              {age !== null && (
                <div style={{ fontSize: '0.75rem', color: '#0d9488', fontWeight: 600 }}>{t('yearsOldLong', { age })}</div>
              )}
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{t('resourceType')}</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                {patient.resourceType} (R4)
              </div>
            </div>
          </div>

          {/* Identifiers if any */}
          {patient.identifier && patient.identifier.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Hash size={14} /> {t('identifiers')}
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {patient.identifier.map((idObj, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.4rem 0.75rem',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    <span style={{ color: '#64748b' }}>{idObj.type?.text || idObj.system?.split('/').pop() || 'ID'}: </span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{idObj.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw FHIR R4 JSON */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <FileJson size={14} /> {t('rawFhirResource')}
              </h4>
              <button
                onClick={handleCopyJson}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              >
                {copied ? (
                  <>
                    <Check size={12} color="#16a34a" />
                    <span>{t('btnCopied')}</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>{t('btnCopyJson')}</span>
                  </>
                )}
              </button>
            </div>
            <pre
              style={{
                backgroundColor: '#0f172a',
                color: '#38bdf8',
                padding: '1rem',
                borderRadius: '0.5rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                maxHeight: '260px',
                overflowY: 'auto',
                border: '1px solid #1e293b'
              }}
            >
              {JSON.stringify(patient, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-primary">
            {t('btnClose')}
          </button>
        </div>
      </div>
    </div>
  );
}
