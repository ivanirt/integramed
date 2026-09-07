import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  Award,
  Stethoscope,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Clock,
  GraduationCap,
  Key,
  Edit3,
  Trash2,
  Filter,
  Check,
  Building,
  RotateCcw,
  BookOpen,
  ChevronRight,
  Activity,
  Layers,
  Shield,
  RotateCw,
  Users,
  AlertTriangle,
  User,
  MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { CLINICAL_ROLES, SHIFT_TYPES, getStaffFullName } from '../utils/staffStorage';
import {
  GUARD_TYPES,
  getGuards,
  saveGuard,
  deleteGuard,
  getCoverages,
  saveCoverage,
  deleteCoverage,
  resetShiftGuardData
} from '../utils/shiftGuardStorage';
import PractitionerAdminModal from '../components/practitioners/PractitionerAdminModal';
import ChangePasswordModal from '../components/practitioners/ChangePasswordModal';
import ScheduleGuardModal from '../components/shifts/ScheduleGuardModal';
import CoverageRequestModal from '../components/shifts/CoverageRequestModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function PractitionersPage({ addToast, onOpenScheduleModal, defaultTab = 'staff' }) {
  const { language, t } = useLanguage();
  const {
    staffList,
    savePractitioner,
    updatePassword,
    deletePractitioner,
    resetStaff,
    refreshStaff
  } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  // Active Tab: 'staff' | 'guards' | 'coverages' | 'roster'
  const [activeTab, setActiveTab] = useState(() => {
    if (urlTab && ['staff', 'guards', 'coverages', 'roster'].includes(urlTab)) {
      return urlTab;
    }
    return defaultTab || 'staff';
  });

  // Sync tab with URL query parameter
  useEffect(() => {
    if (urlTab && ['staff', 'guards', 'coverages', 'roster'].includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // Shifts & Guards storage state
  const [guards, setGuards] = useState(() => getGuards());
  const [coverages, setCoverages] = useState(() => getCoverages());

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedGuardRole, setSelectedGuardRole] = useState('all');
  const [selectedGuardType, setSelectedGuardType] = useState('all');

  // Modals state
  const [adminModal, setAdminModal] = useState({
    isOpen: false,
    practitioner: null,
    tab: 'user'
  });

  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    practitioner: null
  });

  const [guardModal, setGuardModal] = useState({
    isOpen: false,
    guard: null
  });

  const [coverageModal, setCoverageModal] = useState({
    isOpen: false,
    coverage: null
  });

  // Filter staff directory
  const filteredStaff = useMemo(() => {
    return (staffList || []).filter(staff => {
      // Role filter
      if (selectedRole !== 'all' && !staff.roles?.includes(selectedRole)) {
        return false;
      }
      // Shift filter
      if (selectedShift !== 'all' && staff.shiftInfo?.shiftType !== selectedShift) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'all' && staff.status !== selectedStatus) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const fullName = `${staff.prefix || ''} ${staff.givenName || ''} ${staff.familyName || ''}`.toLowerCase();
        const specialty = (staff.specialty || '').toLowerCase();
        const license = (staff.license || '').toLowerCase();
        const email = (staff.email || '').toLowerCase();
        const phone = (staff.phone || '').toLowerCase();
        const subspecialties = (staff.subspecialties || []).join(' ').toLowerCase();
        const courses = (staff.courses || []).map(c => c.title).join(' ').toLowerCase();

        return (
          fullName.includes(query) ||
          specialty.includes(query) ||
          license.includes(query) ||
          email.includes(query) ||
          phone.includes(query) ||
          subspecialties.includes(query) ||
          courses.includes(query)
        );
      }
      return true;
    });
  }, [staffList, selectedRole, selectedShift, selectedStatus, searchQuery]);

  // Filtered Guards
  const filteredGuards = useMemo(() => {
    return (guards || []).filter(g => {
      if (selectedGuardRole !== 'all' && g.role !== selectedGuardRole) return false;
      if (selectedGuardType !== 'all' && g.guardType !== selectedGuardType) return false;
      if (selectedStatus !== 'all' && g.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (g.practitionerName || '').toLowerCase();
        const loc = (g.locationName || '').toLowerCase();
        const dept = (g.department || '').toLowerCase();
        const date = (g.date || '').toLowerCase();
        return name.includes(q) || loc.includes(q) || dept.includes(q) || date.includes(q);
      }
      return true;
    });
  }, [guards, selectedGuardRole, selectedGuardType, selectedStatus, searchQuery]);

  // Filtered Coverages
  const filteredCoverages = useMemo(() => {
    return (coverages || []).filter(c => {
      if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const orig = (c.originalPractitionerName || '').toLowerCase();
        const sub = (c.substitutePractitionerName || '').toLowerCase();
        const reason = (c.reason || '').toLowerCase();
        const loc = (c.locationName || '').toLowerCase();
        return orig.includes(q) || sub.includes(q) || reason.includes(q) || loc.includes(q);
      }
      return true;
    });
  }, [coverages, selectedStatus, searchQuery]);

  // General Statistics
  const stats = useMemo(() => {
    const list = staffList || [];
    const total = list.length;
    const active = list.filter(s => s.status === 'active' || !s.status).length;
    const doctors = list.filter(s => s.roles?.includes('doctor') || s.roles?.includes('therapist')).length;
    const nurses = list.filter(s => s.roles?.includes('nurse')).length;
    const totalCourses = list.reduce((acc, curr) => acc + (curr.courses?.length || 0), 0);
    const totalGuards = (guards || []).length;
    const activeGuards = (guards || []).filter(g => g.status === 'scheduled' || g.status === 'active').length;
    const totalCoverages = (coverages || []).length;
    const approvedCoverages = (coverages || []).filter(c => c.status === 'approved').length;

    return {
      total,
      active,
      doctors,
      nurses,
      totalCourses,
      totalGuards,
      activeGuards,
      totalCoverages,
      approvedCoverages
    };
  }, [staffList, guards, coverages]);

  // Universal Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    warningText: '',
    confirmText: '',
    variant: 'danger',
    icon: 'trash',
    onConfirm: null
  });

  // Save practitioner handler
  const handleSavePractitioner = (practitionerData) => {
    savePractitioner(practitionerData);
    if (addToast) {
      addToast(
        'success',
        language === 'en'
          ? `Practitioner ${getStaffFullName(practitionerData)} saved successfully`
          : `Profesional ${getStaffFullName(practitionerData)} guardado correctamente`,
        language === 'en' ? 'Practitioner Directory Updated' : 'Directorio de Personal Actualizado'
      );
    }
  };

  // Password changed handler
  const handlePasswordChanged = (staffId, newPassword) => {
    const updated = updatePassword(staffId, newPassword);
    if (addToast && updated) {
      addToast(
        'success',
        language === 'en'
          ? `Password updated for ${getStaffFullName(updated)}`
          : `Contraseña actualizada para ${getStaffFullName(updated)}`,
        language === 'en' ? 'Security Credentials Updated' : 'Credenciales de Seguridad Actualizadas'
      );
    }
  };

  // Delete practitioner handler
  const handleDeletePractitioner = (staff) => {
    const name = getStaffFullName(staff);
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Delete Practitioner Profile' : 'Eliminar Perfil de Profesional',
      message: language === 'en'
        ? `Are you sure you want to remove ${name} (${staff.email}) from the practitioners directory?`
        : `¿Está seguro de que desea eliminar a ${name} (${staff.email}) del directorio de profesionales?`,
      warningText: language === 'en' ? 'The practitioner credentials and shift data will be removed.' : 'Las credenciales y turnos asignados a este profesional serán eliminados.',
      confirmText: language === 'en' ? 'Delete Practitioner' : 'Eliminar Profesional',
      variant: 'danger',
      icon: 'trash',
      onConfirm: () => {
        deletePractitioner(staff.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast(
            'info',
            language === 'en' ? `${name} was removed` : `${name} fue eliminado del directorio`,
            language === 'en' ? 'Staff Removed' : 'Personal Eliminado'
          );
        }
      }
    });
  };

  // Handle Save Guard
  const handleSaveGuard = (guardData) => {
    const updated = saveGuard(guardData);
    setGuards(updated);
    if (addToast) {
      addToast(
        'success',
        language === 'en'
          ? `Guard duty scheduled for ${guardData.practitionerName}`
          : `Guardia programada para ${guardData.practitionerName}`,
        language === 'en' ? 'Guard Scheduled' : 'Guardia Programada'
      );
    }
  };

  // Handle Delete Guard
  const handleDeleteGuard = (guard) => {
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Delete Guard Duty' : 'Eliminar Asignación de Guardia',
      message: language === 'en'
        ? `Are you sure you want to remove the guard duty on ${guard.date} (${guard.practitionerName})?`
        : `¿Estás seguro de que deseas eliminar la asignación de guardia del día ${guard.date} (${guard.practitionerName})?`,
      warningText: language === 'en' ? 'This guard slot will be left unassigned.' : 'Este turno de guardia quedará desasignado.',
      confirmText: language === 'en' ? 'Delete Guard' : 'Eliminar Guardia',
      variant: 'danger',
      icon: 'trash',
      onConfirm: () => {
        const updated = deleteGuard(guard.id);
        setGuards(updated);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast('info', language === 'en' ? 'Guard removed' : 'Guardia eliminada', language === 'en' ? 'Deleted' : 'Eliminado');
        }
      }
    });
  };

  // Handle Save Coverage
  const handleSaveCoverage = (coverageData) => {
    const updated = saveCoverage(coverageData);
    setCoverages(updated);
    if (addToast) {
      addToast(
        'success',
        language === 'en'
          ? `Substitute assigned: ${coverageData.substitutePractitionerName} covers ${coverageData.originalPractitionerName}`
          : `Relevo asignado: ${coverageData.substitutePractitionerName} sustituye a ${coverageData.originalPractitionerName}`,
        language === 'en' ? 'Substitute Assigned' : 'Relevo Asignado'
      );
    }
  };

  // Handle Delete Coverage
  const handleDeleteCoverage = (cov) => {
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Delete Coverage Record' : 'Eliminar Registro de Suplencia',
      message: language === 'en'
        ? `Are you sure you want to remove coverage for ${cov.originalPractitionerName} on ${cov.date}?`
        : `¿Estás seguro de que deseas eliminar la suplencia de ${cov.originalPractitionerName} para el ${cov.date}?`,
      warningText: language === 'en' ? 'The original doctor will remain on duty without substitute.' : 'El médico titular volverá a figurar sin relevo asignado.',
      confirmText: language === 'en' ? 'Delete Coverage' : 'Eliminar Suplencia',
      variant: 'danger',
      icon: 'trash',
      onConfirm: () => {
        const updated = deleteCoverage(cov.id);
        setCoverages(updated);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast('info', language === 'en' ? 'Coverage removed' : 'Suplencia eliminada', language === 'en' ? 'Deleted' : 'Eliminado');
        }
      }
    });
  };

  // Reset to default handler
  const handleResetData = () => {
    if (activeTab === 'guards' || activeTab === 'coverages') {
      setConfirmModal({
        isOpen: true,
        title: language === 'en' ? 'Reset Shifts & Guards Data' : 'Restablecer Guardias y Relevos',
        message: language === 'en'
          ? 'This will reset all scheduled guards and coverage requests back to initial demo state.'
          : 'Esto restaurará todas las guardias programadas y solicitudes de relevo a los valores iniciales de prueba.',
        warningText: language === 'en' ? 'Custom changes made in this session will be restored.' : 'Los cambios personalizados realizados en esta sesión se restaurarán.',
        confirmText: language === 'en' ? 'Reset to Default' : 'Restablecer Datos',
        variant: 'warning',
        icon: 'reset',
        onConfirm: () => {
          const { guards: newGuards, coverages: newCoverages } = resetShiftGuardData();
          setGuards(newGuards);
          setCoverages(newCoverages);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          if (addToast) {
            addToast('info', language === 'en' ? 'Shifts & guards data reset to default' : 'Rol de guardias restaurado a valores iniciales', language === 'en' ? 'Reset Complete' : 'Restablecimiento Completo');
          }
        }
      });
    } else {
      setConfirmModal({
        isOpen: true,
        title: language === 'en' ? 'Reset Staff Directory' : 'Restablecer Directorio de Personal',
        message: language === 'en'
          ? 'Reset staff directory back to original IntegraMed demo setup?'
          : '¿Restablecer el directorio de personal a los valores iniciales de demostración de IntegraMed?',
        warningText: language === 'en' ? 'Any custom added staff profiles will be reset.' : 'Cualquier perfil de personal agregado recientemente se restablecerá a los valores iniciales.',
        confirmText: language === 'en' ? 'Reset to Default' : 'Restablecer Datos',
        variant: 'warning',
        icon: 'reset',
        onConfirm: () => {
          resetStaff();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          if (addToast) {
            addToast(
              'success',
              language === 'en' ? 'Staff directory restored to initial demo state' : 'Directorio de personal restaurado a los valores iniciales',
              language === 'en' ? 'Data Reset' : 'Datos Restaurados'
            );
          }
        }
      });
    }
  };

  return (
    <div style={{ padding: '1.75rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669'
              }}
            >
              <UserCheck size={22} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              {language === 'en' ? 'Staff, Shifts & Hospital Guards' : 'Administración de Personal, Turnos y Guardias'}
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
            {language === 'en'
              ? 'Comprehensive clinical staff directory, 24h on-call guards, substitute coverage management, and shift roster'
              : 'Directorio clínico integral, rol de guardias hospitalarias 24h/nocturnas, relevos de personal y turnos laborales'}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleResetData}
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.4rem', color: '#475569', fontSize: '0.8125rem' }}
            title={language === 'en' ? 'Reset demo data' : 'Restablecer datos demo'}
          >
            <RotateCcw size={14} />
            <span>{language === 'en' ? 'Reset Demo Data' : 'Restablecer Demo'}</span>
          </button>

          {activeTab === 'staff' && (
            <button
              type="button"
              onClick={() => {
                refreshStaff();
                if (addToast) {
                  addToast('info', language === 'en' ? 'Practitioners directory refreshed' : 'Directorio de profesionales actualizado');
                }
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8125rem' }}
            >
              <RefreshCw size={14} />
              <span>{language === 'en' ? 'Refresh' : 'Actualizar'}</span>
            </button>
          )}

          {(activeTab === 'guards' || activeTab === 'coverages') && (
            <button
              type="button"
              onClick={() => setCoverageModal({ isOpen: true, coverage: null })}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8125rem', gap: '0.35rem', borderColor: '#cbd5e1' }}
            >
              <RotateCw size={15} color="#0f766e" />
              <span>{language === 'en' ? '+ Assign Substitute' : '+ Asignar Sustituto / Relevo'}</span>
            </button>
          )}

          {activeTab === 'guards' ? (
            <button
              type="button"
              onClick={() => setGuardModal({ isOpen: true, guard: null })}
              className="btn btn-primary"
              style={{ backgroundColor: '#0f766e', boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)', gap: '0.4rem' }}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>{language === 'en' ? 'Schedule Guard Duty' : 'Programar Guardia'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAdminModal({ isOpen: true, practitioner: null, tab: 'user' })}
              className="btn btn-primary"
              style={{ backgroundColor: '#0f766e', boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)', gap: '0.4rem' }}
              id="new-practitioner-btn"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>{language === 'en' ? 'New Practitioner' : 'Nuevo Profesional'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Summary Tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        {/* Tile 1: Total Staff */}
        <div
          onClick={() => handleTabChange('staff')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: activeTab === 'staff' ? '2px solid #0f766e' : '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {language === 'en' ? 'Clinical Staff' : 'Personal Clínico'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.total}{' '}
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>
                ({stats.active} {language === 'en' ? 'active' : 'activos'})
              </span>
            </div>
          </div>
        </div>

        {/* Tile 2: Scheduled Guards */}
        <div
          onClick={() => handleTabChange('guards')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: activeTab === 'guards' ? '2px solid #e11d48' : '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#e11d48',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Shield size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {language === 'en' ? 'Scheduled Guards' : 'Guardias Médicas'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.activeGuards}{' '}
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e11d48' }}>
                {language === 'en' ? 'scheduled' : 'programadas'}
              </span>
            </div>
          </div>
        </div>

        {/* Tile 3: Substitutes & Coverages */}
        <div
          onClick={() => handleTabChange('coverages')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: activeTab === 'coverages' ? '2px solid #059669' : '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RotateCw size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {language === 'en' ? 'Staff Coverages' : 'Relevos & Suplencias'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.approvedCoverages}{' '}
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>
                ({stats.totalCoverages} {language === 'en' ? 'total' : 'solicitudes'})
              </span>
            </div>
          </div>
        </div>

        {/* Tile 4: CME Certifications or Shifts */}
        <div
          onClick={() => handleTabChange('roster')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: activeTab === 'roster' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#faf5ff',
              border: '1px solid #e9d5ff',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {language === 'en' ? 'Shift Coverage' : 'Turnos & Cursos'}
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.totalCourses}{' '}
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7c3aed' }}>
                {language === 'en' ? 'courses / 24h' : 'cursos / 24h'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Unified Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.5rem',
          overflowX: 'auto'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('staff')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '0.625rem',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'staff' ? 800 : 500,
            border: 'none',
            backgroundColor: activeTab === 'staff' ? '#ecfdf5' : 'transparent',
            color: activeTab === 'staff' ? '#065f46' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <UserCheck size={18} />
          <span>{language === 'en' ? 'Staff Directory' : 'Directorio de Personal'} ({staffList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('guards')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '0.625rem',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'guards' ? 800 : 500,
            border: 'none',
            backgroundColor: activeTab === 'guards' ? '#fff1f2' : 'transparent',
            color: activeTab === 'guards' ? '#9f1239' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Shield size={18} />
          <span>{language === 'en' ? 'Hospital Guards Schedule' : 'Programación de Guardias'} ({guards.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('coverages')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '0.625rem',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'coverages' ? 800 : 500,
            border: 'none',
            backgroundColor: activeTab === 'coverages' ? '#ecfdf5' : 'transparent',
            color: activeTab === 'coverages' ? '#065f46' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <RotateCw size={18} />
          <span>{language === 'en' ? 'Substitutes & Coverages' : 'Sustitutos y Relevos'} ({coverages.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('roster')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '0.625rem',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'roster' ? 800 : 500,
            border: 'none',
            backgroundColor: activeTab === 'roster' ? '#faf5ff' : 'transparent',
            color: activeTab === 'roster' ? '#6b21a8' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Clock size={18} />
          <span>{language === 'en' ? 'Assigned Shifts & Roster' : 'Horarios y Turnos Asignados'} ({staffList.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STAFF DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'staff' && (
        <div>
          {/* Search & Filters Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              {/* Search Box */}
              <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'en' ? 'Search by name, specialty, course, license...' : 'Buscar por nombre, especialidad, curso, cédula...'}
                  style={{
                    paddingLeft: '2.4rem',
                    height: '38px',
                    fontSize: '0.8125rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '0.5rem'
                  }}
                />
              </div>

              {/* Shift and Status Dropdown Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {/* Shift Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={15} color="#64748b" />
                  <select
                    className="form-input"
                    style={{ height: '38px', width: 'auto', fontSize: '0.8125rem', padding: '0 2rem 0 0.75rem' }}
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value)}
                  >
                    <option value="all">{language === 'en' ? 'All Shifts' : 'Todos los Turnos'}</option>
                    {Object.values(SHIFT_TYPES).map(shift => (
                      <option key={shift.id} value={shift.id}>
                        {language === 'en' ? shift.labelEn : shift.labelEs}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Filter size={15} color="#64748b" />
                  <select
                    className="form-input"
                    style={{ height: '38px', width: 'auto', fontSize: '0.8125rem', padding: '0 2rem 0 0.75rem' }}
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="all">{language === 'en' ? 'All Statuses' : 'Todos los Estados'}</option>
                    <option value="active">{language === 'en' ? 'Active' : 'Activo'}</option>
                    <option value="on_call">{language === 'en' ? 'On Call' : 'En Guardia'}</option>
                    <option value="leave">{language === 'en' ? 'On Leave' : 'Permiso / Vacaciones'}</option>
                    <option value="inactive">{language === 'en' ? 'Inactive' : 'Inactivo'}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Role Pills Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '0.875rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginRight: '0.25rem' }}>
                {language === 'en' ? 'Filter by Role:' : 'Filtrar por Rol:'}
              </span>

              <button
                type="button"
                onClick={() => setSelectedRole('all')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: selectedRole === 'all' ? 800 : 500,
                  border: selectedRole === 'all' ? '1.5px solid #0f766e' : '1px solid #e2e8f0',
                  backgroundColor: selectedRole === 'all' ? '#ecfdf5' : '#ffffff',
                  color: selectedRole === 'all' ? '#065f46' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {language === 'en' ? 'All Roles' : 'Todos los Roles'} ({staffList.length})
              </button>

              {Object.values(CLINICAL_ROLES).map(role => {
                const isSelected = selectedRole === role.id;
                const count = (staffList || []).filter(s => s.roles?.includes(role.id)).length;

                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 800 : 500,
                      border: isSelected ? `1.5px solid ${role.color}` : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? role.bgColor : '#ffffff',
                      color: isSelected ? role.color : '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: role.color }} />
                    <span>{language === 'en' ? role.labelEn : role.labelEs}</span>
                    <span style={{ opacity: 0.75, fontSize: '0.7rem' }}>({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Staff Count Indicator */}
          <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>
              {language === 'en'
                ? `Showing ${filteredStaff.length} of ${staffList.length} practitioners`
                : `Mostrando ${filteredStaff.length} de ${staffList.length} profesionales registrados`}
            </span>
          </div>

          {/* Practitioner Cards Grid */}
          {filteredStaff.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                padding: '4rem 2rem',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#ecfdf5',
                  border: '2px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto',
                  color: '#059669'
                }}
              >
                <UserCheck size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                {language === 'en' ? 'No practitioners found' : 'No se encontraron profesionales'}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
                {language === 'en'
                  ? 'No staff member matches the selected filters or search query.'
                  : 'Ningún profesional coincide con los filtros aplicados o término de búsqueda.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRole('all');
                  setSelectedShift('all');
                  setSelectedStatus('all');
                }}
                className="btn btn-secondary"
              >
                {language === 'en' ? 'Clear Filters' : 'Limpiar Filtros'}
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                gap: '1.25rem'
              }}
            >
              {filteredStaff.map(staff => {
                const fullName = getStaffFullName(staff);
                const primaryRoleConfig = CLINICAL_ROLES[staff.primaryRole] || CLINICAL_ROLES.doctor;
                const shiftConfig = SHIFT_TYPES[staff.shiftInfo?.shiftType] || SHIFT_TYPES.full_time;
                const coursesCount = staff.courses?.length || 0;

                const daysMap = {
                  monday: 'L',
                  tuesday: 'M',
                  wednesday: 'M',
                  thursday: 'J',
                  friday: 'V',
                  saturday: 'S',
                  sunday: 'D'
                };

                return (
                  <div
                    key={staff.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '1rem',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      overflow: 'hidden',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                    }}
                  >
                    {/* Card Top Section */}
                    <div style={{ padding: '1.25rem 1.25rem 1rem' }}>
                      {/* Avatar, Name, and Status */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                          <div
                            style={{
                              width: '52px',
                              height: '52px',
                              borderRadius: '12px',
                              backgroundColor: staff.avatarBg || '#0f766e',
                              color: staff.avatarText || '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '1.15rem',
                              flexShrink: 0,
                              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                            }}
                          >
                            {staff.givenName?.[0]}
                            {staff.familyName?.[0]}
                          </div>

                          <div>
                            <h3 style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, margin: 0 }}>
                              {fullName}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                              {/* Primary Role Badge */}
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '9999px',
                                  backgroundColor: primaryRoleConfig.bgColor,
                                  color: primaryRoleConfig.color,
                                  border: `1px solid ${primaryRoleConfig.color}40`,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: primaryRoleConfig.color }} />
                                {language === 'en' ? primaryRoleConfig.labelEn : primaryRoleConfig.labelEs}
                              </span>

                              {/* Secondary Roles Tags */}
                              {staff.roles?.filter(r => r !== staff.primaryRole).map(rId => {
                                const rConfig = CLINICAL_ROLES[rId];
                                if (!rConfig) return null;
                                return (
                                  <span
                                    key={rId}
                                    style={{
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                      padding: '0.1rem 0.4rem',
                                      borderRadius: '9999px',
                                      backgroundColor: '#f1f5f9',
                                      color: '#475569',
                                      border: '1px solid #cbd5e1'
                                    }}
                                  >
                                    + {language === 'en' ? rConfig.labelEn : rConfig.labelEs}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Active Status Badge */}
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            backgroundColor: staff.status === 'active' || !staff.status ? '#ecfdf5' : staff.status === 'on_call' ? '#ede9fe' : staff.status === 'leave' ? '#fef3c7' : '#f1f5f9',
                            color: staff.status === 'active' || !staff.status ? '#047857' : staff.status === 'on_call' ? '#7c3aed' : staff.status === 'leave' ? '#b45309' : '#64748b',
                            border: `1px solid ${staff.status === 'active' || !staff.status ? '#a7f3d0' : staff.status === 'on_call' ? '#ddd6fe' : staff.status === 'leave' ? '#fde68a' : '#cbd5e1'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            flexShrink: 0
                          }}
                        >
                          <CheckCircle2 size={11} />
                          {staff.status === 'active' || !staff.status
                            ? (language === 'en' ? 'Active' : 'Activo')
                            : staff.status === 'on_call'
                            ? (language === 'en' ? 'On Call' : 'En Guardia')
                            : staff.status === 'leave'
                            ? (language === 'en' ? 'On Leave' : 'Permiso')
                            : (language === 'en' ? 'Inactive' : 'Inactivo')}
                        </span>
                      </div>

                      {/* 1. Specialty & License Section */}
                      <div
                        style={{
                          padding: '0.75rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '0.625rem',
                          border: '1px solid #e2e8f0',
                          marginBottom: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <GraduationCap size={15} color="#0f766e" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a' }}>
                              {staff.specialty || (language === 'en' ? 'General Practice' : 'Medicina General')}
                            </div>
                            {staff.license && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                                {staff.license} {staff.specialtyLicense ? `| ${staff.specialtyLicense}` : ''}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Subspecialties / Clinical Focus tags */}
                        {staff.subspecialties?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.4rem' }}>
                            {staff.subspecialties.map((sub, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  color: '#334155',
                                  fontWeight: 600
                                }}
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        )}

                        {staff.consultingRoom && (
                          <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem' }}>
                            <Building size={12} />
                            <span>{staff.consultingRoom}</span>
                          </div>
                        )}
                      </div>

                      {/* 2. Shift & Hours Information */}
                      <div
                        style={{
                          padding: '0.75rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '0.625rem',
                          border: '1px solid #e2e8f0',
                          marginBottom: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Clock size={14} color="#0284c7" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                              {language === 'en' ? shiftConfig.labelEn : shiftConfig.labelEs}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369a1', fontFamily: 'var(--font-mono)' }}>
                            {staff.shiftInfo?.startTime || '08:00'} - {staff.shiftInfo?.endTime || '17:00'}
                          </span>
                        </div>

                        {/* Working Days Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(dKey => {
                              const isWorking = staff.shiftInfo?.workingDays?.includes(dKey);
                              return (
                                <span
                                  key={dKey}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '4px',
                                    fontSize: '0.625rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isWorking ? '#ecfdf5' : '#f1f5f9',
                                    color: isWorking ? '#047857' : '#94a3b8',
                                    border: isWorking ? '1px solid #a7f3d0' : '1px solid #e2e8f0'
                                  }}
                                >
                                  {daysMap[dKey]}
                                </span>
                              );
                            })}
                          </div>

                          {staff.shiftInfo?.consultationDurationMin && (
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              ⏱️ {staff.shiftInfo.consultationDurationMin} min / {language === 'en' ? 'appt' : 'cita'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3. Courses & CME Highlights */}
                      <div
                        style={{
                          padding: '0.75rem',
                          backgroundColor: '#faf5ff',
                          borderRadius: '0.625rem',
                          border: '1px solid #e9d5ff',
                          marginBottom: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 800, color: '#6b21a8' }}>
                            <Award size={14} />
                            <span>{language === 'en' ? 'CME Certifications' : 'Cursos & Certificaciones'}</span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.45rem',
                              borderRadius: '9999px',
                              backgroundColor: '#ede9fe',
                              color: '#6d28d9',
                              border: '1px solid #ddd6fe'
                            }}
                          >
                            {coursesCount} {language === 'en' ? 'courses' : 'cursos'}
                          </span>
                        </div>

                        {coursesCount > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {staff.courses.slice(0, 2).map(c => (
                              <div key={c.id} style={{ fontSize: '0.72rem', color: '#4c1d95', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px', fontWeight: 600 }}>
                                  • {c.title}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: c.status === 'vigente' ? '#047857' : '#b45309', fontWeight: 700 }}>
                                  {c.status === 'vigente' ? (language === 'en' ? 'Active' : 'Vigente') : (language === 'en' ? 'Expiring' : 'Por vencer')}
                                </span>
                              </div>
                            ))}
                            {coursesCount > 2 && (
                              <span
                                onClick={() => setAdminModal({ isOpen: true, practitioner: staff, tab: 'courses' })}
                                style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 700, cursor: 'pointer', marginTop: '0.15rem' }}
                              >
                                + {coursesCount - 2} {language === 'en' ? 'more certifications...' : 'certificaciones más...'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            {language === 'en' ? 'No certifications recorded' : 'Sin certificaciones registradas'}
                          </span>
                        )}
                      </div>

                      {/* 4. User Account & Contact Status */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.75rem', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Mail size={13} color="#94a3b8" />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: '#334155' }}>
                            {staff.email}
                          </span>
                        </div>
                        {staff.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Phone size={13} color="#94a3b8" />
                            <span>{staff.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div
                      style={{
                        backgroundColor: '#fafafa',
                        borderTop: '1px solid #f1f5f9',
                        padding: '0.75rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {/* Change Password Button */}
                        <button
                          type="button"
                          onClick={() => setPasswordModal({ isOpen: true, practitioner: staff })}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', gap: '0.3rem', color: '#0f766e', borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' }}
                          title={language === 'en' ? 'Change or reset password' : 'Cambiar o restablecer contraseña'}
                        >
                          <Key size={13} />
                          <span>{language === 'en' ? 'Password' : 'Contraseña'}</span>
                        </button>

                        {/* Manage Courses Button */}
                        <button
                          type="button"
                          onClick={() => setAdminModal({ isOpen: true, practitioner: staff, tab: 'courses' })}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', gap: '0.3rem', color: '#6d28d9', borderColor: '#ddd6fe', backgroundColor: '#faf5ff' }}
                          title={language === 'en' ? 'Manage CME courses' : 'Gestionar cursos y certificaciones'}
                        >
                          <Award size={13} />
                          <span>{coursesCount}</span>
                        </button>

                        {/* Manage Shift Button */}
                        <button
                          type="button"
                          onClick={() => setAdminModal({ isOpen: true, practitioner: staff, tab: 'shift' })}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', gap: '0.3rem', color: '#0369a1', borderColor: '#bae6fd', backgroundColor: '#f0f9ff' }}
                          title={language === 'en' ? 'Manage shifts and schedule' : 'Modificar turno y horario'}
                        >
                          <Clock size={13} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {/* Full Edit Profile Button */}
                        <button
                          type="button"
                          onClick={() => setAdminModal({ isOpen: true, practitioner: staff, tab: 'user' })}
                          className="btn btn-primary btn-sm"
                          style={{ backgroundColor: '#0f766e', fontSize: '0.75rem', gap: '0.3rem' }}
                        >
                          <Edit3 size={13} />
                          <span>{language === 'en' ? 'Edit' : 'Editar'}</span>
                        </button>

                        {/* Delete Practitioner Button */}
                        <button
                          type="button"
                          onClick={() => handleDeletePractitioner(staff)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '0.35rem',
                            borderRadius: '0.375rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.15s ease'
                          }}
                          title={language === 'en' ? 'Remove practitioner' : 'Eliminar profesional'}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HOSPITAL GUARDS SCHEDULE */}
      {/* ========================================================================= */}
      {activeTab === 'guards' && (
        <div>
          {/* Filters Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'en' ? 'Search by practitioner, date, location...' : 'Buscar por médico, fecha, plantel, servicio...'}
                style={{
                  paddingLeft: '2.4rem',
                  height: '38px',
                  fontSize: '0.8125rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Role Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Filter size={15} color="#64748b" />
                <select
                  className="form-input"
                  style={{ height: '38px', width: 'auto', fontSize: '0.8125rem' }}
                  value={selectedGuardRole}
                  onChange={(e) => setSelectedGuardRole(e.target.value)}
                >
                  <option value="all">{language === 'en' ? 'All Roles' : 'Todos los Roles'}</option>
                  <option value="doctor">{language === 'en' ? 'Doctors' : 'Médicos'}</option>
                  <option value="nurse">{language === 'en' ? 'Nurses' : 'Enfermeras'}</option>
                  <option value="therapist">{language === 'en' ? 'Therapists' : 'Terapeutas'}</option>
                </select>
              </div>

              {/* Guard Type Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Shield size={15} color="#64748b" />
                <select
                  className="form-input"
                  style={{ height: '38px', width: 'auto', fontSize: '0.8125rem' }}
                  value={selectedGuardType}
                  onChange={(e) => setSelectedGuardType(e.target.value)}
                >
                  <option value="all">{language === 'en' ? 'All Guard Types' : 'Todas las Modalidades'}</option>
                  {Object.values(GUARD_TYPES).map(gt => (
                    <option key={gt.id} value={gt.id}>
                      {language === 'en' ? gt.labelEn : gt.labelEs}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Guards Count */}
          <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600, marginBottom: '1rem' }}>
            {language === 'en'
              ? `Showing ${filteredGuards.length} of ${guards.length} scheduled guard duties`
              : `Mostrando ${filteredGuards.length} de ${guards.length} asignaciones de guardia médica`}
          </div>

          {/* Guards Cards Grid */}
          {filteredGuards.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                padding: '4rem 2rem',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#fff1f2',
                  border: '2px solid #fecdd3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto',
                  color: '#e11d48'
                }}
              >
                <Shield size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                {language === 'en' ? 'No scheduled guards found' : 'No se encontraron guardias programadas'}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
                {language === 'en'
                  ? 'There are no active guard assignments matching your search criteria.'
                  : 'No existen roles de guardia programados que coincidan con la búsqueda.'}
              </p>
              <button
                type="button"
                onClick={() => setGuardModal({ isOpen: true, guard: null })}
                className="btn btn-primary"
                style={{ backgroundColor: '#0f766e' }}
              >
                <Plus size={16} />
                <span>{language === 'en' ? 'Schedule Guard Now' : 'Programar Guardia Ahora'}</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.25rem' }}>
              {filteredGuards.map(guard => {
                const guardTypeConfig = GUARD_TYPES[guard.guardType] || GUARD_TYPES.presential_24h;

                return (
                  <div
                    key={guard.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '1rem',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '10px',
                              backgroundColor: guardTypeConfig.bgColor,
                              border: `1px solid ${guardTypeConfig.color}40`,
                              color: guardTypeConfig.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <Shield size={22} />
                          </div>

                          <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                              {guard.practitionerName}
                            </h3>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                              {guard.department}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            backgroundColor: guardTypeConfig.bgColor,
                            color: guardTypeConfig.color,
                            border: `1px solid ${guardTypeConfig.color}40`,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {language === 'en' ? guardTypeConfig.labelEn : guardTypeConfig.labelEs}
                        </span>
                      </div>

                      {/* Details Box */}
                      <div
                        style={{
                          padding: '0.75rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '0.625rem',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.8125rem',
                          color: '#334155',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#0f172a' }}>
                            <Calendar size={14} color="#059669" />
                            <span>{guard.date}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0369a1', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                            <Clock size={13} />
                            <span>{guard.shiftHours}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                          <MapPin size={13} color="#94a3b8" />
                          <span>{guard.locationName}</span>
                        </div>

                        {guard.notes && (
                          <div style={{ fontSize: '0.72rem', color: '#475569', fontStyle: 'italic', marginTop: '0.2rem' }}>
                            "{guard.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div
                      style={{
                        backgroundColor: '#fafafa',
                        borderTop: '1px solid #f1f5f9',
                        padding: '0.75rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CheckCircle2 size={13} />
                        {language === 'en' ? 'Assigned' : 'Asignado'}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => setGuardModal({ isOpen: true, guard })}
                          className="btn btn-primary btn-sm"
                          style={{ backgroundColor: '#0f766e', fontSize: '0.75rem', gap: '0.35rem' }}
                        >
                          <Edit3 size={13} />
                          <span>{language === 'en' ? 'Edit' : 'Editar'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteGuard(guard)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.35rem' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SUBSTITUTES & COVERAGES (RELEVOS) */}
      {/* ========================================================================= */}
      {activeTab === 'coverages' && (
        <div>
          {/* Filters Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'en' ? 'Search by original practitioner, substitute, reason...' : 'Buscar por médico titular, sustituto, motivo...'}
                style={{
                  paddingLeft: '2.4rem',
                  height: '38px',
                  fontSize: '0.8125rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Filter size={15} color="#64748b" />
              <select
                className="form-input"
                style={{ height: '38px', width: 'auto', fontSize: '0.8125rem' }}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">{language === 'en' ? 'All Statuses' : 'Todos los Estados'}</option>
                <option value="approved">{language === 'en' ? 'Approved' : 'Aprobado'}</option>
                <option value="pending">{language === 'en' ? 'Pending' : 'Pendiente'}</option>
              </select>
            </div>
          </div>

          {/* Coverages Grid */}
          {filteredCoverages.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                padding: '4rem 2rem',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#ecfdf5',
                  border: '2px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto',
                  color: '#059669'
                }}
              >
                <RotateCw size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                {language === 'en' ? 'No coverage requests found' : 'No se encontraron registros de suplencias'}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
                {language === 'en'
                  ? 'All shifts are running normally with titular practitioners assigned.'
                  : 'Todos los turnos están siendo cubiertos por el personal titular habitual.'}
              </p>
              <button
                type="button"
                onClick={() => setCoverageModal({ isOpen: true, coverage: null })}
                className="btn btn-primary"
                style={{ backgroundColor: '#0f766e' }}
              >
                <Plus size={16} />
                <span>{language === 'en' ? 'Assign Substitute' : 'Asignar Sustituto / Relevo'}</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1.25rem' }}>
              {filteredCoverages.map(cov => (
                <div
                  key={cov.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '1rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            backgroundColor: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <RotateCw size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase' }}>
                            {cov.reasonType === 'congress'
                              ? 'Congreso / Capacitación'
                              : cov.reasonType === 'vacation'
                              ? 'Vacaciones'
                              : cov.reasonType === 'medical_leave'
                              ? 'Incapacidad Médica'
                              : cov.reasonType === 'emergency'
                              ? 'Emergencia'
                              : 'Permuta de Turno'}
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                            📅 {cov.date} ({cov.shiftHours})
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          backgroundColor: cov.status === 'approved' ? '#ecfdf5' : '#fef3c7',
                          color: cov.status === 'approved' ? '#047857' : '#b45309',
                          border: `1px solid ${cov.status === 'approved' ? '#a7f3d0' : '#fde68a'}`
                        }}
                      >
                        {cov.status === 'approved' ? (language === 'en' ? 'Approved' : 'Aprobado') : (language === 'en' ? 'Pending' : 'Pendiente')}
                      </span>
                    </div>

                    {/* Substitute Flow Diagram */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 1fr',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.875rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '0.75rem',
                        border: '1px solid #e2e8f0',
                        marginBottom: '0.75rem',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ padding: '0.35rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
                        <div style={{ fontSize: '0.65rem', color: '#b91c1c', fontWeight: 700 }}>TITULAR (AUSENTE)</div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>{cov.originalPractitionerName}</div>
                      </div>

                      <div style={{ color: '#0f766e', fontWeight: 900, fontSize: '1.2rem' }}>➔</div>

                      <div style={{ padding: '0.35rem', backgroundColor: '#ecfdf5', borderRadius: '0.5rem', border: '1px solid #a7f3d0' }}>
                        <div style={{ fontSize: '0.65rem', color: '#047857', fontWeight: 700 }}>SUSTITUTO (RELEVO)</div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>{cov.substitutePractitionerName}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.35rem' }}>
                      <strong>Motivo:</strong> {cov.reason}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      📍 {cov.locationName} • Autorizado por: {cov.approvedBy}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div
                    style={{
                      backgroundColor: '#fafafa',
                      borderTop: '1px solid #f1f5f9',
                      padding: '0.75rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '0.5rem'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setCoverageModal({ isOpen: true, coverage: cov })}
                      className="btn btn-primary btn-sm"
                      style={{ backgroundColor: '#0f766e', fontSize: '0.75rem', gap: '0.35rem' }}
                    >
                      <Edit3 size={13} />
                      <span>{language === 'en' ? 'Edit Relevo' : 'Editar Relevo'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCoverage(cov)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.35rem' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STAFF WORKING SHIFTS & ROSTER */}
      {/* ========================================================================= */}
      {activeTab === 'roster' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {staffList.map(staff => {
            const shiftConfig = SHIFT_TYPES[staff.shiftInfo?.shiftType] || SHIFT_TYPES.full_time;
            const daysMap = { monday: 'L', tuesday: 'M', wednesday: 'M', thursday: 'J', friday: 'V', saturday: 'S', sunday: 'D' };

            return (
              <div
                key={staff.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  padding: '1.25rem',
                  boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: staff.avatarBg || '#0f766e',
                        color: staff.avatarText || '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        flexShrink: 0
                      }}
                    >
                      {staff.givenName?.[0]}{staff.familyName?.[0]}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {getStaffFullName(staff)}
                      </h3>
                      <div style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 600 }}>
                        {staff.specialty || staff.primaryRole}
                      </div>
                    </div>
                  </div>

                  {/* Shift details */}
                  <div
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.625rem',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{shiftConfig.labelEs}</span>
                      <span style={{ color: '#0284c7', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {staff.shiftInfo?.startTime || '08:00'} - {staff.shiftInfo?.endTime || '17:00'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Días Laborables:</span>
                      <div style={{ display: 'flex', gap: '0.2rem' }}>
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(d => {
                          const isW = staff.shiftInfo?.workingDays?.includes(d);
                          return (
                            <span
                              key={d}
                              style={{
                                width: '17px',
                                height: '17px',
                                borderRadius: '3px',
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: isW ? '#ecfdf5' : '#f1f5f9',
                                color: isW ? '#047857' : '#94a3b8',
                                border: isW ? '1px solid #a7f3d0' : '1px solid #e2e8f0'
                              }}
                            >
                              {daysMap[d]}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>{staff.consultingRoom || 'Consultorio Clínico'}</span>
                  <button
                    type="button"
                    onClick={() => setAdminModal({ isOpen: true, practitioner: staff, tab: 'shift' })}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', gap: '0.25rem' }}
                  >
                    <Edit3 size={11} />
                    <span>Modificar Turno</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Practitioner Full Admin Modal (5 Tabs) */}
      <PractitionerAdminModal
        isOpen={adminModal.isOpen}
        onClose={() => setAdminModal({ isOpen: false, practitioner: null, tab: 'user' })}
        practitioner={adminModal.practitioner}
        initialTab={adminModal.tab}
        onSave={handleSavePractitioner}
      />

      {/* Fast Change Password Modal */}
      <ChangePasswordModal
        isOpen={passwordModal.isOpen}
        onClose={() => setPasswordModal({ isOpen: false, practitioner: null })}
        practitioner={passwordModal.practitioner}
        onPasswordChanged={handlePasswordChanged}
      />

      {/* Schedule Guard Modal */}
      <ScheduleGuardModal
        isOpen={guardModal.isOpen}
        onClose={() => setGuardModal({ isOpen: false, guard: null })}
        guard={guardModal.guard}
        onSave={handleSaveGuard}
      />

      {/* Coverage Request Modal */}
      <CoverageRequestModal
        isOpen={coverageModal.isOpen}
        onClose={() => setCoverageModal({ isOpen: false, coverage: null })}
        coverage={coverageModal.coverage}
        onSave={handleSaveCoverage}
      />

      {/* Universal Confirm Modal for Delete and Reset Actions */}
      <DeleteConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        warningText={confirmModal.warningText}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        icon={confirmModal.icon}
      />
    </div>
  );
}
