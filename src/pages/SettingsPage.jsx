import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Settings,
  Clock,
  Calendar,
  PartyPopper,
  UserCheck,
  Building2,
  Server,
  Save,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  CalendarRange,
  Briefcase,
  Layers,
  ChevronRight,
  Copy,
  Sun,
  Sunset,
  CalendarDays,
  CalendarPlus,
  Filter,
  Stethoscope,
  Timer,
  Zap,
  Edit3,
  UserPlus,
  LayoutGrid
} from 'lucide-react';
import {
  getClinicSchedule,
  saveClinicSchedule,
  getDateOverrides,
  setDateOverride,
  removeDateOverride,
  getClinicHolidays,
  addClinicHoliday,
  removeClinicHoliday,
  saveClinicHolidays,
  DEFAULT_HOLIDAYS,
  getDoctorLeaves,
  addDoctorLeave,
  removeDoctorLeave,
  loadScheduleFromFhir
} from '../utils/scheduleStorage';
import {
  getStaffList,
  updateStaffConsultationDuration,
  CLINICAL_ROLES,
  SHIFT_TYPES,
  getStaffFullName
} from '../utils/staffStorage';
import { useAuth } from '../context/AuthContext';
import { getPractitioners, updateProxyConfig, checkProxyHealth } from '../services/fhirApi';
import { getClinicalVaultStatus } from '../services/aiApi';
import HolidaysCalendarPicker from '../components/settings/HolidaysCalendarPicker';
import FacilitiesPage from './FacilitiesPage';
import ClinicalServicesAdmin from '../components/services/ClinicalServicesAdmin';
import PractitionerAdminModal from '../components/practitioners/PractitionerAdminModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getMenuCapabilities,
  setMenuCapabilityVisible,
  MENU_CAPABILITY_ITEMS
} from '../utils/menuCapabilitiesStorage';
import {
  getClinicIntegrativeModalities,
  setClinicIntegrativeModalityEnabled,
  CLINIC_SEARCH_MODALITIES,
  INTEGRATIVE_MODALITIES
} from '../utils/integrativeMedicine';

export default function SettingsPage({ addToast, serverInfo, onConfigUpdated, defaultTab }) {
  const { t, locale, language } = useLanguage();
  const location = useLocation();

  const getInitialTab = () => {
    if (defaultTab) return defaultTab;
    try {
      const params = new URLSearchParams(location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['schedule', 'services', 'holidays', 'leaves', 'facilities', 'fhir', 'menu'].includes(tabParam)) {
        return tabParam;
      }
    } catch (e) {}
    return 'schedule';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [menuCapabilities, setMenuCapabilities] = useState(() => getMenuCapabilities());
  const [clinicModalities, setClinicModalities] = useState(() => getClinicIntegrativeModalities());

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['schedule', 'services', 'holidays', 'leaves', 'facilities', 'fhir', 'menu'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    } catch (e) {}
  }, [location.search]);

  // Auth Context & Doctor Consultation Duration State
  const { currentUser, updateConsultationDuration, savePractitioner, deletePractitioner } = useAuth();
  const [staffDirectory, setStaffDirectory] = useState(() => getStaffList());
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorRoleFilter, setDoctorRoleFilter] = useState('all');

  // Practitioner CRUD Modal States
  const [practitionerModal, setPractitionerModal] = useState({ isOpen: false, practitioner: null });
  const [practitionerDeleteModal, setPractitionerDeleteModal] = useState({ isOpen: false, practitioner: null });

  // Filtered staff list for duration table
  const filteredStaff = useMemo(() => {
    return staffDirectory.filter(s => {
      if (doctorRoleFilter !== 'all' && !s.roles?.includes(doctorRoleFilter) && s.primaryRole !== doctorRoleFilter) {
        return false;
      }
      if (doctorSearch.trim()) {
        const q = doctorSearch.toLowerCase().trim();
        const fullName = getStaffFullName(s).toLowerCase();
        const spec = (s.specialty || '').toLowerCase();
        const email = (s.email || '').toLowerCase();
        return fullName.includes(q) || spec.includes(q) || email.includes(q);
      }
      return true;
    });
  }, [staffDirectory, doctorRoleFilter, doctorSearch]);

  // Handle updating a doctor's default consultation duration
  const handleUpdateDoctorDuration = (staffId, minutes) => {
    const numMinutes = Number(minutes) || 30;
    updateStaffConsultationDuration(staffId, numMinutes);
    if (updateConsultationDuration) {
      updateConsultationDuration(staffId, numMinutes);
    }
    const freshList = getStaffList();
    setStaffDirectory(freshList);
    const doc = freshList.find(s => s.id === staffId);
    if (addToast && doc) {
      const name = getStaffFullName(doc);
      addToast(
        'success',
        language === 'en'
          ? `Consultation duration for ${name} set to ${numMinutes} min`
          : `Tiempo de consulta de ${name} actualizado a ${numMinutes} min`,
        language === 'en' ? 'Duration Saved' : 'Duración Guardada'
      );
    }
  };

  // Handle saving (create or update) practitioner
  const handleSavePractitioner = (practitionerData) => {
    const updated = savePractitioner(practitionerData);
    setStaffDirectory(updated);
    setPractitionerModal({ isOpen: false, practitioner: null });
    getPractitioners().then(docs => setPractitioners(docs || []));
    if (addToast) {
      const name = getStaffFullName(practitionerData);
      addToast(
        'success',
        language === 'en' ? `Practitioner ${name} saved successfully` : `Profesional ${name} guardado exitosamente`,
        language === 'en' ? 'Practitioner Saved' : 'Profesional Guardado'
      );
    }
  };

  // Handle requesting practitioner deletion
  const handleDeletePractitioner = (staff) => {
    if (currentUser?.id === staff.id) {
      if (addToast) {
        addToast(
          'error',
          language === 'en' ? 'Cannot delete your own active user account' : 'No puedes eliminar tu propio usuario activo',
          'Acción Denegada'
        );
      }
      return;
    }
    const name = getStaffFullName(staff);
    setPractitionerDeleteModal({
      isOpen: true,
      practitioner: staff
    });
  };

  // Handle confirmed deletion of practitioner
  const handleConfirmDeletePractitioner = () => {
    if (!practitionerDeleteModal.practitioner) return;
    const staff = practitionerDeleteModal.practitioner;
    const name = getStaffFullName(staff);
    const updated = deletePractitioner(staff.id);
    setStaffDirectory(updated);
    setPractitionerDeleteModal({ isOpen: false, practitioner: null });
    getPractitioners().then(docs => setPractitioners(docs || []));
    if (addToast) {
      addToast(
        'info',
        language === 'en' ? `Practitioner ${name} removed from directory` : `Profesional ${name} eliminado del directorio`,
        language === 'en' ? 'Practitioner Removed' : 'Profesional Eliminado'
      );
    }
  };

  // 1. Working Schedule State
  const [schedule, setSchedule] = useState(getClinicSchedule());
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // 2. Date-Specific Working Hours Overrides State
  const [dateOverrides, setDateOverrides] = useState(getDateOverrides());
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideEnabled, setOverrideEnabled] = useState(true);
  const [overrideStart, setOverrideStart] = useState('08:00');
  const [overrideEnd, setOverrideEnd] = useState('16:00');
  const [overrideHasSplit, setOverrideHasSplit] = useState(false);
  const [overrideStartAfternoon, setOverrideStartAfternoon] = useState('17:00');
  const [overrideEndAfternoon, setOverrideEndAfternoon] = useState('20:00');
  const [overrideReason, setOverrideReason] = useState('');
  const [overridePractitionerId, setOverridePractitionerId] = useState('all');

  // 3. Holidays State
  const [holidays, setHolidays] = useState(getClinicHolidays());
  const [manualHolidayDate, setManualHolidayDate] = useState('');
  const [manualHolidayName, setManualHolidayName] = useState('');

  // 4. Doctor Leaves State
  const [doctorLeaves, setDoctorLeaves] = useState(getDoctorLeaves());
  const [practitioners, setPractitioners] = useState([]);
  const [leaveDoctorId, setLeaveDoctorId] = useState('all');
  const [leaveReason, setLeaveReason] = useState('Congreso');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveNotes, setLeaveNotes] = useState('');

  // 5. FHIR Server State
  const [fhirUrl, setFhirUrl] = useState(serverInfo?.serverUrl || '');
  const [fhirToken, setFhirToken] = useState('');
  const [isSavingFhir, setIsSavingFhir] = useState(false);
  const [fhirStatusMsg, setFhirStatusMsg] = useState(null);
  const [vaultStatus, setVaultStatus] = useState(null);

  useEffect(() => {
    getClinicalVaultStatus(language)
      .then(setVaultStatus)
      .catch(() => setVaultStatus({ exists: false, noteCount: 0 }));
  }, [language]);

  // Load practitioners
  useEffect(() => {
    getPractitioners()
      .then(docs => {
        setPractitioners(docs || []);
      })
      .catch(console.error);
    loadScheduleFromFhir()
      .then((data) => {
        if (data.schedule) setSchedule(data.schedule);
        if (data.overrides) setDateOverrides(data.overrides);
        if (data.holidays) setHolidays(data.holidays);
        if (data.leaves) setDoctorLeaves(data.leaves);
      })
      .catch(() => {});
  }, []);

  // Update schedule day toggle
  const handleToggleDay = (dayKey) => {
    setSchedule(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...prev.days[dayKey],
          enabled: !prev.days[dayKey].enabled
        }
      }
    }));
  };

  // Update schedule day hours
  const handleDayHourChange = (dayKey, field, value) => {
    setSchedule(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...prev.days[dayKey],
          [field]: value
        }
      }
    }));
  };

  // Toggle split shift for a day
  const handleToggleSplitShift = (dayKey) => {
    setSchedule(prev => {
      const current = prev.days[dayKey];
      const hasSplit = !current.hasSplit;
      return {
        ...prev,
        days: {
          ...prev.days,
          [dayKey]: {
            ...current,
            hasSplit,
            startAfternoon: current.startAfternoon || '16:00',
            endAfternoon: current.endAfternoon || '20:00'
          }
        }
      };
    });
  };

  // Copy schedule from one day to all weekdays (Lunes a Viernes)
  const handleCopyDaySchedule = (sourceDayKey) => {
    const source = schedule.days[sourceDayKey];
    if (!source) return;

    setSchedule(prev => {
      const newDays = { ...prev.days };
      [1, 2, 3, 4, 5].forEach(key => {
        newDays[key] = {
          ...newDays[key],
          enabled: source.enabled,
          start: source.start,
          end: source.end,
          hasSplit: source.hasSplit,
          startAfternoon: source.startAfternoon,
          endAfternoon: source.endAfternoon
        };
      });
      return { ...prev, days: newDays };
    });

    if (addToast) {
      addToast('info', t('copiedScheduleToast'), t('toastUpdatedTitle'));
    }
  };

  // Save Working Schedule
  const handleSaveSchedule = (e) => {
    e.preventDefault();
    setIsSavingSchedule(true);
    saveClinicSchedule(schedule);
    setTimeout(() => {
      setIsSavingSchedule(false);
      if (addToast) {
        addToast('success', t('scheduleSavedToast'), t('toastUpdatedTitle'));
      }
    }, 400);
  };

  // Date Overrides Actions (Cambiar horario de cualquier día concreto)
  const handleAddDateOverride = (e) => {
    e.preventDefault();
    if (!overrideDate) return;

    let practitionerName = t('allClinicStaff');
    if (overridePractitionerId !== 'all') {
      const doc = practitioners.find(p => p.id === overridePractitionerId);
      if (doc) {
        const prefix = doc.name?.[0]?.prefix?.[0] || 'Dr.';
        const given = doc.name?.[0]?.given?.join(' ') || '';
        const family = doc.name?.[0]?.family || '';
        practitionerName = `${prefix} ${given} ${family}`.trim();
      }
    }

    const updated = setDateOverride({
      date: overrideDate,
      enabled: overrideEnabled,
      start: overrideStart,
      end: overrideEnd,
      hasSplit: overrideHasSplit,
      startAfternoon: overrideStartAfternoon,
      endAfternoon: overrideEndAfternoon,
      reason: overrideReason.trim() || (overrideEnabled ? 'Horario especial de atención' : 'Cerrado extraordinario'),
      practitionerId: overridePractitionerId,
      practitionerName
    });

    setDateOverrides(updated);
    setOverrideDate('');
    setOverrideReason('');
    setOverrideHasSplit(false);

    if (addToast) {
      addToast('success', t('dateOverrideAddedToast'), t('toastCreatedTitle'));
    }
  };

  const handleRemoveDateOverride = (overrideId) => {
    const updated = removeDateOverride(overrideId);
    setDateOverrides(updated);
    if (addToast) {
      addToast('info', t('dateOverrideRemovedToast'), t('toastDeletedTitle'));
    }
  };

  // Holidays Actions
  const handleAddManualHoliday = (e) => {
    e.preventDefault();
    if (!manualHolidayDate || !manualHolidayName.trim()) return;
    const updated = addClinicHoliday({
      date: manualHolidayDate,
      name: manualHolidayName.trim()
    });
    setHolidays(updated);
    setManualHolidayDate('');
    setManualHolidayName('');
    if (addToast) {
      addToast('success', t('holidayAddedToast'), t('toastCreatedTitle'));
    }
  };

  const handleRemoveHoliday = (holidayId) => {
    const updated = removeClinicHoliday(holidayId);
    setHolidays(updated);
    if (addToast) {
      addToast('info', t('holidayRemovedToast'), t('toastDeletedTitle'));
    }
  };

  const handleLoadOfficialHolidays = () => {
    saveClinicHolidays(DEFAULT_HOLIDAYS);
    setHolidays(DEFAULT_HOLIDAYS);
    if (addToast) {
      addToast('success', t('officialHolidaysLoadedToast'), t('toastCreatedTitle'));
    }
  };

  // Doctor Leave Actions
  const handleAddDoctorLeave = (e) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate) return;

    let doctorName = t('allDoctors');
    if (leaveDoctorId !== 'all') {
      const doc = practitioners.find(p => p.id === leaveDoctorId);
      if (doc) {
        const prefix = doc.name?.[0]?.prefix?.[0] || 'Dr.';
        const given = doc.name?.[0]?.given?.join(' ') || '';
        const family = doc.name?.[0]?.family || '';
        doctorName = `${prefix} ${given} ${family}`.trim();
      }
    }

    const updated = addDoctorLeave({
      practitionerId: leaveDoctorId,
      practitionerName: doctorName,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason: leaveReason,
      notes: leaveNotes.trim()
    });

    setDoctorLeaves(updated);
    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveNotes('');
    if (addToast) {
      addToast('success', t('doctorLeaveAddedToast'), t('toastCreatedTitle'));
    }
  };

  const handleRemoveDoctorLeave = (leaveId) => {
    const updated = removeDoctorLeave(leaveId);
    setDoctorLeaves(updated);
    if (addToast) {
      addToast('info', t('doctorLeaveRemovedToast'), t('toastDeletedTitle'));
    }
  };

  // FHIR Server Save
  const handleSaveFhirSettings = async (e) => {
    e.preventDefault();
    setIsSavingFhir(true);
    setFhirStatusMsg(null);

    try {
      await updateProxyConfig(fhirUrl, fhirToken || undefined);
      const updatedHealth = await checkProxyHealth();
      setFhirStatusMsg({ type: 'success', text: t('settingsSuccess') });
      if (onConfigUpdated) onConfigUpdated(updatedHealth);
      if (addToast) {
        addToast('success', t('settingsSuccess'), t('toastUpdatedTitle'));
      }
    } catch (err) {
      setFhirStatusMsg({ type: 'error', text: err.message || 'Failed to update settings.' });
    } finally {
      setIsSavingFhir(false);
    }
  };

  const tabs = [
    { id: 'schedule', label: t('tabClinicSchedule'), icon: Clock },
    { id: 'services', label: t('tabClinicalServices') || 'Servicios Clínicos & Diagnósticos', icon: Stethoscope },
    { id: 'holidays', label: `${t('tabHolidays')} (${holidays.length})`, icon: PartyPopper },
    { id: 'leaves', label: `${t('tabDoctorLeaves')} (${doctorLeaves.length})`, icon: UserCheck },
    { id: 'facilities', label: t('tabFacilities') || 'Planteles & Sedes', icon: Building2 },
    { id: 'menu', label: t('tabMenuCapabilities') || 'Menú y módulos', icon: LayoutGrid },
    { id: 'fhir', label: t('tabFhirConnection'), icon: Server }
  ];

  const daysList = [
    { key: 1, label: t('dayMondayFull') },
    { key: 2, label: t('dayTuesdayFull') },
    { key: 3, label: t('dayWednesdayFull') },
    { key: 4, label: t('dayThursdayFull') },
    { key: 5, label: t('dayFridayFull') },
    { key: 6, label: t('daySaturdayFull') },
    { key: 0, label: t('daySundayFull') }
  ];

  return (
    <div style={{ padding: '1.75rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#059669'
          }}
        >
          <Settings size={22} strokeWidth={2.5} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            {t('settingsPageTitle')}
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {t('settingsPageSubtitle')}
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1.75rem',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 0.5rem',
                border: 'none',
                background: 'transparent',
                fontSize: '0.9375rem',
                fontWeight: isActive ? 800 : 600,
                color: isActive ? '#0f766e' : '#64748b',
                borderBottom: isActive ? '3px solid #0f766e' : '3px solid transparent',
                cursor: 'pointer',
                marginBottom: '-2px',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={17} color={isActive ? '#0f766e' : '#64748b'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: HORARIOS DE ATENCIÓN (SEMANAL + EXCEPCIONES POR CUALQUIER DÍA)
          ========================================================================= */}
      {activeTab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Formulario de Horarios Semanales Estándar */}
          <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* General Consultation Settings */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                {t('generalScheduleSettingsTitle')}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
                {t('generalScheduleSettingsDesc')}
              </p>

              <div style={{ maxWidth: '320px' }}>
                <label className="form-label">{t('slotDurationLabel')}</label>
                <select
                  value={schedule.slotDurationMinutes}
                  onChange={(e) => setSchedule(prev => ({ ...prev, slotDurationMinutes: Number(e.target.value) }))}
                  className="form-input"
                >
                  <option value={15}>15 minutos</option>
                  <option value={20}>20 minutos</option>
                  <option value={30}>30 minutos (Estándar)</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos (1 hora)</option>
                </select>
              </div>
            </div>

            {/* =========================================================================
                DOCTOR DEFAULT CONSULTATION DURATION SECTION
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Timer size={17} strokeWidth={2.5} />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {t('doctorConsultationDurationsTitle')}
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0 0' }}>
                    {t('doctorConsultationDurationsSubtitle')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPractitionerModal({ isOpen: true, practitioner: null })}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#0f766e', fontSize: '0.8125rem', gap: '0.4rem', padding: '0.5rem 1rem' }}
                >
                  <UserPlus size={15} strokeWidth={2.5} />
                  <span>{language === 'en' ? '+ Register Practitioner' : '+ Registrar Profesional'}</span>
                </button>
              </div>

              {/* Quick Card for Logged-In Doctor (if currentUser exists) */}
              {currentUser && (
                <div
                  style={{
                    padding: '1.15rem 1.25rem',
                    borderRadius: '0.75rem',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: currentUser.avatarBg || '#0f766e',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.875rem',
                        flexShrink: 0,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      {currentUser.givenName?.[0]}{currentUser.familyName?.[0]}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.925rem', fontWeight: 800, color: '#0f172a' }}>
                          {getStaffFullName(currentUser)}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0'
                          }}
                        >
                          {language === 'en' ? 'My Profile' : 'Mi Usuario Activo'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0 0' }}>
                        {currentUser.specialty || 'Profesional Clínico'} • {language === 'en' ? 'My current duration:' : 'Mi duración actual:'} <strong style={{ color: '#0f766e', fontSize: '0.8125rem' }}>{currentUser.shiftInfo?.consultationDurationMin || 30} min</strong>
                      </p>
                    </div>
                  </div>

                  {/* Quick Duration Buttons for active Doctor */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', marginRight: '0.25rem' }}>
                      {language === 'en' ? 'Change my duration:' : 'Ajustar mi duración:'}
                    </span>
                    {[15, 20, 30, 45, 60, 90].map((dur) => {
                      const isSelected = (currentUser.shiftInfo?.consultationDurationMin || 30) === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => handleUpdateDoctorDuration(currentUser.id, dur)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.8rem',
                            fontWeight: isSelected ? 800 : 600,
                            border: isSelected ? '1px solid #0f766e' : '1px solid #cbd5e1',
                            backgroundColor: isSelected ? '#0f766e' : '#ffffff',
                            color: isSelected ? '#ffffff' : '#334155',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <span>{dur} min</span>
                          {isSelected && <Check size={13} strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Filter and Search Bar for Doctor Table */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '280px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.8125rem', height: '36px', paddingLeft: '2rem' }}
                    placeholder={language === 'en' ? 'Search practitioner by name or specialty...' : 'Buscar médico o especialista...'}
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                  />
                  <Filter size={13} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    {language === 'en' ? 'Filter by role:' : 'Filtrar por rol:'}
                  </span>
                  <select
                    className="form-input"
                    style={{ fontSize: '0.8125rem', height: '36px', padding: '0 0.5rem' }}
                    value={doctorRoleFilter}
                    onChange={(e) => setDoctorRoleFilter(e.target.value)}
                  >
                    <option value="all">{language === 'en' ? 'All Roles' : 'Todos los Roles'}</option>
                    <option value="doctor">{language === 'en' ? 'Physicians / Doctors' : 'Médicos'}</option>
                    <option value="therapist">{language === 'en' ? 'Therapists' : 'Terapeutas'}</option>
                    <option value="nurse">{language === 'en' ? 'Nursing' : 'Enfermería'}</option>
                    <option value="lab">{language === 'en' ? 'Lab Techs' : 'Laboratoristas'}</option>
                  </select>
                </div>
              </div>

              {/* Table of Practitioners and their Consultation Durations */}
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.625rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>
                        {language === 'en' ? 'Practitioner' : 'Profesional'}
                      </th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>
                        {language === 'en' ? 'Specialty / Role' : 'Especialidad / Rol'}
                      </th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>
                        {language === 'en' ? 'Shift & Hours' : 'Turno y Horario'}
                      </th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>
                        {language === 'en' ? 'Default Duration' : 'Duración Esperada'}
                      </th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>
                        {language === 'en' ? 'Est. Appts / Shift' : 'Citas Estimadas / Jornada'}
                      </th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>
                        {language === 'en' ? 'Actions' : 'Acciones'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((staff) => {
                      const duration = staff.shiftInfo?.consultationDurationMin || 30;
                      const shiftType = SHIFT_TYPES[staff.shiftInfo?.shiftType] || SHIFT_TYPES.morning;
                      const isMe = currentUser?.id === staff.id;

                      // Calculate estimated appointments in a standard 7-8h shift
                      const estAppts = Math.floor((7 * 60) / duration);

                      return (
                        <tr
                          key={staff.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isMe ? '#f0fdf4' : 'transparent',
                            transition: 'background-color 0.12s ease'
                          }}
                        >
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  backgroundColor: staff.avatarBg || '#0f766e',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  flexShrink: 0
                                }}
                              >
                                {staff.givenName?.[0]}{staff.familyName?.[0]}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                  {getStaffFullName(staff)} {isMe && <span style={{ color: '#059669', fontSize: '0.7rem', fontWeight: 700 }}>(Tú)</span>}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                  {staff.license || staff.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 600, color: '#334155' }}>
                              {staff.specialty || 'Medicina'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: CLINICAL_ROLES[staff.primaryRole]?.color || '#0d9488', fontWeight: 600 }}>
                              {language === 'en' ? CLINICAL_ROLES[staff.primaryRole]?.labelEn : CLINICAL_ROLES[staff.primaryRole]?.labelEs}
                            </div>
                          </td>

                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                backgroundColor: shiftType.bgColor,
                                color: shiftType.color
                              }}
                            >
                              {language === 'en' ? shiftType.labelEn : shiftType.labelEs}
                            </span>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                              {staff.shiftInfo?.startTime || '08:00'} - {staff.shiftInfo?.endTime || '16:00'}
                            </div>
                          </td>

                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <select
                                value={duration}
                                onChange={(e) => handleUpdateDoctorDuration(staff.id, Number(e.target.value))}
                                style={{
                                  padding: '0.35rem 0.6rem',
                                  borderRadius: '0.5rem',
                                  fontSize: '0.8125rem',
                                  fontWeight: 700,
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  color: '#0f766e',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value={10}>10 min</option>
                                <option value={15}>15 min</option>
                                <option value={20}>20 min</option>
                                <option value={25}>25 min</option>
                                <option value={30}>30 min (Estándar)</option>
                                <option value={40}>40 min</option>
                                <option value={45}>45 min</option>
                                <option value={50}>50 min</option>
                                <option value={60}>60 min (1 hora)</option>
                                <option value={90}>90 min (1.5 h)</option>
                                <option value={120}>120 min (2 h)</option>
                              </select>
                            </div>
                          </td>

                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontWeight: 800, color: '#0f766e', fontSize: '0.9rem' }}>
                                ~{estAppts}
                              </span>
                              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                {language === 'en' ? 'appts / shift' : 'citas / día'}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() => setPractitionerModal({ isOpen: true, practitioner: staff })}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 8px', gap: '3px', color: '#0f766e', borderColor: '#99f6e4' }}
                                title={language === 'en' ? 'Edit practitioner' : 'Editar profesional'}
                              >
                                <Edit3 size={12} />
                                <span>{language === 'en' ? 'Edit' : 'Editar'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeletePractitioner(staff)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#94a3b8',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                                title={language === 'en' ? 'Delete practitioner' : 'Eliminar profesional'}
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

            {/* Days of the Week Schedule */}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {t('weeklyWorkingDaysTitle')}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                    Configura las horas de apertura, cierre y turnos vespertinos para cada día habitual.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {daysList.map(({ key, label }) => {
                  const dayConfig = schedule.days?.[key] || { enabled: false, start: '08:00', end: '18:00', hasSplit: false, startAfternoon: '16:00', endAfternoon: '20:00' };

                  return (
                    <div
                      key={key}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '0.75rem',
                        border: dayConfig.enabled ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                        backgroundColor: dayConfig.enabled ? '#f0fdf4' : '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        {/* Day Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '160px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={dayConfig.enabled}
                              onChange={() => handleToggleDay(key)}
                              style={{ width: '18px', height: '18px', accentColor: '#0f766e', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.9375rem', fontWeight: dayConfig.enabled ? 800 : 500, color: dayConfig.enabled ? '#0f172a' : '#64748b' }}>
                              {label}
                            </span>
                          </label>
                        </div>

                        {/* Hours Ranges & Actions */}
                        {dayConfig.enabled ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            {/* Turno Matutino / Principal */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#ffffff', padding: '4px 8px', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                              <Sun size={14} color="#f59e0b" />
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('startTime')}:</span>
                              <input
                                type="time"
                                className="form-input"
                                value={dayConfig.start || '08:00'}
                                onChange={(e) => handleDayHourChange(key, 'start', e.target.value)}
                                style={{ width: '105px', height: '32px', fontSize: '0.8125rem', padding: '2px 6px' }}
                              />
                              <span style={{ color: '#94a3b8' }}>—</span>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('endTime')}:</span>
                              <input
                                type="time"
                                className="form-input"
                                value={dayConfig.end || '18:00'}
                                onChange={(e) => handleDayHourChange(key, 'end', e.target.value)}
                                style={{ width: '105px', height: '32px', fontSize: '0.8125rem', padding: '2px 6px' }}
                              />
                            </div>

                            {/* Split Shift Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleSplitShift(key)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '4px 10px',
                                borderRadius: '0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                border: dayConfig.hasSplit ? '1px solid #0d9488' : '1px solid #cbd5e1',
                                backgroundColor: dayConfig.hasSplit ? '#ccfbf1' : '#ffffff',
                                color: dayConfig.hasSplit ? '#0f766e' : '#64748b',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Sunset size={14} />
                              <span>{dayConfig.hasSplit ? 'Turno vespertino activo' : '+ Turno vespertino'}</span>
                            </button>

                            {/* Copy to weekdays button */}
                            {key >= 1 && key <= 5 && (
                              <button
                                type="button"
                                onClick={() => handleCopyDaySchedule(key)}
                                title={t('copyScheduleToWeekdays')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '4px 8px',
                                  borderRadius: '0.5rem',
                                  fontSize: '0.75rem',
                                  color: '#0d9488',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #99f6e4',
                                  cursor: 'pointer'
                                }}
                              >
                                <Copy size={13} />
                                <span>Copiar a L-V</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            {t('closedDay')}
                          </span>
                        )}
                      </div>

                      {/* Turno Vespertino Detallado (si está activo) */}
                      {dayConfig.enabled && dayConfig.hasSplit && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem 0.75rem',
                            backgroundColor: '#ffffff',
                            borderRadius: '0.5rem',
                            border: '1px dashed #0d9488',
                            marginLeft: '1.75rem',
                            maxWidth: '480px'
                          }}
                        >
                          <Sunset size={15} color="#0d9488" />
                          <span style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 700 }}>
                            {t('afternoonShift')}:
                          </span>
                          <input
                            type="time"
                            className="form-input"
                            value={dayConfig.startAfternoon || '16:00'}
                            onChange={(e) => handleDayHourChange(key, 'startAfternoon', e.target.value)}
                            style={{ width: '105px', height: '30px', fontSize: '0.8125rem', padding: '2px 6px' }}
                          />
                          <span style={{ color: '#94a3b8' }}>—</span>
                          <input
                            type="time"
                            className="form-input"
                            value={dayConfig.endAfternoon || '20:00'}
                            onChange={(e) => handleDayHourChange(key, 'endAfternoon', e.target.value)}
                            style={{ width: '105px', height: '30px', fontSize: '0.8125rem', padding: '2px 6px' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={isSavingSchedule}
                className="btn btn-primary"
                style={{ backgroundColor: '#0f766e', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
              >
                <Save size={16} />
                <span>{isSavingSchedule ? t('savingSettings') : t('saveScheduleBtn')}</span>
              </button>
            </div>
          </form>

          {/* =========================================================================
              SECCIÓN: CAMBIAR HORARIO DE CUALQUIER DÍA CONCRETO (EXCEPCIONES POR FECHA)
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
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CalendarDays size={20} color="#0d9488" />
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {t('dateOverridesSectionTitle')}
                  </h3>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem', marginBottom: 0 }}>
                  {t('dateOverridesSectionDesc')}
                </p>
              </div>

              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: '#f0fdfa',
                  color: '#0f766e',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: '1px solid #99f6e4'
                }}
              >
                {dateOverrides.length} {dateOverrides.length === 1 ? 'día con horario especial' : 'días con horario especial'}
              </span>
            </div>

            {/* Formulario para Registrar Horario Especial para un Día Específico */}
            <form
              onSubmit={handleAddDateOverride}
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CalendarPlus size={16} color="#0f766e" />
                <span>{t('addDateOverrideTitle')}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {/* 1. Selector de Fecha Específica */}
                <div>
                  <label className="form-label">{t('fieldSpecificDate')} *</label>
                  <input
                    type="date"
                    required
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                {/* 2. Tipo de Horario (Abierto con horario especial o Cerrado) */}
                <div>
                  <label className="form-label">Estado de Atención</label>
                  <select
                    value={overrideEnabled ? 'open' : 'closed'}
                    onChange={(e) => setOverrideEnabled(e.target.value === 'open')}
                    className="form-input"
                  >
                    <option value="open">{t('specialHoursTypeWorking')}</option>
                    <option value="closed">{t('specialHoursTypeClosed')}</option>
                  </select>
                </div>

                {/* 3. Profesional / Personal aplicable */}
                <div>
                  <label className="form-label">{t('appliesToPractitioner')}</label>
                  <select
                    value={overridePractitionerId}
                    onChange={(e) => setOverridePractitionerId(e.target.value)}
                    className="form-input"
                  >
                    <option value="all">{t('allClinicStaff')}</option>
                    {practitioners.map(doc => {
                      const prefix = doc.name?.[0]?.prefix?.[0] || 'Dr.';
                      const given = doc.name?.[0]?.given?.join(' ') || '';
                      const family = doc.name?.[0]?.family || '';
                      const name = `${prefix} ${given} ${family}`.trim() || `Doctor (${doc.id})`;
                      return (
                        <option key={doc.id} value={doc.id}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Horas configurables si está abierto */}
              {overrideEnabled && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', backgroundColor: '#ffffff', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sun size={15} color="#f59e0b" />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Turno Principal:</span>
                    <input
                      type="time"
                      value={overrideStart}
                      onChange={(e) => setOverrideStart(e.target.value)}
                      className="form-input"
                      style={{ width: '110px', height: '34px', fontSize: '0.8125rem' }}
                    />
                    <span style={{ color: '#94a3b8' }}>—</span>
                    <input
                      type="time"
                      value={overrideEnd}
                      onChange={(e) => setOverrideEnd(e.target.value)}
                      className="form-input"
                      style={{ width: '110px', height: '34px', fontSize: '0.8125rem' }}
                    />
                  </div>

                  {/* Toggle Split Shift */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: '#0f766e', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
                    <input
                      type="checkbox"
                      checked={overrideHasSplit}
                      onChange={(e) => setOverrideHasSplit(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#0f766e' }}
                    />
                    <span>{t('splitShiftToggle')}</span>
                  </label>

                  {overrideHasSplit && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', paddingTop: '0.5rem', borderTop: '1px dashed #e2e8f0' }}>
                      <Sunset size={15} color="#0d9488" />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f766e' }}>{t('afternoonShift')}:</span>
                      <input
                        type="time"
                        value={overrideStartAfternoon}
                        onChange={(e) => setOverrideStartAfternoon(e.target.value)}
                        className="form-input"
                        style={{ width: '110px', height: '34px', fontSize: '0.8125rem' }}
                      />
                      <span style={{ color: '#94a3b8' }}>—</span>
                      <input
                        type="time"
                        value={overrideEndAfternoon}
                        onChange={(e) => setOverrideEndAfternoon(e.target.value)}
                        className="form-input"
                        style={{ width: '110px', height: '34px', fontSize: '0.8125rem' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Motivo o descripción */}
              <div>
                <label className="form-label">{t('specialHoursReasonLabel')}</label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder={t('specialHoursReasonPlaceholder')}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#0d9488', gap: '0.4rem' }}
                >
                  <Plus size={16} />
                  <span>{t('addSpecialScheduleBtn')}</span>
                </button>
              </div>
            </form>

            {/* Listado de Días con Horarios Especiales Programados */}
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem' }}>
                {t('registeredDateOverridesTitle')}
              </h4>

              {dateOverrides.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '0.875rem' }}>
                  {t('noDateOverridesRegistered')}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
                  {dateOverrides.map(item => {
                    return (
                      <div
                        key={item.id}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.75rem',
                          padding: '0.875rem 1rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                              {item.date}
                            </span>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                backgroundColor: item.enabled ? '#ccfbf1' : '#ffe4e6',
                                color: item.enabled ? '#0f766e' : '#be123c'
                              }}
                            >
                              {item.enabled ? 'Horario Especial' : 'Cerrado'}
                            </span>
                          </div>

                          {item.enabled ? (
                            <div style={{ fontSize: '0.8125rem', color: '#0d9488', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                              <Clock size={13} />
                              <span>{item.start} - {item.end}</span>
                              {item.hasSplit && (
                                <span style={{ color: '#0f766e', fontWeight: 600 }}>
                                  y {item.startAfternoon} - {item.endAfternoon}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#be123c', fontWeight: 600, marginBottom: '0.25rem' }}>
                              Día No Laborable Extraordinario
                            </div>
                          )}

                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            <strong>Motivo:</strong> {item.reason}
                          </div>

                          {item.practitionerName && item.practitionerName !== t('allClinicStaff') && (
                            <div style={{ fontSize: '0.6875rem', color: '#7c3aed', fontWeight: 600, marginTop: '2px' }}>
                              Personal: {item.practitionerName}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveDateOverride(item.id)}
                          title="Eliminar este horario especial"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            transition: 'color 0.15s ease'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: DÍAS FESTIVOS DE LA CLÍNICA
          ========================================================================= */}
      {activeTab === 'holidays' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(360px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left: Interactive Holiday Calendar */}
          <div>
            <HolidaysCalendarPicker
              holidays={holidays}
              onAddHoliday={(newH) => {
                const updated = addClinicHoliday(newH);
                setHolidays(updated);
                if (addToast) addToast('success', t('holidayAddedToast'), t('toastCreatedTitle'));
              }}
              onRemoveHoliday={(hId) => handleRemoveHoliday(hId)}
            />
          </div>

          {/* Right: Holiday List & Manual Form */}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  {t('registeredHolidaysTitle')}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {holidays.length} {t('holidaysCount')}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLoadOfficialHolidays}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#0f766e' }}
              >
                <Sparkles size={14} />
                <span>{t('loadOfficialHolidaysBtn')}</span>
              </button>
            </div>

            {/* Manual Holiday Form */}
            <form onSubmit={handleAddManualHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.625rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
                {t('addManualHolidayTitle')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="date"
                  required
                  value={manualHolidayDate}
                  onChange={(e) => setManualHolidayDate(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.8125rem' }}
                />
                <input
                  type="text"
                  required
                  value={manualHolidayName}
                  onChange={(e) => setManualHolidayName(e.target.value)}
                  placeholder={t('holidayNamePlaceholder')}
                  className="form-input"
                  style={{ fontSize: '0.8125rem' }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#0f766e', padding: '0.5rem 0.875rem' }}
                >
                  <Plus size={16} />
                  <span>{t('addBtn')}</span>
                </button>
              </div>
            </form>

            {/* Holidays List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '380px', overflowY: 'auto' }}>
              {holidays.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No hay días festivos configurados.
                </div>
              ) : (
                holidays.map(h => (
                  <div
                    key={h.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.875rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f766e', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
                        {h.date}
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                        {h.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveHoliday(h.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: DÍAS NO LABORABLES POR MÉDICO (CONGRESOS, VACACIONES, ETC)
          ========================================================================= */}
      {activeTab === 'leaves' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Register Leave Form */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
              {t('registerDoctorLeaveTitle')}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              {t('registerDoctorLeaveDesc')}
            </p>

            <form onSubmit={handleAddDoctorLeave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Doctor Selection */}
                <div>
                  <label className="form-label">{t('fieldPractitioner')}</label>
                  <select
                    value={leaveDoctorId}
                    onChange={(e) => setLeaveDoctorId(e.target.value)}
                    className="form-input"
                  >
                    <option value="all">{t('allDoctors')}</option>
                    {practitioners.map(doc => {
                      const prefix = doc.name?.[0]?.prefix?.[0] || 'Dr.';
                      const given = doc.name?.[0]?.given?.join(' ') || '';
                      const family = doc.name?.[0]?.family || '';
                      const name = `${prefix} ${given} ${family}`.trim() || `Doctor (${doc.id})`;
                      return (
                        <option key={doc.id} value={doc.id}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label className="form-label">{t('leaveReasonLabel')}</label>
                  <select
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    className="form-input"
                  >
                    <option value="Congreso">{t('reasonCongress')}</option>
                    <option value="Vacaciones">{t('reasonVacation')}</option>
                    <option value="Incapacidad">{t('reasonMedicalLeave')}</option>
                    <option value="Permiso Personal">{t('reasonPersonal')}</option>
                    <option value="Otro">{t('reasonOther')}</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="form-label">{t('startDate')} *</label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="form-label">{t('endDate')} *</label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">{t('leaveNotesLabel')}</label>
                <input
                  type="text"
                  value={leaveNotes}
                  onChange={(e) => setLeaveNotes(e.target.value)}
                  placeholder={t('leaveNotesPlaceholder')}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#0f766e', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
                >
                  <Plus size={16} />
                  <span>{t('registerLeaveBtn')}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Registered Doctor Leaves */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {t('registeredLeavesTitle')}
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {doctorLeaves.length} ausencias registradas
              </span>
            </div>

            {doctorLeaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                {t('noDoctorLeavesRegistered')}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {doctorLeaves.map(leave => {
                  return (
                    <div
                      key={leave.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a' }}>
                            {leave.practitionerName}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1'
                            }}
                          >
                            {leave.reason}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.8125rem', color: '#0f766e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                          <CalendarRange size={14} />
                          <span>{leave.startDate} al {leave.endDate}</span>
                        </div>

                        {leave.notes && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                            "{leave.notes}"
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoctorLeave(leave.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            color: '#ef4444',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SERVIDOR FHIR PROXY & CONEXIÓN
          ========================================================================= */}
      {activeTab === 'fhir' && (
        <form onSubmit={handleSaveFhirSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
              {t('settingsTitle')}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.5rem' }}>
              {t('settingsSubtitle')}
            </p>

            {fhirStatusMsg && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1.25rem',
                  backgroundColor: fhirStatusMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${fhirStatusMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                  color: fhirStatusMsg.type === 'success' ? '#065f46' : '#991b1b',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {fhirStatusMsg.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                <span>{fhirStatusMsg.text}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '650px' }}>
              <div>
                <label className="form-label">{t('fhirUrlLabel')}</label>
                <input
                  type="url"
                  className="form-input"
                  value={fhirUrl}
                  onChange={(e) => setFhirUrl(e.target.value)}
                  placeholder="https://fhir.medblocks.com/fhir/..."
                  required
                />
                <span className="form-helper">{t('fhirUrlHelper')}</span>
              </div>

              <div>
                <label className="form-label">{t('bearerTokenLabel')}</label>
                <input
                  type="password"
                  className="form-input"
                  value={fhirToken}
                  onChange={(e) => setFhirToken(e.target.value)}
                  placeholder={serverInfo?.hasToken ? t('tokenConfigured') : t('enterToken')}
                />
                <span className="form-helper">{t('bearerTokenHelper')}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
              {language === 'en' ? 'Clinical vault (Obsidian)' : 'Vault clínico (Obsidian)'}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.5 }}>
              {language === 'en'
                ? (
                  <>
                    Notes load from <code>vault-en/</code> or <code>vault-es/</code> according to the signed-in user’s language.
                    Override with <code>CLINICAL_VAULT_EN_PATH</code> / <code>CLINICAL_VAULT_ES_PATH</code> in <code>.env</code>.
                    Use frontmatter with <code>tags: [mtc]</code> and <code>condition</code> or an H1 title. The model API key is set in My Profile, not here.
                  </>
                )
                : (
                  <>
                    Las notas se cargan de <code>vault-en/</code> o <code>vault-es/</code> según el idioma del usuario.
                    Puedes definir <code>CLINICAL_VAULT_EN_PATH</code> / <code>CLINICAL_VAULT_ES_PATH</code> en <code>.env</code>.
                    Usa frontmatter con <code>tags: [mtc]</code> y <code>condition</code> o un título H1. La API key del modelo se configura en Mi perfil, no aquí.
                  </>
                )}
            </p>
            <div style={{ fontSize: '0.8125rem', color: vaultStatus?.exists ? '#047857' : '#b45309', fontWeight: 600 }}>
              {vaultStatus
                ? (vaultStatus.exists
                  ? (language === 'en'
                    ? `${vaultStatus.noteCount} notes in the ${vaultStatus.language === 'en' ? 'English' : 'Spanish'} vault`
                    : `${vaultStatus.noteCount} notas en el vault ${vaultStatus.language === 'en' ? 'inglés' : 'español'}`)
                  : (language === 'en' ? 'No .md notes in this language vault yet' : 'Aún no hay notas .md en el vault de este idioma'))
                : (language === 'en' ? 'Checking vault…' : 'Comprobando vault…')}
            </div>
            {vaultStatus?.path && (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem', wordBreak: 'break-all' }}>
                {vaultStatus.path}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isSavingFhir}
              className="btn btn-primary"
              style={{ backgroundColor: '#0f766e', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
            >
              <Save size={16} />
              <span>{isSavingFhir ? t('savingSettings') : t('btnSaveSettings')}</span>
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 2: SERVICIOS CLÍNICOS & DIAGNÓSTICOS DISPONIBLES
          ========================================================================= */}
      {activeTab === 'services' && (
        <ClinicalServicesAdmin addToast={addToast} />
      )}

      {/* =========================================================================
          TAB 5: PLANTELES & SEDES (ORGANIZATIONS & LOCATIONS)
          ========================================================================= */}
      {activeTab === 'facilities' && (
        <div>
          <FacilitiesPage addToast={addToast} embedded={true} />
        </div>
      )}

      {activeTab === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
              {t('menuCapabilitiesTitle')}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '640px', lineHeight: 1.5 }}>
              {t('menuCapabilitiesSubtitle')}
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.875rem',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            {MENU_CAPABILITY_ITEMS.map((item, idx) => {
              const visible = menuCapabilities[item.id] !== false;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.95rem 1.25rem',
                    borderBottom: idx === MENU_CAPABILITY_ITEMS.length - 1 ? 'none' : '1px solid #f1f5f9'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                      {language === 'en' ? item.labelEn : item.labelEs}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem', fontFamily: 'var(--font-mono)' }}>
                      {item.path}
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={visible}
                    onClick={() => {
                      const next = setMenuCapabilityVisible(item.id, !visible);
                      setMenuCapabilities(next);
                      if (addToast) {
                        addToast(
                          'success',
                          t('menuCapabilitiesSavedToast'),
                          language === 'en' ? item.labelEn : item.labelEs
                        );
                      }
                    }}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '9999px',
                      border: 'none',
                      backgroundColor: visible ? '#0f766e' : '#cbd5e1',
                      position: 'relative',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'background-color 0.15s ease'
                    }}
                    title={visible ? t('menuCapabilityVisible') : t('menuCapabilityHidden')}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '3px',
                        left: visible ? '23px' : '3px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.25)',
                        transition: 'left 0.15s ease'
                      }}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
              {t('integrativeMedicineGroupTitle')}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '640px', lineHeight: 1.5 }}>
              {t('integrativeMedicineGroupSubtitle')}
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.875rem',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            {CLINIC_SEARCH_MODALITIES.map((id, idx) => {
              const mod = INTEGRATIVE_MODALITIES.find((item) => item.id === id);
              if (!mod) return null;
              const enabled = clinicModalities[id] !== false;
              const aliases = (mod.aliases || []).join(', ');
              return (
                <div
                  key={id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.95rem 1.25rem',
                    borderBottom: idx === CLINIC_SEARCH_MODALITIES.length - 1 ? 'none' : '1px solid #f1f5f9'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                      {language === 'en' ? mod.labelEn : mod.labelEs}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem', fontFamily: 'var(--font-mono)' }}>
                      {aliases}
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => {
                      const next = setClinicIntegrativeModalityEnabled(id, !enabled);
                      setClinicModalities(next);
                      if (addToast) {
                        addToast(
                          'success',
                          t('integrativeMedicineSavedToast'),
                          language === 'en' ? mod.labelEn : mod.labelEs
                        );
                      }
                    }}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '9999px',
                      border: 'none',
                      backgroundColor: enabled ? '#0f766e' : '#cbd5e1',
                      position: 'relative',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'background-color 0.15s ease'
                    }}
                    title={enabled ? t('menuCapabilityVisible') : t('menuCapabilityHidden')}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '3px',
                        left: enabled ? '23px' : '3px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.25)',
                        transition: 'left 0.15s ease'
                      }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Practitioner Create / Edit Modal */}
      {practitionerModal.isOpen && (
        <PractitionerAdminModal
          isOpen={practitionerModal.isOpen}
          onClose={() => setPractitionerModal({ isOpen: false, practitioner: null })}
          practitioner={practitionerModal.practitioner}
          initialTab="user"
          onSave={handleSavePractitioner}
        />
      )}

      {/* Practitioner Delete Confirmation Modal */}
      {practitionerDeleteModal.isOpen && (
        <DeleteConfirmModal
          isOpen={practitionerDeleteModal.isOpen}
          onClose={() => setPractitionerDeleteModal({ isOpen: false, practitioner: null })}
          onConfirm={handleConfirmDeletePractitioner}
          title={language === 'en' ? 'Remove Practitioner' : 'Eliminar Profesional del Directorio'}
          message={language === 'en'
            ? `Are you sure you want to delete ${getStaffFullName(practitionerDeleteModal.practitioner)} (${practitionerDeleteModal.practitioner?.email})?`
            : `¿Estás seguro de que deseas eliminar a ${getStaffFullName(practitionerDeleteModal.practitioner)} (${practitionerDeleteModal.practitioner?.email}) del directorio?`}
          warningText={language === 'en'
            ? 'This will remove the practitioner default consultation duration, shift assignments, and credentials.'
            : 'Esta acción removerá la configuración de tiempo de consulta por defecto, turnos asignados y credenciales de este médico.'}
          confirmText={language === 'en' ? 'Delete Practitioner' : 'Eliminar Profesional'}
        />
      )}
    </div>
  );
}
