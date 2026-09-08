import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  Calendar,
  User,
  Stethoscope,
  MapPin,
  Activity,
  FileText,
  Pill,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ArrowDownLeft,
  Heart,
  Droplet,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  Save,
  RotateCcw,
  AlertTriangle,
  Check
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { updatePatientEncounter, deletePatientEncounter } from '../../utils/encounterHistoryStorage.js';

export default function PreviousEncounterReviewModal({
  isOpen,
  encounter,
  encountersList = [],
  onClose,
  onSelectEncounter,
  onCopySubjective,
  onCopyPlan,
  onEncounterUpdated,
  onEncounterDeleted,
  addToast
}) {
  const { t, locale, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('soap'); // 'soap' | 'vitals' | 'meds'

  // Edit and Delete State
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [editReason, setEditReason] = useState('');
  const [editSubjective, setEditSubjective] = useState('');
  const [editPhysicalExam, setEditPhysicalExam] = useState('');
  const [editAssessment, setEditAssessment] = useState('');
  const [editPlan, setEditPlan] = useState('');

  useEffect(() => {
    if (encounter) {
      setEditReason(encounter.reason || '');
      setEditSubjective(encounter.subjective || '');
      setEditPhysicalExam(encounter.physicalExam || '');
      setEditAssessment(encounter.assessment || '');
      setEditPlan(encounter.plan || '');
      setIsEditing(false);
      setConfirmDelete(false);
    }
  }, [encounter]);

  if (!isOpen || !encounter) return null;

  const currentIndex = encountersList.findIndex(e => e.id === encounter.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < encountersList.length - 1;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      onSelectEncounter(encountersList[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onSelectEncounter(encountersList[currentIndex + 1]);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setIsSubmitting(true);
      const updated = await updatePatientEncounter(encounter.id, {
        reason: editReason,
        subjective: editSubjective,
        physicalExam: editPhysicalExam,
        assessment: editAssessment,
        plan: editPlan,
        summary: editAssessment || editSubjective.slice(0, 100)
      });
      setIsEditing(false);
      if (onEncounterUpdated) onEncounterUpdated(updated);
      if (addToast) addToast('success', 'Nota clínica actualizada correctamente', 'Notas Clínicas');
    } catch (err) {
      console.error('Failed to update clinical note:', err);
      if (addToast) addToast('error', 'No se pudo guardar la nota', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await deletePatientEncounter(encounter.id);
      if (onEncounterDeleted) onEncounterDeleted(encounter.id);
      if (addToast) addToast('info', 'Nota clínica eliminada', 'Notas Clínicas');
      onClose();
    } catch (err) {
      console.error('Failed to delete clinical note:', err);
      if (addToast) addToast('error', 'No se pudo eliminar la nota', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* =========================================================================
            MODAL HEADER
            ========================================================================= */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '0.625rem',
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <History size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {t('reviewEncounterModalTitle')}
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    backgroundColor: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    textTransform: 'uppercase'
                  }}
                >
                  {encounter.status === 'finished' ? 'Finalizada' : encounter.status || 'Completada'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                {encounter.patientName || 'Mariana Silva Ruiz'} • {formatDate(encounter.date)}
              </p>
            </div>
          </div>

          {/* Encounter Carousel Navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {encountersList.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  padding: '0.2rem 0.4rem'
                }}
              >
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: hasPrev ? 'pointer' : 'not-allowed',
                    color: hasPrev ? '#0f766e' : '#cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.2rem'
                  }}
                  title={t('prevEncounter')}
                >
                  <ChevronLeft size={18} />
                </button>

                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', padding: '0 0.35rem', whiteSpace: 'nowrap' }}>
                  {currentIndex + 1} / {encountersList.length}
                </span>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!hasNext}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: hasNext ? 'pointer' : 'not-allowed',
                    color: hasNext ? '#0f766e' : '#cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.2rem'
                  }}
                  title={t('nextEncounter')}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={t('closeReviewBtn')}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* =========================================================================
            ENCOUNTER SELECTOR CHIPS (If multiple encounters exist)
            ========================================================================= */}
        {encountersList.length > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.5rem',
              backgroundColor: '#f1f5f9',
              borderBottom: '1px solid #e2e8f0',
              overflowX: 'auto'
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              Visitas previas:
            </span>
            {encountersList.map((enc, idx) => {
              const isSelected = enc.id === encounter.id;
              const shortDate = enc.date ? new Date(enc.date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : `Visita #${idx + 1}`;
              return (
                <button
                  key={enc.id || idx}
                  type="button"
                  onClick={() => onSelectEncounter(enc)}
                  style={{
                    border: isSelected ? '1px solid #0f766e' : '1px solid #cbd5e1',
                    backgroundColor: isSelected ? '#0f766e' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#334155',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Calendar size={12} />
                  <span>{shortDate}</span>
                  <span style={{ opacity: 0.85, fontSize: '0.7rem' }}>• {enc.type || 'Consulta'}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* =========================================================================
            MODAL BODY (Scrollable)
            ========================================================================= */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Metadata Cards Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem'
            }}
          >
            {/* 1. Motivo / Tipo */}
            <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '0.625rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Stethoscope size={13} color="#0f766e" />
                <span>{t('fieldType')}</span>
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
                {encounter.type || 'Consulta de Medicina General'}
              </div>
            </div>

            {/* 2. Médico Tratante */}
            <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '0.625rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <User size={13} color="#0f766e" />
                <span>{t('attendingDoctorLabel')}</span>
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
                {encounter.practitionerName || 'Dr. Jesús Robledo'}
              </div>
              {encounter.practitionerSpecialty && (
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                  {encounter.practitionerSpecialty}
                </div>
              )}
            </div>

            {/* 3. Sede / Consultorio */}
            <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '0.625rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={13} color="#0f766e" />
                <span>{t('clinicLocationLabel')}</span>
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
                {encounter.locationName || 'Plantel Central - Consultorio 102'}
              </div>
            </div>
          </div>

          {/* Resumen / Breve Descripción Banner */}
          {encounter.reason && (
            <div
              style={{
                backgroundColor: '#f0fdfa',
                borderRadius: '0.75rem',
                border: '1px solid #99f6e4',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem'
              }}
            >
              <FileText size={18} color="#0d9488" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('encounterReasonLabel')}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#134e4a', fontWeight: 600, marginTop: '2px' }}>
                  {encounter.reason}
                </div>
                {encounter.summary && encounter.summary !== encounter.reason && (
                  <div style={{ fontSize: '0.8125rem', color: '#0f766e', marginTop: '4px' }}>
                    {encounter.summary}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              O - SIGNOS VITALES REGISTRADOS EN LA VISITA
              ========================================================================= */}
          {encounter.vitals && (
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Activity size={15} color="#0f766e" />
                <span>{t('pastVitalsLabel')}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                {/* Presión */}
                <div style={{ padding: '0.65rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>PRESIÓN ART.</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '0.1rem' }}>
                    {encounter.vitals.bloodPressure || '120/80'} <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>mmHg</span>
                  </div>
                </div>

                {/* FC */}
                <div style={{ padding: '0.65rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>FREC. CARDÍACA</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '0.1rem' }}>
                    {encounter.vitals.heartRate || '72'} <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>bpm</span>
                  </div>
                </div>

                {/* SpO2 */}
                <div style={{ padding: '0.65rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>SPO2</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '0.1rem' }}>
                    {encounter.vitals.oxygenSaturation || '98'}%
                  </div>
                </div>

                {/* Temperatura */}
                <div style={{ padding: '0.65rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>TEMPERATURA</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '0.1rem' }}>
                    {encounter.vitals.temperature || '36.5'}°C
                  </div>
                </div>

                {/* Peso / IMC */}
                <div style={{ padding: '0.65rem', backgroundColor: '#ecfdf5', borderRadius: '0.5rem', border: '1px solid #a7f3d0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#047857', fontWeight: 700 }}>PESO / IMC</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669', marginTop: '0.1rem' }}>
                    {encounter.vitals.weight || '62.8'} kg <span style={{ fontSize: '0.72rem', color: '#047857' }}>({encounter.vitals.bmi || '23.1'})</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              S - SUBJETIVO / ANAMNESIS
              ========================================================================= */}
          {(encounter.subjective || isEditing) && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.75rem',
                border: isEditing ? '1.5px solid #99f6e4' : '1px solid #e2e8f0',
                padding: '1rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('pastSubjectiveLabel')} {isEditing && <span style={{ color: '#0d9488' }}>(Editable)</span>}
                </span>

                {!isEditing && onCopySubjective && (
                  <button
                    type="button"
                    onClick={() => onCopySubjective(encounter.subjective)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', gap: '0.35rem' }}
                    title={t('copySubjectiveToCurrentBtn')}
                  >
                    <Copy size={12} />
                    <span>{t('copySubjectiveToCurrentBtn')}</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={editSubjective}
                  onChange={(e) => setEditSubjective(e.target.value)}
                  placeholder="Subjetivo / Motivo de consulta..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fafbfc'
                  }}
                />
              ) : (
                <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {encounter.subjective}
                </p>
              )}
            </div>
          )}

          {/* =========================================================================
              O - EXPLORACIÓN FÍSICA
              ========================================================================= */}
          {(encounter.physicalExam || isEditing) && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.75rem',
                border: isEditing ? '1.5px solid #99f6e4' : '1px solid #e2e8f0',
                padding: '1rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                {t('pastPhysicalExamLabel')} {isEditing && <span style={{ color: '#0d9488' }}>(Editable)</span>}
              </div>

              {isEditing ? (
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={editPhysicalExam}
                  onChange={(e) => setEditPhysicalExam(e.target.value)}
                  placeholder="Hallazgos de la exploración física..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fafbfc'
                  }}
                />
              ) : (
                <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {encounter.physicalExam}
                </p>
              )}
            </div>
          )}

          {/* =========================================================================
              A - EVALUACIÓN Y DIAGNÓSTICOS (CIE-11)
              ========================================================================= */}
          {(encounter.diagnoses?.length > 0 || encounter.assessment || isEditing) && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.75rem',
                border: isEditing ? '1.5px solid #99f6e4' : '1px solid #e2e8f0',
                padding: '1rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                {t('pastAssessmentLabel')} {isEditing && <span style={{ color: '#0d9488' }}>(Editable)</span>}
              </div>

              {/* Diagnosis Badges */}
              {encounter.diagnoses?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.65rem' }}>
                  {encounter.diagnoses.map((d, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        border: '1px solid #bae6fd',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600
                      }}
                    >
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{d.code}</strong>
                      <span>{d.label}</span>
                    </span>
                  ))}
                </div>
              )}

              {isEditing ? (
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={editAssessment}
                  onChange={(e) => setEditAssessment(e.target.value)}
                  placeholder="Evaluación clínica o impresión diagnóstica..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fafbfc'
                  }}
                />
              ) : (
                encounter.assessment && (
                  <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {encounter.assessment}
                  </p>
                )
              )}
            </div>
          )}

          {/* =========================================================================
              P - PLAN TERAPÉUTICO Y MEDICAMENTOS PRESCRITOS
              ========================================================================= */}
          {(encounter.plan || isEditing) && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.75rem',
                border: isEditing ? '1.5px solid #99f6e4' : '1px solid #e2e8f0',
                padding: '1rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('pastPlanLabel')} {isEditing && <span style={{ color: '#0d9488' }}>(Editable)</span>}
                </span>

                {!isEditing && onCopyPlan && (
                  <button
                    type="button"
                    onClick={() => onCopyPlan(encounter.plan)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', gap: '0.35rem', color: '#0f766e' }}
                    title={t('copyPlanToCurrentBtn')}
                  >
                    <ArrowDownLeft size={12} />
                    <span>{t('copyPlanToCurrentBtn')}</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  placeholder="Plan de manejo terapéutico y recomendaciones..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fafbfc'
                  }}
                />
              ) : (
                <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #f1f5f9' }}>
                  {encounter.plan}
                </p>
              )}

              {/* Past Prescribed Medications */}
              {encounter.medications?.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Pill size={12} color="#0f766e" />
                    <span>{t('pastMedicationsLabel')}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {encounter.medications.map((med, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#f1f5f9',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem'
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>• {med.name}</span>
                        <span style={{ color: '#64748b' }}>{med.dosage} {med.duration ? `(${med.duration})` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =========================================================================
            MODAL FOOTER WITH FULL CRUD ACTIONS (Update & Delete)
            ========================================================================= */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          {confirmDelete ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', justifyContent: 'space-between', backgroundColor: '#fef2f2', padding: '0.65rem 1rem', borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c', fontSize: '0.8125rem', fontWeight: 600 }}>
                <AlertTriangle size={16} />
                <span>¿Deseas eliminar permanentemente esta nota clínica?</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  style={{ backgroundColor: '#dc2626', color: '#ffffff', borderColor: '#b91c1c', gap: '0.35rem' }}
                >
                  <Trash2 size={13} />
                  <span>{isSubmitting ? 'Eliminando...' : 'Sí, Eliminar'}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isSubmitting}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#b91c1c', borderColor: '#fca5a5', fontSize: '0.8125rem', gap: '0.35rem' }}
                  title="Eliminar esta nota clínica"
                >
                  <Trash2 size={14} />
                  <span>Eliminar Nota</span>
                </button>

                {encountersList.length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                    {t('encounterCountLabel', { current: currentIndex + 1, total: encountersList.length })}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      disabled={isSubmitting}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8125rem', padding: '0.45rem 1rem', gap: '0.35rem' }}
                    >
                      <RotateCcw size={14} />
                      <span>Cancelar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSubmitting}
                      className="btn btn-primary"
                      style={{ backgroundColor: '#0f766e', fontSize: '0.8125rem', padding: '0.45rem 1.25rem', gap: '0.4rem' }}
                    >
                      <Save size={14} />
                      <span>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8125rem', padding: '0.45rem 1rem', color: '#0f766e', borderColor: '#99f6e4', gap: '0.35rem' }}
                    >
                      <Edit2 size={14} />
                      <span>Editar Nota</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="btn btn-primary"
                      style={{
                        backgroundColor: '#0f766e',
                        fontSize: '0.8125rem',
                        padding: '0.45rem 1.25rem'
                      }}
                    >
                      <CheckCircle2 size={15} />
                      <span>{t('closeReviewBtn')}</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
