import React, { useState, useEffect } from 'react';
import { X, Calendar, User, UserCheck, Stethoscope, Clock, Save, AlertCircle, Loader2 } from 'lucide-react';
import { getPatients, getPractitioners, createEncounter } from '../../services/fhirApi';
import { getPatientFullName } from '../../utils/fhirHelper';
import { useLanguage } from '../../i18n/LanguageContext';

export default function ScheduleEncounterModal({
  isOpen,
  preselectedPatient = null,
  initialDate = null,
  onClose,
  onSuccess,
  onEncounterScheduled
}) {
  const { t } = useLanguage();

  const [patients, setPatients] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [isLoadingDependencies, setIsLoadingDependencies] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPractitionerId, setSelectedPractitionerId] = useState('');
  const [encounterType, setEncounterType] = useState('General Examination');
  const [status, setStatus] = useState('planned');
  const [datetime, setDatetime] = useState('');
  const [reason, setReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Initialize date time
  useEffect(() => {
    if (isOpen) {
      let targetDate = new Date();
      if (initialDate) {
        if (typeof initialDate === 'string' && initialDate.length === 10) {
          // YYYY-MM-DD
          const [y, m, d] = initialDate.split('-').map(Number);
          targetDate = new Date(y, m - 1, d, 10, 0, 0);
        } else {
          targetDate = new Date(initialDate);
        }
      }
      targetDate.setMinutes(targetDate.getMinutes() - targetDate.getTimezoneOffset());
      setDatetime(targetDate.toISOString().slice(0, 16));
      setSubmitError(null);

      if (preselectedPatient?.id) {
        setSelectedPatientId(preselectedPatient.id);
      }

      // Load patients and practitioners
      setIsLoadingDependencies(true);
      Promise.all([
        getPatients(''),
        getPractitioners()
      ])
        .then(([patientsRes, practs]) => {
          setPatients(patientsRes.patients || []);
          setPractitioners(practs || []);
          if (!preselectedPatient && patientsRes.patients?.length > 0) {
            setSelectedPatientId(patientsRes.patients[0].id);
          }
          if (practs?.length > 0) {
            setSelectedPractitionerId(practs[0].id);
          }
        })
        .catch(err => {
          console.warn('Error loading dependencies:', err);
        })
        .finally(() => {
          setIsLoadingDependencies(false);
        });
    }
  }, [isOpen, preselectedPatient]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setSubmitError(t('errSelectPatient'));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const selectedPatient = patients.find(p => p.id === selectedPatientId) || preselectedPatient;
      const selectedPractitioner = practitioners.find(p => p.id === selectedPractitionerId);

      const patientName = selectedPatient ? getPatientFullName(selectedPatient) : `Patient ${selectedPatientId}`;
      const practitionerName = selectedPractitioner
        ? `${selectedPractitioner.name?.[0]?.prefix?.[0] || 'Dr.'} ${selectedPractitioner.name?.[0]?.given?.join(' ')} ${selectedPractitioner.name?.[0]?.family}`.trim()
        : 'Medical Staff';

      const created = await createEncounter({
        patientId: selectedPatientId,
        patientName,
        practitionerId: selectedPractitionerId || undefined,
        practitionerName,
        type: encounterType,
        status,
        startTime: datetime,
        reason: reason.trim()
      });

      if (onSuccess) {
        onSuccess(created, patientName);
      }
      if (onEncounterScheduled) {
        onEncounterScheduled(created, patientName);
      }
      onClose();
    } catch (err) {
      console.error('Failed to schedule encounter:', err);
      setSubmitError(err.message || 'Failed to create encounter on FHIR server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-modal-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '560px' }}
      >
        {/* Header */}
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
              <Calendar size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
                {t('scheduleEncounterTitle')}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {t('scheduleEncounterSubtitle')} (FHIR R4 Encounter)
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

        {/* Body */}
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

          <form id="schedule-encounter-form" onSubmit={handleSubmit}>
            {/* Patient Selection */}
            <div className="form-group">
              <label htmlFor="patientSelect" className="form-label">
                {t('selectPatientLabel')} <span className="required-star">*</span>
              </label>
              {preselectedPatient ? (
                <div
                  style={{
                    padding: '0.65rem 0.875rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <User size={16} color="var(--color-primary-600)" />
                  <span>{getPatientFullName(preselectedPatient)}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 'auto' }}>ID: {preselectedPatient.id}</span>
                </div>
              ) : (
                <select
                  id="patientSelect"
                  className="form-select"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  disabled={isLoadingDependencies || isSubmitting}
                  required
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {getPatientFullName(p)} ({p.gender || 'Unknown'}, {p.birthDate || 'No DOB'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Practitioner Selection */}
            <div className="form-group">
              <label htmlFor="practitionerSelect" className="form-label">
                {t('selectPractitionerLabel')}
              </label>
              <select
                id="practitionerSelect"
                className="form-select"
                value={selectedPractitionerId}
                onChange={(e) => setSelectedPractitionerId(e.target.value)}
                disabled={isLoadingDependencies || isSubmitting}
              >
                <option value="">{t('unassignedPractitioner')}</option>
                {practitioners.map(pr => {
                  const name = `${pr.name?.[0]?.prefix?.[0] || 'Dr.'} ${pr.name?.[0]?.given?.join(' ') || ''} ${pr.name?.[0]?.family || ''}`.trim();
                  return (
                    <option key={pr.id} value={pr.id}>
                      {name || `Practitioner ${pr.id}`}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Encounter Type & Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="encType" className="form-label">
                  {t('encounterTypeLabel')} <span className="required-star">*</span>
                </label>
                <select
                  id="encType"
                  className="form-select"
                  value={encounterType}
                  onChange={(e) => setEncounterType(e.target.value)}
                  required
                >
                  <option value="Consulta General">{t('encTypeGeneral')}</option>
                  <option value="Consulta de Seguimiento">{t('encTypeFollowUp')}</option>
                  <option value="Revisión de Medicamentos">{t('encTypeMedReview')}</option>
                  <option value="Control de Enfermedad Crónica">{t('encTypeChronic')}</option>
                  <option value="Evaluación Rápida">{t('encTypeUrgent')}</option>
                  <option value="Chequeo Preventivo">{t('encTypePreventive')}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="encStatus" className="form-label">
                  {t('encounterStatusLabel')} <span className="required-star">*</span>
                </label>
                <select
                  id="encStatus"
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                >
                  <option value="planned">{t('statusPlanned')}</option>
                  <option value="arrived">{t('statusArrived')}</option>
                  <option value="in-progress">{t('statusInProgress')}</option>
                  <option value="finished">{t('statusFinished')}</option>
                </select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="form-group">
              <label htmlFor="encDatetime" className="form-label">
                {t('dateTimeLabel')} <span className="required-star">*</span>
              </label>
              <input
                id="encDatetime"
                type="datetime-local"
                className="form-input"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
                required
              />
            </div>

            {/* Reason / Notes */}
            <div className="form-group">
              <label htmlFor="encReason" className="form-label">
                {t('reasonForConsultation')}
              </label>
              <textarea
                id="encReason"
                className="form-input"
                rows={3}
                placeholder={t('reasonPlaceholder')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
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
            form="schedule-encounter-form"
            className="btn btn-primary"
            disabled={isSubmitting}
            id="submit-schedule-encounter-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t('btnScheduling')}</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{t('btnScheduleEncounter')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
