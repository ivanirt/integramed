import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import {
  User,
  AlertTriangle,
  FileText,
  Stethoscope,
  Activity,
  Mic,
  Maximize2,
  Minimize2,
  Check,
  Plus,
  X,
  Sparkles,
  Send,
  FileCheck,
  Pill,
  Save,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  History
} from 'lucide-react';
import {
  getPatients,
  getPatientById,
  getPatientObservations,
  getPatientConditions,
  getPatientMedications,
  getPatientAllergies,
  createEncounter,
  createVitalObservation
} from '../services/fhirApi';
import {
  getPatientFullName,
  calculateAge,
  formatBirthDate,
  getPatientIdentifier
} from '../utils/fhirHelper';
import {
  loadPatientPastEncounters,
  savePatientEncounter,
  syncEncounterSoapNote,
  saveConsultationDraft,
  getConsultationDraft,
  clearConsultationDraft
} from '../utils/encounterHistoryStorage';
import { updateAppointmentStatusByPatientId, getTodayAppointments } from '../utils/dashboardStorage';
import { isTerminalAppointmentStatus, pickActiveAppointment, decorateAppointmentStatus } from '../utils/appointmentStatus';
import PreviousEncounterReviewModal from '../components/encounters/PreviousEncounterReviewModal';
import { parseVitalObservations, LOINC_CODES } from '../utils/vitalsParser';
import { hasSoapContent } from '../utils/clinicalContent';
import { getStaffAiSecrets, resolveSearchModalities, modalitySpecsFromIds } from '../utils/integrativeMedicine';
import { consultClinicalAi } from '../services/aiApi';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';

const EMPTY_VITALS = {
  weight: '',
  height: '',
  systolic: '',
  diastolic: '',
  spo2: '',
  temp: ''
};

const VITAL_INPUT_STYLE = {
  width: '3.4rem',
  border: 'none',
  background: 'transparent',
  fontSize: '0.9375rem',
  fontWeight: 800,
  color: '#0f172a',
  textAlign: 'center',
  padding: 0,
  outline: 'none'
};

function computeBmi(weight, height) {
  const w = Number(weight);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return '';
  return (w / ((h / 100) ** 2)).toFixed(2);
}

function bmiCategory(bmi) {
  const n = Number(bmi);
  if (!Number.isFinite(n) || n <= 0) {
    return { label: '—', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
  }
  if (n < 18.5) return { label: 'BAJO PESO', color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' };
  if (n < 25) return { label: 'NORMAL', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
  if (n < 30) return { label: 'SOBREPESO', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' };
  return { label: 'OBESIDAD', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
}

function allergyLabel(allergy) {
  return (
    allergy.code?.text
    || allergy.code?.coding?.[0]?.display
    || allergy.reaction?.[0]?.manifestation?.[0]?.text
    || 'Alergia'
  );
}

function conditionLabel(condition) {
  return condition.code?.text || condition.code?.coding?.[0]?.display || 'Diagnóstico';
}

function isActiveCondition(condition) {
  const status = condition.clinicalStatus?.coding?.[0]?.code;
  return !status || status === 'active' || status === 'recurrence' || status === 'relapse';
}

function medicationName(medication) {
  return (
    medication.medicationCodeableConcept?.text
    || medication.medicationCodeableConcept?.coding?.[0]?.display
    || 'Medicamento'
  );
}

function medicationDose(medication) {
  return medication.dosageInstruction?.[0]?.text || '';
}

function isCurrentMedication(medication) {
  return !medication.status || medication.status === 'active' || medication.status === 'on-hold';
}

const BANNER_CHIP = {
  fontSize: '0.75rem',
  fontWeight: 600,
  padding: '0.2rem 0.55rem',
  borderRadius: '6px',
  backgroundColor: '#ffffff',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
};

function appendDictation(previous, chunk) {
  const next = String(chunk || '').trim();
  if (!next) return previous || '';
  const current = String(previous || '');
  if (!current) return next;
  return /[\s]$/.test(current) ? `${current}${next}` : `${current} ${next}`;
}

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function DictationMicButton({ active, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      style={{
        border: 'none',
        background: active ? '#d1fae5' : '#f1f5f9',
        color: active ? '#059669' : '#94a3b8',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }}
    >
      <Mic size={13} strokeWidth={active ? 2.6 : 2} />
    </button>
  );
}

export default function ConsultationPage({ addToast }) {
  const [searchParams] = useSearchParams();
  const { id: paramId } = useParams();
  const patientIdFromQuery = searchParams.get('patientId') || paramId;
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const { currentUser } = useAuth();

  // Patients list for selector
  const [patientsList, setPatientsList] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(patientIdFromQuery || '');
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState(null);
  const [patient, setPatient] = useState(null);
  const [observations, setObservations] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [medications, setMedications] = useState([]);
  const [allergies, setAllergies] = useState([]);

  // Previous Encounters History State
  const [pastEncounters, setPastEncounters] = useState([]);
  const [selectedPastEncounter, setSelectedPastEncounter] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isPastMenuOpen, setIsPastMenuOpen] = useState(false);
  const pastMenuRef = useRef(null);
  const dictationRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [consultStartedAt, setConsultStartedAt] = useState(() => Date.now());
  const [dictatingField, setDictatingField] = useState(null);

  // SOAP Note State
  const [subjective, setSubjective] = useState('');
  const [physicalExam, setPhysicalExam] = useState('');
  const [diagnoses, setDiagnoses] = useState([]);
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [assessmentText, setAssessmentText] = useState('');
  const [plan, setPlan] = useState('');
  const [vitalsDraft, setVitalsDraft] = useState(EMPTY_VITALS);

  // AI Assistant Chat & Suggestions State
  const [aiInput, setAiInput] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiSources, setAiSources] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Load initial patients and selected patient data
  useEffect(() => {
    getPatients('')
      .then(res => {
        setPatientsList(res.patients || []);
        if (!selectedPatientId && res.patients?.length > 0) {
          setSelectedPatientId(res.patients[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Load selected patient records and previous encounters
  useEffect(() => {
    if (!selectedPatientId) return;
    setIsLoading(true);
    setIsPastMenuOpen(false);

    Promise.all([
      getPatientById(selectedPatientId),
      getPatientObservations(selectedPatientId).catch(() => []),
      getPatientConditions(selectedPatientId).catch(() => []),
      getPatientMedications(selectedPatientId).catch(() => []),
      getPatientAllergies(selectedPatientId).catch(() => [])
    ])
      .then(async ([patData, obsData, condData, medData, allergyData]) => {
        setPatient(patData);
        setObservations(obsData);
        setConditions(condData);
        setMedications(medData);
        setAllergies(allergyData);

        const patName = patData ? getPatientFullName(patData) : '';
        const history = await loadPatientPastEncounters(selectedPatientId, patName);
        setPastEncounters(history);

        // Check for existing saved draft for this patient
        const savedDraft = getConsultationDraft(selectedPatientId);
        if (savedDraft) {
          if (savedDraft.subjective !== undefined) setSubjective(savedDraft.subjective);
          if (savedDraft.physicalExam !== undefined) setPhysicalExam(savedDraft.physicalExam);
          if (savedDraft.diagnoses !== undefined) setDiagnoses(savedDraft.diagnoses);
          if (savedDraft.assessmentText !== undefined) setAssessmentText(savedDraft.assessmentText);
          if (savedDraft.plan !== undefined) setPlan(savedDraft.plan);
          if (savedDraft.vitals) {
            setVitalsDraft({ ...EMPTY_VITALS, ...savedDraft.vitals });
          } else {
            setVitalsDraft({ ...EMPTY_VITALS });
          }
          if (savedDraft.savedAt) setLastDraftSavedAt(savedDraft.savedAt);
          if (savedDraft.consultStartedAt) {
            setConsultStartedAt(savedDraft.consultStartedAt);
          } else if (savedDraft.secondsElapsed) {
            setConsultStartedAt(Date.now() - savedDraft.secondsElapsed * 1000);
          } else {
            setConsultStartedAt(Date.now());
          }
        } else {
          setSubjective('');
          setPhysicalExam('');
          setDiagnoses([]);
          setDiagnosisInput('');
          setAssessmentText('');
          setPlan('');
          setVitalsDraft({ ...EMPTY_VITALS });
          setConsultStartedAt(Date.now());
          setLastDraftSavedAt(null);
        }

        const openAppt = pickActiveAppointment(getTodayAppointments(), selectedPatientId);
        if (!openAppt || !isTerminalAppointmentStatus(openAppt.status)) {
          updateAppointmentStatusByPatientId(selectedPatientId, 'in_consultation');
        }
      })
      .catch(err => {
        console.error('Error loading consultation patient:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedPatientId]);

  // Listen for background encounter history updates
  useEffect(() => {
    const handleUpdate = () => {
      if (selectedPatientId) {
        const patName = patient ? getPatientFullName(patient) : '';
        loadPatientPastEncounters(selectedPatientId, patName).then(setPastEncounters);
      }
    };
    window.addEventListener('integramed_encounters_updated', handleUpdate);
    return () => window.removeEventListener('integramed_encounters_updated', handleUpdate);
  }, [selectedPatientId, patient]);

  useEffect(() => {
    if (!isPastMenuOpen) return undefined;
    const onDocClick = (event) => {
      if (pastMenuRef.current && !pastMenuRef.current.contains(event.target)) {
        setIsPastMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isPastMenuOpen]);

  const formatPastEncounterDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  // Last FHIR vitals used only as placeholders, not as filled values for a new consult
  const parsedVitals = useMemo(() => {
    return parseVitalObservations(observations);
  }, [observations]);

  const lastWeight = parsedVitals.weight[parsedVitals.weight.length - 1]?.value;
  const lastHeight = parsedVitals.height[parsedVitals.height.length - 1]?.value;
  const lastBp = parsedVitals.bloodPressure[parsedVitals.bloodPressure.length - 1];
  const lastSpo2 = parsedVitals.oxygenSaturation[parsedVitals.oxygenSaturation.length - 1]?.value;
  const lastTemp = parsedVitals.temperature[parsedVitals.temperature.length - 1]?.value;

  const weightVal = vitalsDraft.weight;
  const heightVal = vitalsDraft.height;
  const bmiVal = computeBmi(vitalsDraft.weight, vitalsDraft.height);
  const bmiStyle = bmiCategory(bmiVal);
  const bpStr = [vitalsDraft.systolic, vitalsDraft.diastolic].every((v) => String(v).trim())
    ? `${vitalsDraft.systolic}/${vitalsDraft.diastolic}`
    : '';
  const spo2Val = vitalsDraft.spo2;
  const tempVal = vitalsDraft.temp;
  const hasVitalsContent = Object.values(vitalsDraft).some((v) => String(v).trim() !== '');

  const handleVitalChange = (field) => (e) => {
    const value = e.target.value.replace(',', '.');
    setVitalsDraft((prev) => ({ ...prev, [field]: value }));
  };

  // Handle Diagnosis tag remove
  const handleRemoveDiagnosis = (code) => {
    setDiagnoses(prev => prev.filter(d => d.code !== code));
  };

  // Handle Diagnosis tag add
  const handleAddDiagnosis = (e) => {
    if (e.key === 'Enter' && diagnosisInput.trim()) {
      e.preventDefault();
      const code = diagnosisInput.trim().toUpperCase();
      setDiagnoses(prev => [...prev, { code: code.slice(0, 4), label: diagnosisInput.trim() }]);
      setDiagnosisInput('');
    }
  };

  // AI Quick Actions
  const handleAddSuggestionToPlan = (suggestionText) => {
    if (!suggestionText) return;
    setPlan(prev => prev ? `${prev}\n• ${suggestionText}` : `• ${suggestionText}`);
    if (addToast) {
      addToast('success', t('suggestionAddedToast'), t('toastUpdatedTitle'));
    }
  };

  const diagnosisQuery = useMemo(() => {
    const coded = diagnoses
      .map((d) => `${d.code || ''} ${d.label || ''}`.trim())
      .filter(Boolean)
      .join(', ');
    return [coded, diagnosisInput, assessmentText]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(' — ');
  }, [diagnoses, diagnosisInput, assessmentText]);

  const aiSecrets = getStaffAiSecrets(currentUser?.id);

  const stopDictation = () => {
    const rec = dictationRef.current;
    dictationRef.current = null;
    setDictatingField(null);
    if (!rec) return;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
  };

  const toggleDictation = (field) => {
    if (dictatingField === field) {
      stopDictation();
      return;
    }
    stopDictation();
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      if (addToast) {
        addToast('error', 'El navegador no permite dictado por voz. Usa Chrome o Edge con micrófono.', t('toastErrorTitle'));
      }
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = String(locale || '').startsWith('en') ? 'en-US' : 'es-MX';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      let chunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) chunk += event.results[i][0].transcript;
      }
      if (!chunk.trim()) return;
      if (field === 'subjective') setSubjective((prev) => appendDictation(prev, chunk));
      if (field === 'physical') setPhysicalExam((prev) => appendDictation(prev, chunk));
      if (field === 'assessment') setAssessmentText((prev) => appendDictation(prev, chunk));
      if (field === 'plan') setPlan((prev) => appendDictation(prev, chunk));
    };
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' && addToast) {
        addToast('error', 'Permite el micrófono en el navegador para dictar.', t('toastErrorTitle'));
      }
      stopDictation();
    };
    rec.onend = () => {
      if (dictationRef.current === rec) {
        dictationRef.current = null;
        setDictatingField(null);
      }
    };
    dictationRef.current = rec;
    try {
      rec.start();
      setDictatingField(field);
    } catch {
      stopDictation();
    }
  };

  useEffect(() => () => {
    const rec = dictationRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const handleConsultAi = async (question = '') => {
    if (!diagnosisQuery.trim()) {
      if (addToast) addToast('error', 'Escribe o selecciona un diagnóstico (código o texto libre).', t('toastErrorTitle'));
      return;
    }
    if (!aiSecrets.aiApiKey) {
      if (addToast) addToast('error', 'Configura la API key de IA en Mi perfil.', t('toastErrorTitle'));
      return;
    }

    setIsAiPanelOpen(true);
    setIsAiLoading(true);
    try {
      const result = await consultClinicalAi({
        diagnosis: diagnoses.map((item) => ({ code: item.code || '', label: item.label || '' })),
        diagnosisFreeText: [diagnosisInput, assessmentText].map((part) => String(part || '').trim()).filter(Boolean).join('\n'),
        modalities: modalitySpecsFromIds(resolveSearchModalities(currentUser?.integrativeModalities)),
        question,
        apiKey: aiSecrets.aiApiKey,
        baseUrl: aiSecrets.aiBaseUrl,
        model: aiSecrets.aiModel
      });
      setAiAnswer(result.answer || '');
      setAiSources(result.sources || []);
    } catch (err) {
      setAiAnswer('');
      setAiSources([]);
      if (addToast) addToast('error', err.message || 'No se pudo consultar la IA', 'IA clínica');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSendAiMessage = (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    const question = aiInput.trim();
    setAiInput('');
    handleConsultAi(question);
  };

  // Save Draft (Persistent in LocalStorage)
  const handleSaveDraft = () => {
    if (!selectedPatientId) return;
    const draftData = {
      subjective,
      physicalExam,
      diagnoses,
      assessmentText,
      plan,
      vitals: vitalsDraft,
      consultStartedAt
    };
    saveConsultationDraft(selectedPatientId, draftData);
    setLastDraftSavedAt(new Date().toISOString());
    if (addToast) {
      addToast('success', t('draftSavedToast') || 'Borrador de nota clínica guardado', t('toastUpdatedTitle') || 'Guardado');
    }
  };

  // Start new blank note / clean draft
  const handleNewNote = () => {
    setSubjective('');
    setPhysicalExam('');
    setDiagnoses([]);
    setDiagnosisInput('');
    setAssessmentText('');
    setPlan('');
    setVitalsDraft({ ...EMPTY_VITALS });
    setConsultStartedAt(Date.now());
    setLastDraftSavedAt(null);
    if (selectedPatientId) {
      clearConsultationDraft(selectedPatientId);
    }
    if (addToast) {
      addToast('info', 'Campos de nota clínica reiniciados para nueva consulta', 'Nueva Nota');
    }
  };

  // Copy helpers for past encounters review
  const handleCopySubjective = (pastSubjectiveText) => {
    if (!pastSubjectiveText) return;
    setSubjective(prev => prev ? `${prev}\n\n[Antecedente de visita previa]:\n${pastSubjectiveText}` : pastSubjectiveText);
    if (addToast) {
      addToast('success', t('subjectiveCopiedToast'), t('toastUpdatedTitle'));
    }
  };

  const handleCopyPlan = (pastPlanText) => {
    if (!pastPlanText) return;
    setPlan(prev => prev ? `${prev}\n\n[Continuación de plan previo]:\n${pastPlanText}` : pastPlanText);
    if (addToast) {
      addToast('success', t('planCopiedToast'), t('toastUpdatedTitle'));
    }
  };

  // Finalize Encounter
  const handleFinalizeConsultation = async () => {
    setIsFinishing(true);
    try {
      const patientName = patient ? getPatientFullName(patient) : `Patient ${selectedPatientId}`;
      const reasonSummary = diagnoses.map(d => d.label).join(', ') || subjective.slice(0, 60);
      const clinicalNote = {
        reason: reasonSummary,
        summary: assessmentText || subjective.slice(0, 100),
        subjective,
        physicalExam,
        diagnoses,
        assessment: assessmentText,
        plan,
        medications: medications.map(m => ({
          name: m.medicationCodeableConcept?.text || 'Medicamento',
          dosage: 'Según prescripción médica',
          duration: 'Continuo'
        })),
        vitals: {
          bloodPressure: bpStr,
          heartRate: '',
          temperature: tempVal,
          respiratoryRate: '',
          oxygenSaturation: spo2Val,
          weight: weightVal,
          height: heightVal,
          bmi: bmiVal
        }
      };
      const hasClinicalContent = hasSoapContent(clinicalNote) || hasVitalsContent;

      let fhirEncounter = null;
      if (selectedPatientId && hasClinicalContent) {
        fhirEncounter = await createEncounter({
          patientId: selectedPatientId,
          patientName,
          type: diagnoses[0]?.label ? `Consulta: ${diagnoses[0].label}` : 'Consulta de Medicina General',
          status: 'finished',
          startTime: new Date(consultStartedAt).toISOString(),
          endTime: new Date().toISOString(),
          reason: reasonSummary
        }).catch(err => {
          console.warn(err);
          return null;
        });
      }

      const encounterId = fhirEncounter?.id || null;
      if (selectedPatientId && hasVitalsContent) {
        const vitalPosts = [
          createVitalObservation({
            patientId: selectedPatientId,
            loinc: LOINC_CODES.WEIGHT,
            display: 'Body weight',
            value: vitalsDraft.weight,
            unit: 'kg',
            encounterId
          }),
          createVitalObservation({
            patientId: selectedPatientId,
            loinc: LOINC_CODES.HEIGHT,
            display: 'Body height',
            value: vitalsDraft.height,
            unit: 'cm',
            encounterId
          }),
          createVitalObservation({
            patientId: selectedPatientId,
            loinc: LOINC_CODES.BMI,
            display: 'Body mass index',
            value: bmiVal,
            unit: 'kg/m2',
            encounterId
          }),
          createVitalObservation({
            patientId: selectedPatientId,
            loinc: LOINC_CODES.BP_SYSTOLIC,
            display: 'Systolic blood pressure',
            value: vitalsDraft.systolic,
            unit: 'mmHg',
            encounterId
          }),
          createVitalObservation({
            patientId: selectedPatientId,
            loinc: LOINC_CODES.BP_DIASTOLIC,
            display: 'Diastolic blood pressure',
            value: vitalsDraft.diastolic,
            unit: 'mmHg',
            encounterId
          }),
          createVitalObservation({
            patientId: selectedPatientId,
            loinc: LOINC_CODES.OXYGEN_SATURATION,
            display: 'Oxygen saturation',
            value: vitalsDraft.spo2,
            unit: '%',
            encounterId
          }),
          createVitalObservation({
            patientId: selectedPatientId,
            loinc: LOINC_CODES.TEMPERATURE,
            display: 'Body temperature',
            value: vitalsDraft.temp,
            unit: 'Cel',
            encounterId
          })
        ];
        await Promise.allSettled(vitalPosts);
      }

      // Save complete clinical note to past encounters history and FHIR DocumentReference
      const finalizedEncounter = {
        id: fhirEncounter?.id || `enc-${selectedPatientId || 'pat'}-${Date.now()}`,
        fhirId: fhirEncounter?.id || null,
        patientId: selectedPatientId,
        patientName,
        date: new Date().toISOString(),
        type: diagnoses[0]?.label ? `Consulta: ${diagnoses[0].label}` : 'Consulta de Medicina General',
        status: 'finished',
        practitionerName: 'Dra. Mariana Silva Ruiz',
        practitionerSpecialty: 'Medicina General',
        locationName: 'Plantel Central - Consultorio 102',
        reason: reasonSummary,
        summary: assessmentText || subjective.slice(0, 100),
        vitals: {
          bloodPressure: bpStr,
          heartRate: '',
          temperature: tempVal,
          respiratoryRate: '',
          oxygenSaturation: spo2Val,
          weight: weightVal,
          height: heightVal,
          bmi: bmiVal
        },
        subjective,
        physicalExam,
        diagnoses,
        assessment: assessmentText,
        plan,
        medications: clinicalNote.medications
      };
      if (hasClinicalContent) {
        const stored = savePatientEncounter(finalizedEncounter);
        await syncEncounterSoapNote(stored);
      }

      // Clear draft for this patient upon finalization
      if (selectedPatientId) {
        clearConsultationDraft(selectedPatientId);
        updateAppointmentStatusByPatientId(selectedPatientId, 'finished');
      }

      if (addToast) {
        addToast('success', t('consultationFinalizedToast') || 'Consulta finalizada con éxito. Regresando al inicio...', t('toastCreatedTitle') || 'Consulta');
      }
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err) {
      console.error('Error finalizing encounter:', err);
      if (addToast) {
        addToast('error', err.message || 'Error al finalizar consulta', t('toastErrorTitle'));
      }
    } finally {
      setIsFinishing(false);
    }
  };

  const fullName = patient ? getPatientFullName(patient) : 'Mariana Silva Ruiz';
  const age = calculateAge(patient?.birthDate) ?? 34;
  const expNumber = patient?.identifier?.find(i => i.type?.coding?.some(c => c.code === 'MR'))?.value || patient?.id?.slice(0, 8).toUpperCase() || '84920';
  const liveAppointment = pickActiveAppointment(getTodayAppointments(), selectedPatientId)
    || getTodayAppointments().find((a) => String(a.patientId) === String(selectedPatientId));
  const liveStatus = liveAppointment
    ? decorateAppointmentStatus(liveAppointment.status)
    : decorateAppointmentStatus('in_consultation');

  return (
    <div style={{ padding: '1.25rem 1.75rem', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* =========================================================================
          TOP CONSULTATION STATUS BAR (Directly matching attached screenshot)
          ========================================================================= */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Active Consultation Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              backgroundColor: liveStatus.bg,
              color: liveStatus.color,
              border: `1px solid ${liveStatus.border}`,
              fontSize: '0.8125rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: liveStatus.color }} />
            <span>{liveStatus.label}</span>
          </div>

          {/* Previous Encounters Quick Trigger Button in Header */}
          <div ref={pastMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsPastMenuOpen((open) => !open)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                backgroundColor: isPastMenuOpen ? '#ccfbf1' : '#f0fdfa',
                color: '#0f766e',
                border: '1px solid #99f6e4',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={t('previousEncountersSubtitle')}
              aria-expanded={isPastMenuOpen}
              aria-haspopup="menu"
            >
              <History size={14} strokeWidth={2.5} />
              <span>{t('previousEncountersTitle')}</span>
              <span
                style={{
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  borderRadius: '9999px',
                  padding: '1px 6px',
                  fontSize: '0.7rem',
                  fontWeight: 800
                }}
              >
                {pastEncounters.length}
              </span>
              <ChevronDown size={14} strokeWidth={2.5} />
            </button>

            {isPastMenuOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.4rem)',
                  left: 0,
                  zIndex: 40,
                  minWidth: '280px',
                  maxWidth: '360px',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
                  padding: '0.4rem'
                }}
              >
                {pastEncounters.length === 0 ? (
                  <div style={{ padding: '0.75rem 0.85rem', fontSize: '0.8125rem', color: '#64748b' }}>
                    {t('noPastEncounters')}
                  </div>
                ) : (
                  pastEncounters.map((enc) => {
                    const title = enc.diagnoses?.[0]?.label || enc.type || 'Consulta';
                    return (
                      <button
                        key={enc.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setSelectedPastEncounter(enc);
                          setIsReviewModalOpen(true);
                          setIsPastMenuOpen(false);
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          background: 'transparent',
                          borderRadius: '0.5rem',
                          padding: '0.55rem 0.7rem',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                          {title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem' }}>
                          {formatPastEncounterDate(enc.date)}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Patient Quick Selector */}
          {patientsList.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{t('patient')}:</span>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="form-input"
                style={{ height: '34px', fontSize: '0.8125rem', padding: '0.2rem 0.6rem', borderRadius: '6px' }}
              >
                {patientsList.map(p => (
                  <option key={p.id} value={p.id}>
                    {getPatientFullName(p)} (ID: {p.id?.slice(0, 8)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          MAIN 3-COLUMN CLINICAL LAYOUT (Directly matching the attached screenshot)
          ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isAiPanelOpen
            ? '260px minmax(0, 1.8fr) minmax(300px, 360px)'
            : '260px minmax(0, 1fr)',
          gap: '1.25rem',
          alignItems: 'start'
        }}
      >
        {/* =========================================================================
            COLUMN 1: PATIENT CLINICAL SUMMARY (Left, ~260px)
            ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Patient Identity Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              textAlign: 'center'
            }}
          >
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#e0f2fe',
                  border: '2px solid #bae6fd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  margin: '0 auto',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                }}
              >
                {patient?.gender === 'female' ? '👩' : '👨'}
              </div>
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-16px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                #CLI-{expNumber}
              </span>
            </div>

            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, marginBottom: '0.35rem' }}>
              {fullName}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
              <span>{age} {t('yearsOld', { age: '' }).trim()}</span>
              <span>•</span>
              <span>{patient?.gender === 'female' ? '♀ Femenino' : '♂ Masculino'}</span>
              <span>•</span>
              <span style={{ color: '#059669', fontWeight: 700, backgroundColor: '#ecfdf5', padding: '1px 5px', borderRadius: '4px' }}>
                O+
              </span>
            </div>
          </div>

          {/* 3. Alergias Card (Pink alert box) */}
          <div
            style={{
              backgroundColor: '#fff1f2',
              borderRadius: '0.875rem',
              border: '1px solid #fecdd3',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#e11d48', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              <AlertTriangle size={14} />
              <span>{t('allergiesTitle')}</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#be123c', fontWeight: 600, paddingLeft: '1.25rem' }}>
              Penicilinas y derivados
            </div>
          </div>

          {/* 4. Padecimientos Activos Card (Amber box) */}
          <div
            style={{
              backgroundColor: '#fefce8',
              borderRadius: '0.875rem',
              border: '1px solid #fef08a',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ca8a04', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              <Stethoscope size={14} />
              <span>{t('activeConditionsTitle')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '0.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#854d0e', backgroundColor: '#ffffff', padding: '0.25rem 0.55rem', borderRadius: '6px', border: '1px solid #fef08a' }}>
                HTA Primaria Grado I
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#854d0e', backgroundColor: '#ffffff', padding: '0.25rem 0.55rem', borderRadius: '6px', border: '1px solid #fef08a' }}>
                Asma leve
              </div>
            </div>
          </div>

          {/* 5. Medicación Actual Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0f766e', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              <Pill size={14} />
              <span>{t('currentMedicationTitle')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', color: '#334155' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                <span style={{ color: '#0d9488', fontWeight: 800 }}>•</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Losartán 50mg</div>
                  <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Cada 24h</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                <span style={{ color: '#0d9488', fontWeight: 800 }}>•</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Salbutamol 100mcg</div>
                  <div style={{ color: '#64748b', fontSize: '0.7rem' }}>PRN</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            COLUMN 2: NOTA CLÍNICA (SOAP) (Center, Main Editor)
            ========================================================================= */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.875rem',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          {/* SOAP Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FileText size={20} color="#0f766e" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                {t('soapNoteTitle')}
              </h2>
              {lastDraftSavedAt && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#0f766e',
                    backgroundColor: '#f0fdfa',
                    border: '1px solid #ccfbf1',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                  title={`Último autoguardado de borrador: ${new Date(lastDraftSavedAt).toLocaleTimeString()}`}
                >
                  <Check size={11} strokeWidth={3} />
                  Borrador guardado
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleNewNote}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#0f766e',
                  backgroundColor: '#f0fdfa',
                  border: '1px solid #99f6e4',
                  borderRadius: '0.5rem',
                  padding: '0.3rem 0.65rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Limpiar campos e iniciar una nueva nota clínica"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>+ Nueva Nota</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  borderRadius: '6px'
                }}
                title="Toggle fullscreen"
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
          </div>

          {/* S - MOTIVO DE CONSULTA (Subjective) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('soapSubjectiveLabel')}
              </label>

              <DictationMicButton
                active={dictatingField === 'subjective'}
                onClick={() => toggleDictation('subjective')}
                title="Dictar motivo de consulta"
              />
            </div>

            <textarea
              className="form-textarea"
              rows={4}
              value={subjective}
              onChange={(e) => setSubjective(e.target.value)}
              placeholder="Refiere cefalea de 3 días de evolución, de tipo opresivo..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: '100px',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                padding: '0.75rem 1rem',
                borderRadius: '0.625rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                resize: 'vertical'
              }}
            />
          </div>

          {/* O - SIGNOS VITALES (RECIENTES) (Objective Vitals KPI Row) */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.5rem' }}>
              {t('soapObjectiveVitalsLabel')}
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {/* Peso / Talla */}
              <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.625rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>PESO / TALLA</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.15rem', marginTop: '0.2rem' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Peso en kg"
                    value={vitalsDraft.weight}
                    onChange={handleVitalChange('weight')}
                    placeholder={lastWeight != null ? String(lastWeight) : '—'}
                    style={VITAL_INPUT_STYLE}
                  />
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>kg /</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Talla en cm"
                    value={vitalsDraft.height}
                    onChange={handleVitalChange('height')}
                    placeholder={lastHeight != null ? String(lastHeight) : '—'}
                    style={VITAL_INPUT_STYLE}
                  />
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>cm</span>
                </div>
              </div>

              {/* IMC */}
              <div style={{ padding: '0.75rem', backgroundColor: bmiStyle.bg, borderRadius: '0.625rem', border: `1px solid ${bmiStyle.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: bmiStyle.color, fontWeight: 700, textTransform: 'uppercase' }}>IMC</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: bmiStyle.color, marginTop: '0.1rem' }}>
                  {bmiVal || '—'}
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: bmiStyle.color, textTransform: 'uppercase' }}>{bmiStyle.label}</span>
              </div>

              {/* Presión Arterial */}
              <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.625rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>PRESIÓN A.</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.1rem', marginTop: '0.2rem' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Presión sistólica"
                    value={vitalsDraft.systolic}
                    onChange={handleVitalChange('systolic')}
                    placeholder={lastBp?.systolic != null ? String(lastBp.systolic) : '—'}
                    style={{ ...VITAL_INPUT_STYLE, width: '2.6rem' }}
                  />
                  <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#64748b' }}>/</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Presión diastólica"
                    value={vitalsDraft.diastolic}
                    onChange={handleVitalChange('diastolic')}
                    placeholder={lastBp?.diastolic != null ? String(lastBp.diastolic) : '—'}
                    style={{ ...VITAL_INPUT_STYLE, width: '2.6rem' }}
                  />
                </div>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>mmHg</span>
              </div>

              {/* SpO2 / Temp */}
              <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.625rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>SPO2 / TEMP</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.1rem', marginTop: '0.2rem' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Saturación de oxígeno"
                    value={vitalsDraft.spo2}
                    onChange={handleVitalChange('spo2')}
                    placeholder={lastSpo2 != null ? String(lastSpo2) : '—'}
                    style={{ ...VITAL_INPUT_STYLE, width: '2.4rem' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>%</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Temperatura"
                    value={vitalsDraft.temp}
                    onChange={handleVitalChange('temp')}
                    placeholder={lastTemp != null ? String(lastTemp) : '—'}
                    style={{ ...VITAL_INPUT_STYLE, width: '2.6rem' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>°</span>
                </div>
              </div>
            </div>
          </div>

          {/* EXPLORACIÓN FÍSICA (Physical Exam) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('soapPhysicalExamLabel')}
              </label>

              <DictationMicButton
                active={dictatingField === 'physical'}
                onClick={() => toggleDictation('physical')}
                title="Dictar exploración física"
              />
            </div>

            <textarea
              className="form-textarea"
              rows={4}
              value={physicalExam}
              onChange={(e) => setPhysicalExam(e.target.value)}
              placeholder="Paciente consciente, orientado, ruidos cardíacos rítmicos..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: '100px',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                padding: '0.75rem 1rem',
                borderRadius: '0.625rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                resize: 'vertical'
              }}
            />
          </div>

          {/* A - DIAGNÓSTICO (CIE-11) (Assessment & Diagnostic chips + Free text) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('soapAssessmentLabel')}
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => handleConsultAi()}
                  title="Consultar IA del vault (código CIE y texto libre)"
                  style={{
                    border: 'none',
                    background: isAiPanelOpen ? '#ccfbf1' : '#ecfdf5',
                    color: '#0f766e',
                    borderRadius: '50%',
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={20} strokeWidth={2.25} />
                </button>
                <DictationMicButton
                  active={dictatingField === 'assessment'}
                  onClick={() => toggleDictation('assessment')}
                  title="Dictar diagnóstico o evaluación clínica"
                />
              </div>
            </div>

            {/* CIE-11 Tag Container */}
            <div
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: '48px',
                backgroundColor: '#f8fafc',
                borderRadius: '0.625rem',
                border: '1px solid #cbd5e1',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}
            >
              {diagnoses.map((diag) => (
                <div
                  key={diag.code}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600
                  }}
                >
                  <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{diag.code}</span>
                  <span>{diag.label}</span>
                  <button
                    onClick={() => handleRemoveDiagnosis(diag.code)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#0369a1',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                      marginLeft: '2px'
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}

              <input
                type="text"
                value={diagnosisInput}
                onChange={(e) => setDiagnosisInput(e.target.value)}
                onKeyDown={handleAddDiagnosis}
                placeholder={t('searchDiagnosisPlaceholder')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  flex: '1 1 240px',
                  minWidth: '220px',
                  padding: '0.2rem 0'
                }}
              />
            </div>

            {/* Diagnóstico Clínico / Impresión Diagnóstica en Texto Libre */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.3rem' }}>
                {t('soapAssessmentNarrativeLabel')}
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                value={assessmentText}
                onChange={(e) => setAssessmentText(e.target.value)}
                placeholder={t('soapAssessmentNarrativePlaceholder')}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: '80px',
                  fontSize: '0.875rem',
                  lineHeight: 1.55,
                  padding: '0.65rem 0.875rem',
                  borderRadius: '0.625rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* P - PLAN Y TRATAMIENTO (Plan) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('soapPlanLabel')}
              </label>

              <DictationMicButton
                active={dictatingField === 'plan'}
                onClick={() => toggleDictation('plan')}
                title="Dictar plan de tratamiento"
              />
            </div>

            <textarea
              className="form-textarea"
              rows={5}
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder="Continuar con losartán. Solicitar perfil lipídico. Cita en 3 meses..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: '120px',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                padding: '0.75rem 1rem',
                borderRadius: '0.625rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Bottom Actions Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleSaveDraft}
              className="btn btn-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.55rem 1rem' }}
            >
              <Save size={15} />
              <span>{t('saveDraftBtn')}</span>
            </button>

            <button
              onClick={() => navigate(`/recetas?patientId=${selectedPatientId}`)}
              className="btn btn-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.55rem 1rem', color: '#0f766e', borderColor: '#a7f3d0' }}
            >
              <FileCheck size={15} />
              <span>{t('generatePrescriptionBtn')}</span>
            </button>

            <button
              onClick={handleFinalizeConsultation}
              disabled={isFinishing}
              className="btn btn-primary"
              style={{
                backgroundColor: '#0f766e',
                boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)',
                padding: '0.55rem 1.35rem',
                fontSize: '0.8125rem',
                gap: '0.4rem'
              }}
            >
              <CheckCircle2 size={16} strokeWidth={2.5} />
              <span>{isFinishing ? t('finalizingEncounter') : t('finalizeConsultationBtn')}</span>
            </button>
          </div>
        </div>

        {isAiPanelOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#5eead4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#047857' }}>
                  <Sparkles size={18} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  IA del vault
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAiPanelOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                title="Cerrar panel"
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.45, margin: 0 }}>
              Material de apoyo del vault. Verificar antes de indicar.
            </p>

            {isAiLoading && (
              <div style={{ fontSize: '0.8125rem', color: '#0f766e', fontWeight: 600 }}>Buscando en el vault…</div>
            )}

            {!isAiLoading && aiAnswer && (
              <div style={{ fontSize: '0.8125rem', color: '#0f172a', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {aiAnswer}
              </div>
            )}

            {!isAiLoading && aiSources.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Fuentes</div>
                {aiSources.map((src) => (
                  <div key={src.file} style={{ fontSize: '0.72rem', color: '#475569', background: '#f8fafc', borderRadius: '0.5rem', padding: '0.5rem 0.65rem' }}>
                    <div style={{ fontWeight: 700, color: '#0f766e' }}>{src.title || src.file}</div>
                    <div>{src.excerpt}</div>
                  </div>
                ))}
              </div>
            )}

            {aiAnswer && (
              <button
                type="button"
                onClick={() => handleAddSuggestionToPlan(aiAnswer)}
                className="btn btn-sm"
                style={{
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  alignSelf: 'flex-start'
                }}
              >
                {t('addToPlanBtn')}
              </button>
            )}

            <form onSubmit={handleSendAiMessage} style={{ marginTop: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '0.625rem', border: '1px solid #e2e8f0', padding: '0.25rem 0.5rem' }}>
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder={t('askAiPlaceholder')}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '0.78rem',
                    flex: 1,
                    color: '#0f172a'
                  }}
                />
                <button
                  type="submit"
                  disabled={!aiInput.trim() || isAiLoading}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: aiInput.trim() ? '#0f766e' : '#94a3b8',
                    cursor: aiInput.trim() ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem'
                  }}
                >
                  <Send size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
        )}
      </div>

      {/* =========================================================================
          PREVIOUS ENCOUNTER REVIEW MODAL / DRAWER
          ========================================================================= */}
      <PreviousEncounterReviewModal
        isOpen={isReviewModalOpen}
        encounter={selectedPastEncounter}
        encountersList={pastEncounters}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedPastEncounter(null);
        }}
        onSelectEncounter={(enc) => setSelectedPastEncounter(enc)}
        onCopySubjective={handleCopySubjective}
        onCopyPlan={handleCopyPlan}
        onEncounterUpdated={async (updated) => {
          const patName = patient ? getPatientFullName(patient) : '';
          const refreshed = await loadPatientPastEncounters(selectedPatientId, patName);
          setPastEncounters(refreshed);
          setSelectedPastEncounter(updated);
        }}
        onEncounterDeleted={async () => {
          const patName = patient ? getPatientFullName(patient) : '';
          const refreshed = await loadPatientPastEncounters(selectedPatientId, patName);
          setPastEncounters(refreshed);
          setIsReviewModalOpen(false);
          setSelectedPastEncounter(null);
        }}
        addToast={addToast}
      />
    </div>
  );
}
