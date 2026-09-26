import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Calendar,
  Activity,
  Heart,
  Pill,
  FileText,
  Edit2,
  Eye,
  RefreshCw,
  LayoutGrid,
  List,
  AlertTriangle
} from 'lucide-react';
import {
  getPatientById,
  getPatientObservations,
  getPatientConditions,
  getPatientMedications,
  updatePatient
} from '../services/fhirApi';
import {
  getPatientFullName,
  formatBirthDate,
  calculateAge,
  getPatientIdentifier
} from '../utils/fhirHelper';
import { parseVitalObservations, LOINC_CODES } from '../utils/vitalsParser';
import TimeSeriesChart from '../components/vitals/TimeSeriesChart';
import VitalsTable from '../components/vitals/VitalsTable';
import ConditionsTable from '../components/conditions/ConditionsTable';
import MedicationsTable from '../components/medications/MedicationsTable';
import PatientFormModal from '../components/PatientFormModal';
import PatientDetailModal from '../components/PatientDetailModal';
import ErrorAlert from '../components/ErrorAlert';
import { TableSkeleton, CardSkeleton } from '../components/LoadingSkeleton';
import { useLanguage } from '../i18n/LanguageContext';

export default function PatientDetailsPage({ addToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useLanguage();

  const [patient, setPatient] = useState(null);
  const [observations, setObservations] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [medications, setMedications] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [vitalsView, setVitalsView] = useState('chart'); // 'chart' | 'table'

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load all patient clinical data
  const loadPatientData = useCallback(async (isBackground = false) => {
    if (!id) return;
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [patData, obsData, condData, medData] = await Promise.all([
        getPatientById(id),
        getPatientObservations(id).catch(err => {
          console.warn('Observations error:', err);
          return [];
        }),
        getPatientConditions(id).catch(err => {
          console.warn('Conditions error:', err);
          return [];
        }),
        getPatientMedications(id).catch(err => {
          console.warn('Medications error:', err);
          return [];
        })
      ]);

      setPatient(patData);
      setObservations(obsData);
      setConditions(condData);
      setMedications(medData);
    } catch (err) {
      console.error('Failed to load patient details:', err);
      setError(err);
      if (addToast) {
        addToast('error', err.message || 'Failed to load patient records from FHIR server', t('toastErrorTitle'));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, addToast, t]);

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

  // Parse vitals
  const parsedVitals = useMemo(() => {
    return parseVitalObservations(observations);
  }, [observations]);

  // Update patient handler
  const handleUpdatePatient = async (patientData) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const updated = await updatePatient(id, patientData, patient);
      setPatient(updated);
      setIsEditOpen(false);
      if (addToast) {
        addToast('success', t('toastUpdatedMsg', { name: `${patientData.givenName} ${patientData.familyName}` }), t('toastUpdatedTitle'));
      }
      loadPatientData(true);
    } catch (err) {
      console.error('Update error:', err);
      if (addToast) {
        addToast('error', err.message || 'Failed to update patient', t('toastErrorTitle'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '2rem 1.5rem 4rem 1.5rem' }}>
        <div style={{ height: '38px', width: '120px', backgroundColor: '#e2e8f0', borderRadius: '6px', marginBottom: '1.5rem' }} className="animate-pulse-subtle" />
        <TableSkeleton rows={4} />
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="container" style={{ padding: '2rem 1.5rem 4rem 1.5rem' }}>
        <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} />
          <span>{t('backToPatients')}</span>
        </button>
        <ErrorAlert error={error} onRetry={() => loadPatientData()} title={t('errorTitle')} />
      </div>
    );
  }

  const fullName = getPatientFullName(patient);
  const age = calculateAge(patient?.birthDate);
  const formattedDate = formatBirthDate(patient?.birthDate, locale);
  const initials = getAvatarInitials(fullName);
  const identifier = getPatientIdentifier(patient);

  return (
    <div style={{ minHeight: '100vh', padding: '1.5rem 0 4rem 0' }}>
      <div className="container">
        {/* Navigation Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem' }}>
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary btn-sm"
            id="back-to-registry-btn"
          >
            <ArrowLeft size={16} />
            <span>{t('backToPatients')}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => loadPatientData(true)}
              className="btn btn-secondary btn-icon"
              style={{ height: '34px', width: '34px' }}
              disabled={isRefreshing}
              title={t('refreshTooltip')}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsDetailOpen(true)}
              className="btn btn-secondary btn-sm"
            >
              <Eye size={14} />
              <span>{t('rawFhirResource')}</span>
            </button>
            <button
              onClick={() => setIsEditOpen(true)}
              className="btn btn-primary btn-sm"
            >
              <Edit2 size={14} />
              <span>{t('btnEdit')}</span>
            </button>
          </div>
        </div>

        {/* Top Demographics Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.875rem',
            border: '1px solid #e2e8f0',
            padding: '1.5rem 1.75rem',
            marginBottom: '2rem',
            boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}
        >
          {/* Avatar & Full Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: getAvatarBg(patient?.gender),
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.35rem',
                flexShrink: 0,
                boxShadow: '0 4px 10px rgba(0,0,0,0.12)'
              }}
            >
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  {fullName === 'Unnamed Patient' ? t('unnamedPatient') : fullName}
                </h2>
                <span className={getGenderBadgeClass(patient?.gender)}>
                  {getGenderLabel(patient?.gender)}
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                FHIR ID: <strong>{patient?.id}</strong> {identifier && `• ${identifier}`}
              </div>
            </div>
          </div>

          {/* Demographics Details Grid */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            {/* Gender */}
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                {t('thGender')}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', textTransform: 'capitalize', marginTop: '2px' }}>
                {getGenderLabel(patient?.gender)}
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                {t('birthDateLabel')}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                {patient?.birthDate || t('dateUnrecorded')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#0d9488', fontWeight: 600 }}>
                {formattedDate} {age !== null && `(${age} ${t('yearsOld', { age: '' }).trim()})`}
              </div>
            </div>

            {/* Total Vitals & Diagnoses Count */}
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                {t('clinicalRecords')}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 600, marginTop: '2px' }}>
                {observations.length} {t('vitalsNav')}, {conditions.length} {t('conditionsNav')}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: VITAL SIGNS */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#f0fdfa',
                  color: '#0d9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Activity size={18} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                {t('vitalSignsSection')}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 600 }}>
                {observations.length}
              </span>
            </div>

            {/* View Switcher: Chart vs Table */}
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '0.5rem', gap: '2px' }}>
              <button
                onClick={() => setVitalsView('chart')}
                style={{
                  border: 'none',
                  background: vitalsView === 'chart' ? '#ffffff' : 'transparent',
                  color: vitalsView === 'chart' ? 'var(--color-primary-700)' : '#64748b',
                  fontWeight: vitalsView === 'chart' ? 700 : 500,
                  fontSize: '0.8125rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: vitalsView === 'chart' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                id="vitals-chart-view-btn"
              >
                <LayoutGrid size={15} />
                <span>{t('chartView')}</span>
              </button>

              <button
                onClick={() => setVitalsView('table')}
                style={{
                  border: 'none',
                  background: vitalsView === 'table' ? '#ffffff' : 'transparent',
                  color: vitalsView === 'table' ? 'var(--color-primary-700)' : '#64748b',
                  fontWeight: vitalsView === 'table' ? 700 : 500,
                  fontSize: '0.8125rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: vitalsView === 'table' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                id="vitals-table-view-btn"
              >
                <List size={15} />
                <span>{t('tableView')}</span>
              </button>
            </div>
          </div>

          {/* Vitals Content */}
          {vitalsView === 'chart' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {/* 1. Blood Pressure (Dual Series: Systolic & Diastolic) */}
              <TimeSeriesChart
                title={t('vitalBloodPressure')}
                loincCode="55284-4"
                data={parsedVitals.bloodPressure}
                color="#0ea5e9"
                unit="mmHg"
                isDual={true}
                dualConfig={{ systolicColor: '#ef4444', diastolicColor: '#0284c7' }}
                normalRange="< 120 / 80 mmHg"
              />

              {/* 2. Heart Rate */}
              <TimeSeriesChart
                title={t('vitalHeartRate')}
                loincCode={LOINC_CODES.HEART_RATE}
                data={parsedVitals.heartRate}
                color="#e11d48"
                unit="bpm"
                normalRange="60 - 100 bpm"
              />

              {/* 3. Oxygen Saturation (SpO2) */}
              <TimeSeriesChart
                title={t('vitalOxygenSaturation')}
                loincCode={LOINC_CODES.OXYGEN_SATURATION}
                data={parsedVitals.oxygenSaturation}
                color="#0d9488"
                unit="%"
                normalRange="95 - 100%"
              />

              {/* 4. Body Temperature */}
              <TimeSeriesChart
                title={t('vitalTemperature')}
                loincCode={LOINC_CODES.TEMPERATURE}
                data={parsedVitals.temperature}
                color="#f59e0b"
                unit={parsedVitals.temperature[0]?.unit || '°C'}
                normalRange="36.5 - 37.5 °C"
              />

              {/* 5. Respiratory Rate */}
              <TimeSeriesChart
                title={t('vitalRespiratoryRate')}
                loincCode={LOINC_CODES.RESPIRATORY_RATE}
                data={parsedVitals.respiratoryRate}
                color="#8b5cf6"
                unit="breaths/min"
                normalRange="12 - 20 /min"
              />

              {/* 6. Body Mass Index (BMI) */}
              <TimeSeriesChart
                title={t('vitalBmi')}
                loincCode={LOINC_CODES.BMI}
                data={parsedVitals.bmi}
                color="#6366f1"
                unit="kg/m²"
                normalRange="18.5 - 24.9 kg/m²"
              />

              {/* 7. Weight */}
              <TimeSeriesChart
                title={t('vitalWeight')}
                loincCode={LOINC_CODES.WEIGHT}
                data={parsedVitals.weight}
                color="#0284c7"
                unit={parsedVitals.weight[0]?.unit || 'kg'}
              />

              {/* 8. Height */}
              <TimeSeriesChart
                title={t('vitalHeight')}
                loincCode={LOINC_CODES.HEIGHT}
                data={parsedVitals.height}
                color="#10b981"
                unit={parsedVitals.height[0]?.unit || 'cm'}
              />
            </div>
          ) : (
            <VitalsTable readings={parsedVitals.allReadings} />
          )}
        </section>

        {/* SECTION 2: CONDITIONS & DIAGNOSES */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Heart size={18} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              {t('conditionsSection')}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 600 }}>
              {conditions.length}
            </span>
          </div>

          <ConditionsTable conditions={conditions} />
        </section>

        {/* SECTION 3: MEDICATIONS & PRESCRIPTIONS */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Pill size={18} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              {t('medicationsSection')}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 600 }}>
              {medications.length}
            </span>
          </div>

          <MedicationsTable medications={medications} />
        </section>
      </div>

      {/* Edit Patient Modal */}
      <PatientFormModal
        isOpen={isEditOpen}
        mode="edit"
        patient={patient}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdatePatient}
        isSubmitting={isSubmitting}
      />

      {/* Full Details / Raw JSON Modal */}
      <PatientDetailModal
        isOpen={isDetailOpen}
        patient={patient}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
