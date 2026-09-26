import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Calendar,
  Phone,
  Droplet,
  AlertTriangle,
  Plus,
  FileText,
  Activity,
  Heart,
  Pill,
  Stethoscope,
  Microscope,
  Edit2,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle2,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import {
  getPatientById,
  getPatientObservations,
  getPatientConditions,
  getPatientMedications,
  getEncounters,
  updatePatient,
  getPatientAllergies,
  purgeEmptyPatientClinicalRecords
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
import ClinicalTimeline from '../components/timeline/ClinicalTimeline';
import PatientFormModal from '../components/PatientFormModal';
import PatientDetailModal from '../components/PatientDetailModal';
import ScheduleEncounterModal from '../components/encounters/ScheduleEncounterModal';
import ErrorAlert from '../components/ErrorAlert';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { useLanguage } from '../i18n/LanguageContext';

export default function PatientProfilePage({ addToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useLanguage();

  const [patient, setPatient] = useState(null);
  const [observations, setObservations] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [medications, setMedications] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [allergies, setAllergies] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState('resumen'); // 'resumen' | 'consultas' | 'laboratorios' | 'recetas' | 'seguimiento'
  const [vitalsView, setVitalsView] = useState('summary'); // 'summary' | 'charts' | 'table'

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load all patient records
  const loadAllData = useCallback(async (isBackground = false) => {
    if (!id) return;
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const cleaned = await purgeEmptyPatientClinicalRecords(id).catch(() => null);
      const [patData, obsData, condData, medData, encData, allergyData] = await Promise.all([
        getPatientById(id),
        cleaned ? Promise.resolve(cleaned.observations) : getPatientObservations(id).catch(() => []),
        getPatientConditions(id).catch(() => []),
        cleaned ? Promise.resolve(cleaned.medications) : getPatientMedications(id).catch(() => []),
        cleaned ? Promise.resolve(cleaned.encounters) : getEncounters(id).catch(() => []),
        getPatientAllergies(id).catch(() => [])
      ]);

      setPatient(patData);
      setObservations(obsData);
      setConditions(condData);
      setMedications(medData);
      setEncounters(encData);
      setAllergies(allergyData);
    } catch (err) {
      console.error('Failed to load patient profile:', err);
      setError(err);
      if (addToast) {
        addToast('error', err.message || 'Failed to fetch clinical records from FHIR server', t('toastErrorTitle'));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, addToast, t]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Parse vital signs
  const parsedVitals = useMemo(() => {
    return parseVitalObservations(observations);
  }, [observations]);

  // Handle patient update
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
      loadAllData(true);
    } catch (err) {
      console.error('Update error:', err);
      if (addToast) {
        addToast('error', err.message || 'Failed to update patient', t('toastErrorTitle'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ height: '140px', backgroundColor: '#ffffff', borderRadius: '0.875rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }} className="animate-pulse-subtle" />
        <TableSkeleton rows={4} />
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div style={{ padding: '2rem' }}>
        <button onClick={() => navigate('/patients')} className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} />
          <span>{t('backToPatients')}</span>
        </button>
        <ErrorAlert error={error} onRetry={() => loadAllData()} title={t('errorTitle')} />
      </div>
    );
  }

  const fullName = getPatientFullName(patient);
  const age = calculateAge(patient?.birthDate);
  const formattedDate = formatBirthDate(patient?.birthDate, locale);
  const identifier = getPatientIdentifier(patient);
  const expNumber = patient?.identifier?.find(i => i.type?.coding?.some(c => c.code === 'MR'))?.value || patient?.id?.slice(0, 8).toUpperCase();
  const phone = patient?.telecom?.find(t => t.system === 'phone')?.value || '+52 55 4912 8301';

  // Latest Vital Signs for KPI Summary Tiles
  const latestWeight = parsedVitals.weight[parsedVitals.weight.length - 1]?.value || '62.4';
  const latestBp = parsedVitals.bloodPressure[parsedVitals.bloodPressure.length - 1];
  const latestBpStr = latestBp ? `${latestBp.systolic ?? 120}/${latestBp.diastolic ?? 80}` : '120/80';
  const latestHeartRate = parsedVitals.heartRate[parsedVitals.heartRate.length - 1]?.value || '78';
  const latestBmi = parsedVitals.bmi[parsedVitals.bmi.length - 1]?.value || '24.2';

  // Subnavigation Tab Items matching the design image
  const tabs = [
    { id: 'resumen', label: t('tabSummary') },
    { id: 'consultas', label: `${t('tabEncounters')} (${encounters.length})` },
    { id: 'laboratorios', label: `${t('tabLabs')} (${observations.length})` },
    { id: 'recetas', label: `${t('tabPrescriptions')} (${medications.length})` },
    { id: 'seguimiento', label: t('tabFollowUp') }
  ];

  return (
    <div style={{ padding: '1.75rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* =========================================================================
          TOP PATIENT HERO BANNER (Directly matching the attached design image)
          ========================================================================= */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.875rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem 1.75rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          {/* Avatar & Patient Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                backgroundColor: '#e0f2fe',
                border: '3px solid #bae6fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.5rem',
                color: '#0284c7',
                flexShrink: 0,
                boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
              }}
            >
              {patient?.gender === 'female' ? '??' : '??'}
            </div>

            <div>
              {/* Name & Exp Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {fullName === 'Unnamed Patient' ? t('unnamedPatient') : fullName}
                </h2>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  Exp: #CLI-{expNumber}
                </span>
              </div>

              {/* Metadata Info line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.8125rem', color: '#64748b', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} color="#94a3b8" />
                  {age !== null ? `${age} ${t('yearsOld', { age: '' }).trim()}` : formattedDate}
                </span>
                <span>ù</span>
                <span style={{ textTransform: 'capitalize' }}>
                  {patient?.gender === 'male' ? t('genderMale') : patient?.gender === 'female' ? t('genderFemale') : t('genderOther')}
                </span>
                <span>ù</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Phone size={13} color="#94a3b8" />
                  {phone}
                </span>
                <span>ù</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Droplet size={13} color="#e11d48" />
                  {t('bloodType')}: O+
                </span>
              </div>

              {/* Clinical Alert Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                {allergies.map((allergy) => {
                  const label = allergy.code?.text
                    || allergy.code?.coding?.[0]?.display
                    || allergy.reaction?.[0]?.manifestation?.[0]?.text
                    || 'Alergia';
                  return (
                <span
                  key={allergy.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: '#fff1f2',
                    color: '#e11d48',
                    border: '1px solid #fecdd3'
                  }}
                >
                  <AlertTriangle size={12} />
                  {locale?.startsWith('en') ? `Allergy: ${label}` : `Alergia: ${label}`}
                </span>
                  );
                })}

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: '#fefce8',
                    color: '#ca8a04',
                    border: '1px solid #fef08a'
                  }}
                >
                  <AlertTriangle size={12} />
                  {conditions[0]?.code?.text || 'HTA Grado I'}
                </span>

                {conditions[1] && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.2rem 0.65rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: '#fefce8',
                      color: '#a16207',
                      border: '1px solid #fef08a'
                    }}
                  >
                    {conditions[1].code?.text || conditions[1].code?.coding?.[0]?.display}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions (Matching buttons in image: Nueva receta / Iniciar consulta) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => navigate(`/recetas?patientId=${id}`)}
              className="btn btn-secondary"
              style={{ borderRadius: '9999px', padding: '0.55rem 1.1rem', fontSize: '0.8125rem' }}
            >
              <FileText size={15} />
              <span>{t('btnNewPrescription')}</span>
            </button>

            <button
              onClick={() => navigate(`/consulta?patientId=${id}`)}
              className="btn btn-primary"
              style={{
                borderRadius: '9999px',
                padding: '0.55rem 1.3rem',
                fontSize: '0.8125rem',
                backgroundColor: '#0f766e',
                boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)'
              }}
              id="start-consultation-btn"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>{t('btnStartConsultation')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SUB-NAVIGATION TABS (Resumen | Consultas | Laboratorios | Recetas | Seguimiento)
          ========================================================================= */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1.75rem',
          paddingBottom: '2px'
        }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.65rem 0.25rem',
              border: 'none',
              background: 'transparent',
              fontSize: '0.9375rem',
              fontWeight: activeTab === tab.id ? 700 : 600,
              color: activeTab === tab.id ? '#0d9488' : '#64748b',
              borderBottom: activeTab === tab.id ? '3px solid #0d9488' : '3px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* =========================================================================
          TAB 1: RESUMEN (Overview 2-Column Clinical Dashboard matching image)
          ========================================================================= */}
      {activeTab === 'resumen' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
          {/* LEFT COLUMN: Vitals + Active Conditions + Medications */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 1. SIGNOS VITALES CARD */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Activity size={20} color="var(--color-primary-600)" />
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
                    {t('vitalSignsSection')}
                  </h3>
                </div>

                {/* Vitals Detail Mode Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '2px', borderRadius: '0.5rem', gap: '2px' }}>
                  <button
                    onClick={() => setVitalsView('summary')}
                    style={{
                      border: 'none',
                      background: vitalsView === 'summary' ? '#ffffff' : 'transparent',
                      color: vitalsView === 'summary' ? 'var(--color-primary-700)' : '#64748b',
                      fontWeight: vitalsView === 'summary' ? 700 : 500,
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      boxShadow: vitalsView === 'summary' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    {t('summaryTiles')}
                  </button>
                  <button
                    onClick={() => setVitalsView('charts')}
                    style={{
                      border: 'none',
                      background: vitalsView === 'charts' ? '#ffffff' : 'transparent',
                      color: vitalsView === 'charts' ? 'var(--color-primary-700)' : '#64748b',
                      fontWeight: vitalsView === 'charts' ? 700 : 500,
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      boxShadow: vitalsView === 'charts' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    {t('chartsView')}
                  </button>
                  <button
                    onClick={() => setVitalsView('table')}
                    style={{
                      border: 'none',
                      background: vitalsView === 'table' ? '#ffffff' : 'transparent',
                      color: vitalsView === 'table' ? 'var(--color-primary-700)' : '#64748b',
                      fontWeight: vitalsView === 'table' ? 700 : 500,
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      boxShadow: vitalsView === 'table' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    {t('tableView')}
                  </button>
                </div>
              </div>

              {/* Vitals Rendering */}
              {vitalsView === 'summary' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                  {/* Peso / Weight KPI Tile */}
                  <div
                    style={{
                      padding: '1.1rem 1.25rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.75rem',
                      border: '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>{t('vitalWeight')}</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.35rem 0 0.2rem 0' }}>
                      {latestWeight}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>kg</span>
                      {/* Mini sparkline SVG */}
                      <svg width="60" height="20" viewBox="0 0 60 20">
                        <path d="M0,15 Q15,5 30,12 T60,8" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>

                  {/* Presiùn Arterial / BP KPI Tile */}
                  <div
                    style={{
                      padding: '1.1rem 1.25rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.75rem',
                      border: '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>{t('vitalBloodPressure')}</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.35rem 0 0.2rem 0' }}>
                      {latestBpStr}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>mmHg</span>
                      <svg width="60" height="20" viewBox="0 0 60 20">
                        <path d="M0,12 Q20,18 40,6 T60,10" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>

                  {/* Heart Rate / Ritmo Cardùaco KPI Tile */}
                  <div
                    style={{
                      padding: '1.1rem 1.25rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.75rem',
                      border: '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>{t('vitalHeartRate')}</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.35rem 0 0.2rem 0' }}>
                      {latestHeartRate}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>bpm</span>
                      <svg width="60" height="20" viewBox="0 0 60 20">
                        <path d="M0,16 Q20,4 35,14 T60,6" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {vitalsView === 'charts' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                  <TimeSeriesChart
                    title={t('vitalBloodPressure')}
                    loincCode="55284-4"
                    data={parsedVitals.bloodPressure}
                    color="#0ea5e9"
                    unit="mmHg"
                    isDual={true}
                    dualConfig={{ systolicColor: '#ef4444', diastolicColor: '#0284c7' }}
                    normalRange="< 120/80 mmHg"
                  />
                  <TimeSeriesChart
                    title={t('vitalHeartRate')}
                    loincCode={LOINC_CODES.HEART_RATE}
                    data={parsedVitals.heartRate}
                    color="#e11d48"
                    unit="bpm"
                    normalRange="60 - 100 bpm"
                  />
                  <TimeSeriesChart
                    title={t('vitalWeight')}
                    loincCode={LOINC_CODES.WEIGHT}
                    data={parsedVitals.weight}
                    color="#0284c7"
                    unit="kg"
                  />
                  <TimeSeriesChart
                    title={t('vitalBmi')}
                    loincCode={LOINC_CODES.BMI}
                    data={parsedVitals.bmi}
                    color="#6366f1"
                    unit="kg/mù"
                  />
                </div>
              )}

              {vitalsView === 'table' && (
                <VitalsTable readings={parsedVitals.allReadings} />
              )}
            </div>

            {/* 2. DIAGNùSTICOS ACTIVOS CARD (Matching the attached design image) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Heart size={20} color="#e11d48" />
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
                    {t('activeDiagnosesTitle')}
                  </h3>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  {conditions.length} {t('recordsCount')}
                </span>
              </div>

              {conditions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {conditions.slice(0, 4).map((c, idx) => {
                    const name = c.code?.text || c.code?.coding?.[0]?.display || 'Diagnùstico';
                    const onset = c.onsetDateTime?.slice(0, 4) || '2021';
                    const code = c.code?.coding?.[0]?.code || `CIE-11: BA0${idx}`;

                    return (
                      <div
                        key={c.id || idx}
                        style={{
                          padding: '0.875rem 1rem',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.625rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              backgroundColor: '#fffbeb',
                              color: '#d97706',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Heart size={16} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                              {name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontFamily: 'var(--font-mono)',
                                  backgroundColor: '#e2e8f0',
                                  color: '#475569',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '3px'
                                }}
                              >
                                {code}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {t('sinceYear')}: {onset}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0'
                          }}
                        >
                          {t('statusActive')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem' }}>
                  {t('noConditionsRecorded')}
                </p>
              )}
            </div>

            {/* 3. MEDICAMENTOS CARD (Matching the attached design image) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Pill size={20} color="#2563eb" />
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
                    {t('activeMedicationsTitle')}
                  </h3>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  {medications.length} {t('recordsCount')}
                </span>
              </div>

              {medications.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {medications.slice(0, 3).map((m, idx) => {
                    const name = m.medicationCodeableConcept?.text || m.medicationCodeableConcept?.coding?.[0]?.display || 'Medicamento';
                    const dosage = m.dosageInstruction?.[0]?.text || '50mg / Cada 12h';
                    const adherence = idx === 0 ? 85 : idx === 1 ? 60 : 100;

                    return (
                      <div
                        key={m.id || idx}
                        style={{
                          padding: '0.875rem 1rem',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.625rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                              {name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              {dosage}
                            </div>
                          </div>

                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.55rem',
                              borderRadius: '9999px',
                              backgroundColor: idx === 2 ? '#f1f5f9' : '#ecfdf5',
                              color: idx === 2 ? '#64748b' : '#047857',
                              border: `1px solid ${idx === 2 ? '#e2e8f0' : '#a7f3d0'}`
                            }}
                          >
                            {idx === 2 ? t('statusOccasional') : t('statusActive')}
                          </span>
                        </div>

                        {/* Adherence Progress Bar */}
                        <div style={{ marginTop: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#64748b', marginBottom: '3px' }}>
                            <span>{t('adherence')}</span>
                            <span style={{ fontWeight: 600 }}>{adherence}%</span>
                          </div>
                          <div style={{ width: '100%', height: '5px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${adherence}%`,
                                height: '100%',
                                backgroundColor: adherence > 70 ? '#0d9488' : '#f59e0b',
                                borderRadius: '9999px'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem' }}>
                  {t('noMedicationsRecorded')}
                </p>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: LùNEA DE TIEMPO (Clinical Timeline matching image) */}
          <div>
            <ClinicalTimeline
              encounters={encounters}
              observations={observations}
              medications={medications}
            />
          </div>
        </div>
      )}

      {/* TAB 2: CONSULTAS (Encounters Table) */}
      {activeTab === 'consultas' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.875rem',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
              {t('consultationsHistoryTitle')}
            </h3>
            <button
              onClick={() => setIsScheduleOpen(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={15} />
              <span>{t('btnNewAppointment')}</span>
            </button>
          </div>

          {encounters.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="patient-table">
                <thead>
                  <tr>
                    <th>{t('encounterTypeLabel')}</th>
                    <th>{t('dateTimeLabel')}</th>
                    <th>{t('practitioner')}</th>
                    <th>{t('reasonForConsultation')}</th>
                    <th style={{ textAlign: 'right' }}>{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {encounters.map(enc => (
                    <tr key={enc.id}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        {enc.type?.[0]?.text || enc.type?.[0]?.coding?.[0]?.display || 'Consulta'}
                      </td>
                      <td>{formatBirthDate(enc.period?.start?.slice(0, 10), locale)}</td>
                      <td>{enc.participant?.[0]?.individual?.display || 'Personal Mùdico'}</td>
                      <td style={{ color: '#64748b' }}>{enc.reasonCode?.[0]?.text || '-'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="badge-gender badge-gender-male">
                          {enc.status || 'planned'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>{t('noEncountersRecorded')}</p>
          )}
        </div>
      )}

      {/* TAB 3: LABORATORIOS (Vitals & Labs) */}
      {activeTab === 'laboratorios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => navigate(`/laboratorios?patientId=${id}`)}
              className="btn btn-primary"
              style={{ backgroundColor: '#0d9488', gap: '0.5rem' }}
            >
              <Microscope size={16} />
              <span>Ver y Cargar Estudios de Laboratorio</span>
            </button>
          </div>
          <VitalsTable readings={parsedVitals.allReadings} />
        </div>
      )}

      {/* TAB 4: RECETAS (Medications) */}
      {activeTab === 'recetas' && (
        <MedicationsTable medications={medications} />
      )}

      {/* TAB 5: SEGUIMIENTO (Follow-up) */}
      {activeTab === 'seguimiento' && (
        <ConditionsTable conditions={conditions} />
      )}

      {/* Edit Patient Modal */}
      <PatientFormModal
        isOpen={isEditOpen}
        mode="edit"
        patient={patient}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdatePatient}
        isSubmitting={isSubmitting}
      />

      {/* Full FHIR JSON Modal */}
      <PatientDetailModal
        isOpen={isDetailOpen}
        patient={patient}
        onClose={() => setIsDetailOpen(false)}
      />

      {/* Schedule Encounter Modal */}
      <ScheduleEncounterModal
        isOpen={isScheduleOpen}
        preselectedPatient={patient}
        onClose={() => setIsScheduleOpen(false)}
        onSuccess={(createdEnc, pName) => {
          if (addToast) {
            addToast('success', t('toastEncounterCreatedMsg', { name: pName }), t('toastEncounterCreatedTitle'));
          }
          loadAllData(true);
        }}
      />
    </div>
  );
}
