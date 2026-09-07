import React, { useState } from 'react';
import { X, UserCheck, Save, AlertCircle, Loader2 } from 'lucide-react';
import { createPractitioner } from '../../services/fhirApi';
import { useLanguage } from '../../i18n/LanguageContext';

export default function PractitionerModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const { t } = useLanguage();

  const [prefix, setPrefix] = useState('Dr.');
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [gender, setGender] = useState('male');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('Medicina General (General Medicine)');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!givenName.trim() || !familyName.trim()) {
      setSubmitError(t('errGivenNameRequired'));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const created = await createPractitioner({
        prefix,
        givenName: givenName.trim(),
        familyName: familyName.trim(),
        gender,
        email: email.trim(),
        phone: phone.trim(),
        qualification: qualification.trim()
      });

      if (onSuccess) {
        onSuccess(created);
      }
      onClose();
    } catch (err) {
      console.error('Failed to create practitioner:', err);
      setSubmitError(err.message || 'Failed to create practitioner on FHIR server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-modal-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <UserCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
                {t('createPractitionerTitle')}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {t('createPractitionerSubtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            style={{ border: 'none', color: '#64748b' }}
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>

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
              <AlertCircle size={18} />
              <div>{submitError}</div>
            </div>
          )}

          <form id="create-practitioner-form" onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">{t('prefix')}</label>
                <select
                  className="form-select"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                >
                  <option value="Dr.">Dr.</option>
                  <option value="Dra.">Dra.</option>
                  <option value="Lic.">Lic.</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('givenNameLabel')} <span className="required-star">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Alejandro"
                  value={givenName}
                  onChange={(e) => setGivenName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('familyNameLabel')} <span className="required-star">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. García Morales"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">{t('genderLabel')}</label>
                <select
                  className="form-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="male">{t('genderMale')}</option>
                  <option value="female">{t('genderFemale')}</option>
                  <option value="other">{t('genderOther')}</option>
                  <option value="unknown">{t('genderUnknown')}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('specialty')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Medicina Interna"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="doctor@integramed.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('phone')}</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+52 55 1234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {t('btnCancel')}
          </button>
          <button
            type="submit"
            form="create-practitioner-form"
            className="btn btn-primary"
            disabled={isSubmitting}
            id="submit-practitioner-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t('btnSaving')}</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{t('btnSavePractitioner')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
