import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, User, Code2, AlertCircle, Loader2 } from 'lucide-react';
import { getPatientGivenName, getPatientFamilyName, buildFhirPatientResource } from '../utils/fhirHelper';
import { useLanguage } from '../i18n/LanguageContext';

export default function PatientFormModal({ isOpen, mode = 'create', patient = null, onClose, onSubmit, isSubmitting }) {
  const { t } = useLanguage();
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [gender, setGender] = useState('male');
  const [birthDate, setBirthDate] = useState('');
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'json'

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitError, setSubmitError] = useState(null);

  // Today's date in YYYY-MM-DD for max date restriction
  const maxDate = useMemo(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }, []);

  // Initialize or reset form when modal opens or patient changes
  useEffect(() => {
    if (isOpen) {
      setSubmitError(null);
      setTouched({});
      setActiveTab('form');

      if (mode === 'edit' && patient) {
        setGivenName(getPatientGivenName(patient));
        setFamilyName(getPatientFamilyName(patient));
        setGender(patient.gender || 'unknown');
        setBirthDate(patient.birthDate || '');
      } else {
        setGivenName('');
        setFamilyName('');
        setGender('male');
        setBirthDate('');
      }
    }
  }, [isOpen, mode, patient]);

  // Validation function
  const validate = (values) => {
    const errs = {};

    if (!values.givenName || !values.givenName.trim()) {
      errs.givenName = t('errGivenNameRequired');
    } else if (values.givenName.trim().length < 2) {
      errs.givenName = t('errGivenNameMin');
    }

    if (!values.familyName || !values.familyName.trim()) {
      errs.familyName = t('errFamilyNameRequired');
    } else if (values.familyName.trim().length < 2) {
      errs.familyName = t('errFamilyNameMin');
    }

    if (!values.gender) {
      errs.gender = t('errGenderRequired');
    } else if (!['male', 'female', 'other', 'unknown'].includes(values.gender)) {
      errs.gender = t('errGenderInvalid');
    }

    if (!values.birthDate) {
      errs.birthDate = t('errDobRequired');
    } else {
      const parsedDate = new Date(values.birthDate);
      if (isNaN(parsedDate.getTime())) {
        errs.birthDate = t('errDobInvalid');
      } else if (values.birthDate > maxDate) {
        errs.birthDate = t('errDobFuture');
      } else if (parsedDate.getFullYear() < 1900) {
        errs.birthDate = t('errDobPast');
      }
    }

    return errs;
  };

  // Re-run validation on field changes
  useEffect(() => {
    const errs = validate({ givenName, familyName, gender, birthDate });
    setErrors(errs);
  }, [givenName, familyName, gender, birthDate, maxDate]);

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Computed live FHIR R4 resource preview
  const liveFhirResource = useMemo(() => {
    return buildFhirPatientResource({
      id: mode === 'edit' ? patient?.id : undefined,
      givenName,
      familyName,
      gender,
      birthDate,
      originalResource: mode === 'edit' ? patient : null
    });
  }, [givenName, familyName, gender, birthDate, mode, patient]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    setTouched({
      givenName: true,
      familyName: true,
      gender: true,
      birthDate: true
    });

    const validationErrors = validate({ givenName, familyName, gender, birthDate });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await onSubmit({
        givenName: givenName.trim(),
        familyName: familyName.trim(),
        gender,
        birthDate
      });
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError(err.message || 'Failed to save patient resource on FHIR server.');
    }
  };

  if (!isOpen) return null;

  const isEdit = mode === 'edit';
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-modal-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: isEdit ? 'var(--color-primary-50)' : '#f0fdf4',
                color: isEdit ? 'var(--color-primary-600)' : '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <User size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                {isEdit ? t('editPatientTitle') : t('createPatientTitle')}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '1px' }}>
                {isEdit ? t('editPatientSubtitle', { id: patient?.id }) : t('createPatientSubtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            style={{ border: 'none', color: '#64748b' }}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector: Form vs Live FHIR JSON */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 1.5rem', backgroundColor: '#f8fafc' }}>
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            style={{
              padding: '0.65rem 1rem',
              border: 'none',
              background: 'transparent',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: activeTab === 'form' ? 'var(--color-primary-700)' : '#64748b',
              borderBottom: activeTab === 'form' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <User size={15} />
            {t('tabPatientDetails')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('json')}
            style={{
              padding: '0.65rem 1rem',
              border: 'none',
              background: 'transparent',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: activeTab === 'json' ? 'var(--color-primary-700)' : '#64748b',
              borderBottom: activeTab === 'json' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Code2 size={15} />
            {t('tabFhirJson')}
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {submitError && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '0.5rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                color: '#be123c',
                fontSize: '0.875rem'
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{submitError}</div>
            </div>
          )}

          {activeTab === 'form' ? (
            <form id="patient-form" onSubmit={handleSubmit}>
              {/* Full Name Fields: Given & Family */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Given Name (First & Middle) */}
                <div className="form-group">
                  <label htmlFor="givenName" className="form-label">
                    {t('givenNameLabel')} <span className="required-star">*</span>
                  </label>
                  <input
                    id="givenName"
                    type="text"
                    className={`form-input ${touched.givenName && errors.givenName ? 'has-error' : ''}`}
                    placeholder={t('givenNamePlaceholder')}
                    value={givenName}
                    onChange={(e) => setGivenName(e.target.value)}
                    onBlur={() => handleBlur('givenName')}
                    disabled={isSubmitting}
                    autoFocus
                  />
                  {touched.givenName && errors.givenName && (
                    <div className="form-error">
                      <AlertCircle size={13} />
                      <span>{errors.givenName}</span>
                    </div>
                  )}
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                    {t('givenNameHelper')}
                  </span>
                </div>

                {/* Family Name (Last name) */}
                <div className="form-group">
                  <label htmlFor="familyName" className="form-label">
                    {t('familyNameLabel')} <span className="required-star">*</span>
                  </label>
                  <input
                    id="familyName"
                    type="text"
                    className={`form-input ${touched.familyName && errors.familyName ? 'has-error' : ''}`}
                    placeholder={t('familyNamePlaceholder')}
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    onBlur={() => handleBlur('familyName')}
                    disabled={isSubmitting}
                  />
                  {touched.familyName && errors.familyName && (
                    <div className="form-error">
                      <AlertCircle size={13} />
                      <span>{errors.familyName}</span>
                    </div>
                  )}
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                    {t('familyNameHelper')}
                  </span>
                </div>
              </div>

              {/* Gender & Birth Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Gender */}
                <div className="form-group">
                  <label htmlFor="gender" className="form-label">
                    {t('genderLabel')} <span className="required-star">*</span>
                  </label>
                  <select
                    id="gender"
                    className={`form-select ${touched.gender && errors.gender ? 'has-error' : ''}`}
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    onBlur={() => handleBlur('gender')}
                    disabled={isSubmitting}
                  >
                    <option value="male">{t('genderMale')}</option>
                    <option value="female">{t('genderFemale')}</option>
                    <option value="other">{t('genderOther')}</option>
                    <option value="unknown">{t('genderUnknown')}</option>
                  </select>
                  {touched.gender && errors.gender && (
                    <div className="form-error">
                      <AlertCircle size={13} />
                      <span>{errors.gender}</span>
                    </div>
                  )}
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                    {t('genderHelper')}
                  </span>
                </div>

                {/* Date of Birth */}
                <div className="form-group">
                  <label htmlFor="birthDate" className="form-label">
                    {t('birthDateLabel')} <span className="required-star">*</span>
                  </label>
                  <input
                    id="birthDate"
                    type="date"
                    max={maxDate}
                    className={`form-input ${touched.birthDate && errors.birthDate ? 'has-error' : ''}`}
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    onBlur={() => handleBlur('birthDate')}
                    disabled={isSubmitting}
                  />
                  {touched.birthDate && errors.birthDate && (
                    <div className="form-error">
                      <AlertCircle size={13} />
                      <span>{errors.birthDate}</span>
                    </div>
                  )}
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                    {t('birthDateHelper')}
                  </span>
                </div>
              </div>
            </form>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  {t('fhirPayloadHeader', { endpoint: isEdit ? `PUT /Patient/${patient?.id}` : 'POST /Patient' })}
                </span>
              </div>
              <pre
                style={{
                  backgroundColor: '#0f172a',
                  color: '#38bdf8',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  border: '1px solid #1e293b'
                }}
              >
                {JSON.stringify(liveFhirResource, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            {t('btnCancel')}
          </button>

          <button
            type="submit"
            form="patient-form"
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={isSubmitting || (touched.givenName && hasErrors)}
            id="save-patient-submit-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{isEdit ? t('btnUpdating') : t('btnSaving')}</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{isEdit ? t('btnUpdatePatient') : t('btnCreatePatient')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
