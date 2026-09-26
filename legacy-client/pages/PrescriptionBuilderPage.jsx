import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
  Printer,
  Send,
  Save,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Sparkles,
  QrCode,
  ShieldAlert,
  ChevronDown,
  Info,
  Check,
  X
} from 'lucide-react';
import {
  getPatients,
  getPatientById,
  getPractitioners,
  getPatientConditions,
  createMedicationRequest
} from '../services/fhirApi';
import {
  getPatientFullName,
  calculateAge,
  formatBirthDate,
  getPatientIdentifier
} from '../utils/fhirHelper';
import { useLanguage } from '../i18n/LanguageContext';

// Database of common medications for quick search and autocomplete
const CLINICAL_MEDICATIONS_DB = [
  {
    name: 'Tempra Forte (Paracetamol)',
    presentation: 'Caja con 20 tabletas - 500mg',
    defaultDose: '500 mg',
    defaultRoute: 'Oral',
    defaultFreq: 'Cada 8 horas',
    defaultDuration: '3 días',
    defaultIndications: 'Tomar con alimentos. En caso de persistir la fiebre, contactar al médico.',
    riskWarning: null
  },
  {
    name: 'Temisartan (Micardis)',
    presentation: 'Caja con 14 tabletas - 40mg',
    defaultDose: '40 mg',
    defaultRoute: 'Oral',
    defaultFreq: 'Cada 24 horas',
    defaultDuration: '30 días',
    defaultIndications: 'Tomar por la mañana en ayuno.',
    riskWarning: null
  },
  {
    name: 'Losartán Potásico',
    presentation: 'Caja con 30 tabletas - 50mg',
    defaultDose: '50 mg',
    defaultRoute: 'Oral',
    defaultFreq: 'Cada 24 horas',
    defaultDuration: '30 días',
    defaultIndications: 'Tomar por las mañanas con un vaso de agua.',
    riskWarning: null
  },
  {
    name: 'Salbutamol Inhalador (Ventolin)',
    presentation: 'Aerosol 100mcg/dosis - 200 dosis',
    defaultDose: '100 mcg (2 disparos)',
    defaultRoute: 'Inhalatoria',
    defaultFreq: 'Cada 8 horas / PRN',
    defaultDuration: '7 días',
    defaultIndications: 'Enjuagar la boca con agua tras cada aplicación.',
    riskWarning: null
  },
  {
    name: 'Amoxicilina / Ácido Clavulánico',
    presentation: 'Caja con 14 tabletas - 500/125mg',
    defaultDose: '500/125 mg',
    defaultRoute: 'Oral',
    defaultFreq: 'Cada 12 horas',
    defaultDuration: '7 días',
    defaultIndications: 'Tomar al inicio de los alimentos para evitar molestias gástricas.',
    riskWarning: 'ALERTA: Paciente con alergia registrada a Penicilinas. Contraindicado.'
  },
  {
    name: 'Ibuprofeno',
    presentation: 'Caja con 20 tabletas - 400mg',
    defaultDose: '400 mg',
    defaultRoute: 'Oral',
    defaultFreq: 'Cada 8 horas',
    defaultDuration: '3 días',
    defaultIndications: 'Tomar estrictamente con alimentos.',
    riskWarning: 'ALERTA: Paciente asmático e hipertenso. Evitar AINEs por riesgo de broncoespasmo y descontrol tensional.'
  },
  {
    name: 'Omeprazol',
    presentation: 'Caja con 14 cápsulas - 20mg',
    defaultDose: '20 mg',
    defaultRoute: 'Oral',
    defaultFreq: 'Cada 24 horas',
    defaultDuration: '14 días',
    defaultIndications: 'Tomar 30 minutos antes del desayuno.',
    riskWarning: null
  },
  {
    name: 'Metformina',
    presentation: 'Caja con 30 tabletas - 850mg',
    defaultDose: '850 mg',
    defaultRoute: 'Oral',
    defaultFreq: 'Cada 12 horas',
    defaultDuration: '30 días',
    defaultIndications: 'Tomar junto con el desayuno y la cena.',
    riskWarning: null
  }
];

export default function PrescriptionBuilderPage({ addToast }) {
  const [searchParams] = useSearchParams();
  const patientIdFromQuery = searchParams.get('patientId');
  const navigate = useNavigate();
  const { t, locale } = useLanguage();

  // Patients & Practitioners list
  const [patientsList, setPatientsList] = useState([]);
  const [practitionersList, setPractitionersList] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(patientIdFromQuery || '');
  const [selectedPractitionerId, setSelectedPractitionerId] = useState('');
  const [patient, setPatient] = useState(null);
  const [conditions, setConditions] = useState([]);

  // Medication search & form
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('500 mg');
  const [route, setRoute] = useState('Oral');
  const [frequency, setFrequency] = useState('Cada 8 horas');
  const [duration, setDuration] = useState('3 días');
  const [indications, setIndications] = useState('Tomar con alimentos. En caso de persistir la fiebre, contactar al médico.');
  const [currentWarning, setCurrentWarning] = useState(null);

  // Added items in prescription
  const [prescriptionItems, setPrescriptionItems] = useState([
    {
      id: 'item-1',
      name: 'Tempra Forte (Paracetamol)',
      dosage: '500 mg',
      route: 'Oral',
      frequency: 'Cada 8 horas',
      duration: '3 días',
      indications: 'Tomar con alimentos. En caso de persistir la fiebre, contactar al médico.'
    }
  ]);

  // Follow-up & Controls
  const [nextControlDate, setNextControlDate] = useState('2026-10-02');
  const [takingFrequency, setTakingFrequency] = useState('Regular (Estándar)');
  const [enableDigitalReminders, setEnableDigitalReminders] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    Promise.all([
      getPatients(''),
      getPractitioners()
    ])
      .then(([patRes, practs]) => {
        setPatientsList(patRes.patients || []);
        setPractitionersList(practs || []);
        if (!selectedPatientId && patRes.patients?.length > 0) {
          setSelectedPatientId(patRes.patients[0].id);
        }
        if (practs?.length > 0) {
          setSelectedPractitionerId(practs[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Load patient details
  useEffect(() => {
    if (!selectedPatientId) return;
    Promise.all([
      getPatientById(selectedPatientId),
      getPatientConditions(selectedPatientId).catch(() => [])
    ])
      .then(([patData, condData]) => {
        setPatient(patData);
        setConditions(condData || []);
      })
      .catch(console.error);
  }, [selectedPatientId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered medication suggestions
  const filteredMedications = useMemo(() => {
    if (!searchQuery.trim()) return CLINICAL_MEDICATIONS_DB.slice(0, 4);
    const query = searchQuery.toLowerCase().trim();
    return CLINICAL_MEDICATIONS_DB.filter(m =>
      m.name.toLowerCase().includes(query) || m.presentation.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Select medication from autocomplete
  const handleSelectMedication = (med) => {
    setMedicationName(med.name);
    setDosage(med.defaultDose);
    setRoute(med.defaultRoute);
    setFrequency(med.defaultFreq);
    setDuration(med.defaultDuration);
    setIndications(med.defaultIndications);
    setCurrentWarning(med.riskWarning);
    setSearchQuery(med.name);
    setIsDropdownOpen(false);
  };

  // Add medication to prescription list
  const handleAddMedication = (e) => {
    e.preventDefault();
    if (!medicationName.trim()) {
      if (searchQuery.trim()) {
        setMedicationName(searchQuery.trim());
      } else {
        return;
      }
    }

    const newItem = {
      id: `item-${Date.now()}`,
      name: medicationName || searchQuery,
      dosage,
      route,
      frequency,
      duration,
      indications
    };

    setPrescriptionItems(prev => [...prev, newItem]);
    setSearchQuery('');
    setMedicationName('');
    setCurrentWarning(null);

    if (addToast) {
      addToast('success', t('medicationAddedToPrescriptionToast'), t('toastCreatedTitle'));
    }
  };

  // Remove medication from prescription
  const handleRemoveItem = (itemId) => {
    setPrescriptionItems(prev => prev.filter(i => i.id !== itemId));
  };

  // Print Prescription
  const handlePrint = () => {
    window.print();
  };

  // Sign & Send to Patient
  const handleSignAndSend = async () => {
    if (prescriptionItems.length === 0) {
      if (addToast) addToast('error', t('emptyPrescriptionError'), t('toastErrorTitle'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (!selectedPatientId || !patient) {
        if (addToast) addToast('error', t('emptyPrescriptionError'), t('toastErrorTitle'));
        setIsSubmitting(false);
        return;
      }
      const patientName = getPatientFullName(patient);
      const selectedDoc = practitionersList.find(p => p.id === selectedPractitionerId);
      const doctorName = selectedDoc
        ? `${selectedDoc.name?.[0]?.prefix?.[0] || 'Dr.'} ${selectedDoc.name?.[0]?.given?.join(' ')} ${selectedDoc.name?.[0]?.family}`.trim()
        : '';

      // Submit FHIR MedicationRequest for each item
      for (const item of prescriptionItems) {
        if (!String(item.name || '').trim()) continue;
        await createMedicationRequest({
          patientId: selectedPatientId,
          patientName,
          practitionerId: selectedPractitionerId || undefined,
          practitionerName: doctorName,
          medicationName: item.name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          route: item.route,
          instructions: item.indications
        });
      }

      if (addToast) {
        addToast('success', t('prescriptionSignedAndSentToast'), t('toastCreatedTitle'));
      }
      setTimeout(() => {
        navigate('/patients');
      }, 1500);
    } catch (err) {
      console.error('Error signing prescription:', err);
      if (addToast) {
        addToast('error', err.message || 'Failed to save medication requests to FHIR server', t('toastErrorTitle'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullName = patient ? getPatientFullName(patient) : '';
  const age = patient ? calculateAge(patient?.birthDate) : '';
  const expNumber = patient?.identifier?.find(i => i.type?.coding?.some(c => c.code === 'MR'))?.value || patient?.id?.slice(0, 8).toUpperCase() || '';

  const selectedDoctor = practitionersList.find(p => p.id === selectedPractitionerId);
  const doctorDisplayName = selectedDoctor
    ? `${selectedDoctor.name?.[0]?.prefix?.[0] || 'Dr.'} ${selectedDoctor.name?.[0]?.given?.join(' ')} ${selectedDoctor.name?.[0]?.family}`.trim()
    : '';
  const doctorSpecialty = selectedDoctor?.qualification?.[0]?.code?.text || 'Medicina Interna';

  const todayFormatted = new Date().toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '1500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header & Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {t('prescriptionBuilderTitle')}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem', fontSize: '0.875rem', color: '#64748b' }}>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{fullName}</span>
            <span>•</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>#CLI-{expNumber}</span>
          </div>
        </div>

        {/* Patient and Doctor Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {patientsList.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('patient')}:</span>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="form-input"
                style={{ height: '34px', fontSize: '0.8125rem', padding: '0.2rem 0.6rem' }}
              >
                {patientsList.map(p => (
                  <option key={p.id} value={p.id}>
                    {getPatientFullName(p)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {practitionersList.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('fieldPractitioner')}:</span>
              <select
                value={selectedPractitionerId}
                onChange={(e) => setSelectedPractitionerId(e.target.value)}
                className="form-input"
                style={{ height: '34px', fontSize: '0.8125rem', padding: '0.2rem 0.6rem' }}
              >
                {practitionersList.map(doc => {
                  const prefix = doc.name?.[0]?.prefix?.[0] || 'Dr.';
                  const given = doc.name?.[0]?.given?.join(' ') || '';
                  const family = doc.name?.[0]?.family || '';
                  return (
                    <option key={doc.id} value={doc.id}>
                      {prefix} {given} {family}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Clinical Assistant Alert Banner (Directly matching attached screenshot) */}
      <div
        style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '0.75rem',
          padding: '0.875rem 1.25rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.875rem'
        }}
      >
        <div style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }}>
          <AlertTriangle size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.8125rem', color: '#92400e', lineHeight: 1.4 }}>
            <strong style={{ color: '#78350f' }}>{t('assistantAlertTitle')}:</strong> {fullName} {t('assistantAlertText')}
          </div>
          <button
            onClick={() => setIsDetailDrawerOpen(true)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#0f766e',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              marginTop: '0.25rem',
              textDecoration: 'underline'
            }}
          >
            {t('viewClinicalDetailLink')}
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid: Form on Left | Printable Sheet on Right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(420px, 1fr)',
          gap: '1.5rem',
          alignItems: 'start'
        }}
      >
        {/* =========================================================================
            LEFT COLUMN: PRESCRIPTION BUILDER FORM
            ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Add Medication Card */}
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
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              {t('addMedicationSectionTitle')}
            </h3>

            {/* Search Input with Autocomplete Dropdown */}
            <div ref={searchContainerRef} style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-input"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder={t('searchMedicationPlaceholder')}
                  style={{
                    height: '42px',
                    paddingLeft: '2.5rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.625rem',
                    backgroundColor: '#f8fafc',
                    borderColor: '#cbd5e1'
                  }}
                />
              </div>

              {/* Autocomplete Suggestions Menu */}
              {isDropdownOpen && filteredMedications.length > 0 && (
                <div
                  className="animate-modal-in"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    borderRadius: '0.625rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 50,
                    overflow: 'hidden',
                    maxHeight: '260px',
                    overflowY: 'auto'
                  }}
                >
                  {filteredMedications.map((med, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectMedication(med)}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      className="hover:bg-teal-50"
                    >
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                        {med.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {med.presentation}
                      </div>
                      {med.riskWarning && (
                        <div style={{ fontSize: '0.7rem', color: '#e11d48', fontWeight: 600, marginTop: '2px' }}>
                          ⚠️ {med.riskWarning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interaction Risk Alert if selected medication triggers risk */}
            {currentWarning && (
              <div
                style={{
                  backgroundColor: '#fff1f2',
                  borderRadius: '0.625rem',
                  border: '1px solid #fecdd3',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.8125rem',
                  color: '#be123c',
                  fontWeight: 600
                }}
              >
                <ShieldAlert size={18} color="#e11d48" />
                <span>{currentWarning}</span>
              </div>
            )}

            {/* Form Fields: Dosis, Vía, Frecuencia, Duración */}
            <form onSubmit={handleAddMedication} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>{t('fieldDose')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="ej. 500 mg"
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>{t('fieldRoute')}</label>
                  <select
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    className="form-input"
                  >
                    <option value="Oral">Oral</option>
                    <option value="Inhalatoria">Inhalatoria</option>
                    <option value="Intravenosa">Intravenosa</option>
                    <option value="Intramuscular">Intramuscular</option>
                    <option value="Subcutánea">Subcutánea</option>
                    <option value="Tópica">Tópica</option>
                    <option value="Oftálmica">Oftálmica</option>
                    <option value="Ótica">Ótica</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>{t('fieldFrequency')}</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="form-input"
                  >
                    <option value="Cada 8 horas">Cada 8 horas</option>
                    <option value="Cada 12 horas">Cada 12 horas</option>
                    <option value="Cada 24 horas">Cada 24 horas</option>
                    <option value="Cada 6 horas">Cada 6 horas</option>
                    <option value="PRN / En caso necesario">PRN / En caso necesario</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>{t('fieldDuration')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="ej. 3 días"
                    required
                  />
                </div>
              </div>

              {/* Indicaciones Especiales */}
              <div>
                <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>{t('fieldSpecialIndications')}</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={indications}
                  onChange={(e) => setIndications(e.target.value)}
                  placeholder="Tomar con alimentos. En caso de persistir la fiebre, contactar al médico."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-secondary"
                  style={{ gap: '0.4rem', color: '#0f766e', borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' }}
                >
                  <Plus size={16} />
                  <span>{t('addMedicationBtn')}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Seguimiento y Control Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f766e' }}>
              <Calendar size={18} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {t('followUpAndControlSectionTitle')}
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">{t('nextControlAppointment')}</label>
                <input
                  type="date"
                  className="form-input"
                  value={nextControlDate}
                  onChange={(e) => setNextControlDate(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">{t('takingFrequencyLabel')}</label>
                <select
                  value={takingFrequency}
                  onChange={(e) => setTakingFrequency(e.target.value)}
                  className="form-input"
                >
                  <option value="Regular (Estándar)">Regular (Estándar)</option>
                  <option value="Intensivo">Intensivo</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                </select>
              </div>
            </div>

            {/* WhatsApp / SMS Reminders Checkbox Card */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: '0.625rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={enableDigitalReminders}
                onChange={(e) => setEnableDigitalReminders(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#0f766e', marginTop: '2px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                  {t('enableDigitalRemindersLabel')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>
                  {t('enableDigitalRemindersDesc')}
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: REALISTIC DIGITAL PRESCRIPTION SHEET (Hoja de Receta en Vivo)
            ========================================================================= */}
        <div
          id="printable-prescription"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.875rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            padding: '2rem 2.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '680px',
            position: 'relative'
          }}
        >
          <div>
            {/* Clinic Letterhead Top */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '2px solid #0f766e', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '8px',
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.25rem'
                  }}
                >
                  ✚
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    Clínica Integral
                  </h2>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0f766e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Centro Médico Especializado
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#64748b', lineHeight: 1.35 }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>Tel: 55-1234-5678</div>
                <div>Av. Reforma 245, Piso 4</div>
                <div>CDMX, México</div>
              </div>
            </div>

            {/* Doctor & Patient Two-Column Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1.5rem', padding: '0.875rem 1rem', backgroundColor: '#f8fafc', borderRadius: '0.625rem', border: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('attendingPractitionerHeader')}
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {doctorDisplayName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 600 }}>
                  {doctorSpecialty}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                  Céd. Prof: 7849201-ESP
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('patientDataHeader')}
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {fullName} ({age} {t('yearsOld', { age: '' }).trim()})
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  Folio: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#CLI-{expNumber}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Fecha: {todayFormatted}
                </div>
              </div>
            </div>

            {/* Rx Monogram Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#0f766e' }}>
              <span style={{ fontSize: '2rem', fontFamily: 'serif', fontStyle: 'italic', fontWeight: 900, lineHeight: 1 }}>
                ℞
              </span>
              <div style={{ height: '1px', flex: 1, backgroundColor: '#e2e8f0' }} />
            </div>

            {/* Numbered Prescription Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: '180px' }}>
              {prescriptionItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.875rem' }}>
                  {t('noMedicationsAddedYet')}
                </div>
              ) : (
                prescriptionItems.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      position: 'relative',
                      paddingLeft: '0.5rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a' }}>
                        {index + 1}. {item.name}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#334155', marginTop: '2px', lineHeight: 1.4 }}>
                        Tomar <strong style={{ color: '#0f766e' }}>{item.dosage}</strong> vía <strong>{item.route}</strong>, <strong style={{ color: '#0f766e' }}>{item.frequency}</strong> durante <strong>{item.duration}</strong>.
                      </div>
                      {item.indications && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '3px' }}>
                          Indicaciones: {item.indications}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '0.2rem'
                      }}
                      className="hover:text-red-600 print-hide"
                      title={t('btnDelete')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Prescription Bottom: Follow up + QR Verification + Doctor Signature */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginTop: '2rem' }}>
            {nextControlDate && (
              <div style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 700, marginBottom: '1rem' }}>
                📅 Próxima cita de control: {nextControlDate}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              {/* QR Verification Box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.6rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <QrCode size={32} color="#0f766e" />
                <div style={{ fontSize: '0.65rem', color: '#64748b', lineHeight: 1.2 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Receta Digital</div>
                  <div>FHIR R4 Verificada</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem' }}>UUID: #{expNumber}-RX</div>
                </div>
              </div>

              {/* Signature Stroke */}
              <div style={{ textAlign: 'center' }}>
                <svg width="120" height="36" viewBox="0 0 120 36">
                  <path d="M10,25 Q30,5 50,20 T90,10 T115,22" fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <div style={{ borderTop: '1px solid #cbd5e1', width: '130px', marginTop: '2px', paddingTop: '2px', fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                  Firma del Médico
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.875rem',
          border: '1px solid #e2e8f0',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <button
          onClick={() => {
            if (addToast) addToast('info', t('draftSavedToast'), t('toastCreatedTitle'));
          }}
          className="btn btn-secondary"
          style={{ fontSize: '0.8125rem' }}
        >
          <span>{t('saveDraftBtn')}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handlePrint}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem', gap: '0.4rem' }}
          >
            <Printer size={16} />
            <span>{t('printPrescriptionBtn')}</span>
          </button>

          <button
            onClick={handleSignAndSend}
            disabled={isSubmitting || prescriptionItems.length === 0}
            className="btn btn-primary"
            style={{
              backgroundColor: '#0f766e',
              boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)',
              fontSize: '0.8125rem',
              gap: '0.45rem',
              padding: '0.6rem 1.4rem'
            }}
          >
            <Send size={15} />
            <span>{isSubmitting ? t('signingPrescription') : t('signAndSendPrescriptionBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
