import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  User,
  Users,
  Shield,
  ShieldCheck,
  Key,
  Globe,
  Clock,
  Mail,
  Phone,
  Building,
  Award,
  GraduationCap,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Activity,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  ChevronRight,
  UserCheck,
  Briefcase,
  Layers,
  Bell,
  Sliders,
  LogOut,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  CLINICAL_ROLES,
  SHIFT_TYPES,
  getStaffFullName,
  getStaffList
} from '../utils/staffStorage';
import { INTEGRATIVE_MODALITIES, getStaffAiSecrets, saveStaffAiSecrets, getEnabledClinicModalityIds, DEFAULT_AI_BASE_URL, DEFAULT_AI_MODEL } from '../utils/integrativeMedicine';
import PractitionerAdminModal from '../components/practitioners/PractitionerAdminModal';
import ChangePasswordModal from '../components/practitioners/ChangePasswordModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function UserProfileAdminPage({ addToast }) {
  const { language, t, setLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    currentUser,
    activeRole,
    staffList,
    savePractitioner,
    updatePassword,
    updateUserLanguage,
    updateConsultationDuration,
    switchUser,
    deletePractitioner,
    resetStaff
  } = useAuth();

  // Tab determination from query parameter ?tab=my_profile | all_users | roles_permissions
  const getInitialTab = () => {
    try {
      const params = new URLSearchParams(location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['my_profile', 'all_users', 'roles_permissions'].includes(tabParam)) {
        return tabParam;
      }
      if (location.pathname === '/usuarios' || location.pathname === '/users') {
        return 'all_users';
      }
    } catch (e) {}
    return 'my_profile';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['my_profile', 'all_users', 'roles_permissions'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    } catch (e) {}
  }, [location.search]);

  // Confirmation Modal State
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

  // =========================================================================
  // TAB 1: MI PERFIL (MY PROFILE EDIT FORM)
  // =========================================================================
  const [profileForm, setProfileForm] = useState({
    prefix: 'Dr.',
    givenName: '',
    familyName: '',
    gender: 'male',
    email: '',
    secondaryEmail: '',
    phone: '',
    whatsapp: '',
    emergencyContact: '',
    emergencyRelationship: '',
    // Profesional
    specialty: '',
    subspecialtiesText: '',
    license: '',
    specialtyLicense: '',
    university: '',
    yearsExperience: 0,
    consultingRoom: '',
    bio: '',
    // Preferencias
    preferredLanguage: 'es',
    consultationDurationMin: 30,
    notifyWhatsApp: true,
    notifyEmail: true,
    notifyLabAlerts: true,
    integrativeModalities: [],
    aiBaseUrl: DEFAULT_AI_BASE_URL,
    aiModel: DEFAULT_AI_MODEL,
    aiApiKey: '',
    // Color
    avatarBg: '#0f766e',
    avatarText: '#ffffff'
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Synchronize active profile form with currentUser data
  useEffect(() => {
    if (currentUser) {
      const secrets = getStaffAiSecrets(currentUser.id);
      setProfileForm({
        prefix: currentUser.prefix || 'Dr.',
        givenName: currentUser.givenName || '',
        familyName: currentUser.familyName || '',
        gender: currentUser.gender || 'male',
        email: currentUser.email || '',
        secondaryEmail: currentUser.secondaryEmail || '',
        phone: currentUser.phone || '',
        whatsapp: currentUser.whatsapp || currentUser.phone || '',
        emergencyContact: currentUser.emergencyContact || '',
        emergencyRelationship: currentUser.emergencyRelationship || 'Familiar',
        specialty: currentUser.specialty || '',
        subspecialtiesText: (currentUser.subspecialties || []).join(', '),
        license: currentUser.license || '',
        specialtyLicense: currentUser.specialtyLicense || '',
        university: currentUser.university || '',
        yearsExperience: currentUser.yearsExperience || 0,
        consultingRoom: currentUser.consultingRoom || '',
        bio: currentUser.bio || '',
        preferredLanguage: currentUser.preferredLanguage || 'es',
        consultationDurationMin: currentUser.shiftInfo?.consultationDurationMin || 30,
        notifyWhatsApp: currentUser.preferences?.notifyWhatsApp ?? true,
        notifyEmail: currentUser.preferences?.notifyEmail ?? true,
        notifyLabAlerts: currentUser.preferences?.notifyLabAlerts ?? true,
        integrativeModalities: currentUser.integrativeModalities || [],
        aiBaseUrl: secrets.aiBaseUrl,
        aiModel: secrets.aiModel,
        aiApiKey: secrets.aiApiKey,
        avatarBg: currentUser.avatarBg || '#0f766e',
        avatarText: currentUser.avatarText || '#ffffff'
      });
    }
  }, [currentUser]);

  const handleProfileFormChange = (field, value) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  // Change language dynamically from profile
  const handleLanguageChange = (newLang) => {
    setProfileForm(prev => ({ ...prev, preferredLanguage: newLang }));
    if (updateUserLanguage) {
      updateUserLanguage(newLang);
    } else {
      setLanguage(newLang);
    }
    if (addToast) {
      addToast(
        'success',
        newLang === 'en' ? 'Language updated to English' : 'Idioma actualizado a Español',
        newLang === 'en' ? 'Preference Saved' : 'Preferencia Guardada'
      );
    }
  };

  // Quick duration selection
  const handleDurationSelect = (mins) => {
    setProfileForm(prev => ({ ...prev, consultationDurationMin: mins }));
    if (currentUser) {
      updateConsultationDuration(currentUser.id, mins);
      if (addToast) {
        addToast(
          'success',
          language === 'en'
            ? `Standard consultation duration set to ${mins} minutes`
            : `Duración estándar fijada en ${mins} minutos`,
          language === 'en' ? 'Duration Saved' : 'Duración Guardada'
        );
      }
    }
  };

  // Save current user profile
  const handleSaveMyProfile = (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSavingProfile(true);
    try {
      const subspecs = profileForm.subspecialtiesText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const updatedRecord = {
        ...currentUser,
        prefix: profileForm.prefix,
        givenName: profileForm.givenName.trim(),
        familyName: profileForm.familyName.trim(),
        gender: profileForm.gender,
        email: profileForm.email.trim(),
        secondaryEmail: profileForm.secondaryEmail.trim(),
        phone: profileForm.phone.trim(),
        whatsapp: profileForm.whatsapp.trim(),
        emergencyContact: profileForm.emergencyContact.trim(),
        emergencyRelationship: profileForm.emergencyRelationship.trim(),
        specialty: profileForm.specialty.trim(),
        subspecialties: subspecs,
        license: profileForm.license.trim(),
        specialtyLicense: profileForm.specialtyLicense.trim(),
        university: profileForm.university.trim(),
        yearsExperience: Number(profileForm.yearsExperience) || 0,
        consultingRoom: profileForm.consultingRoom.trim(),
        bio: profileForm.bio.trim(),
        preferredLanguage: profileForm.preferredLanguage,
        avatarBg: profileForm.avatarBg,
        avatarText: profileForm.avatarText,
        shiftInfo: {
          ...(currentUser.shiftInfo || {}),
          consultationDurationMin: Number(profileForm.consultationDurationMin) || 30
        },
        preferences: {
          notifyWhatsApp: profileForm.notifyWhatsApp,
          notifyEmail: profileForm.notifyEmail,
          notifyLabAlerts: profileForm.notifyLabAlerts
        },
        integrativeModalities: profileForm.integrativeModalities || [],
        aiBaseUrl: profileForm.aiBaseUrl,
        aiModel: profileForm.aiModel
      };

      saveStaffAiSecrets(currentUser.id, {
        aiApiKey: profileForm.aiApiKey,
        aiBaseUrl: profileForm.aiBaseUrl,
        aiModel: profileForm.aiModel
      });
      savePractitioner(updatedRecord);

      // Ensure language is updated in context
      if (profileForm.preferredLanguage !== language) {
        if (updateUserLanguage) {
          updateUserLanguage(profileForm.preferredLanguage);
        } else {
          setLanguage(profileForm.preferredLanguage);
        }
      }

      if (addToast) {
        addToast(
          'success',
          language === 'en'
            ? 'Your profile information has been successfully updated.'
            : 'Los datos de tu perfil han sido actualizados exitosamente.',
          language === 'en' ? 'Profile Updated' : 'Perfil Actualizado'
        );
      }
    } catch (err) {
      if (addToast) {
        addToast('error', err.message || 'Error saving profile', 'Error');
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Profile Password Form State
  const [passwordState, setPasswordState] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrent: false,
    showNew: false,
    showConfirm: false,
    error: '',
    isSaving: false
  });

  const handlePasswordChangeSubmit = (e) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!passwordState.currentPassword) {
      setPasswordState(prev => ({
        ...prev,
        error: language === 'en' ? 'Please enter your current password' : 'Por favor ingresa tu contraseña actual'
      }));
      return;
    }

    const validCurrent = currentUser.password || 'IntegraMed27';
    if (
      passwordState.currentPassword !== validCurrent &&
      passwordState.currentPassword !== 'IntegraMed27'
    ) {
      setPasswordState(prev => ({
        ...prev,
        error:
          language === 'en'
            ? 'Current password does not match (Hint: master password is IntegraMed27)'
            : 'La contraseña actual no coincide (Nota: la contraseña maestra es IntegraMed27)'
      }));
      return;
    }

    if (passwordState.newPassword.length < 6) {
      setPasswordState(prev => ({
        ...prev,
        error:
          language === 'en'
            ? 'New password must be at least 6 characters'
            : 'La nueva contraseña debe tener al menos 6 caracteres'
      }));
      return;
    }

    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setPasswordState(prev => ({
        ...prev,
        error: language === 'en' ? 'New passwords do not match' : 'Las nuevas contraseñas no coinciden'
      }));
      return;
    }

    setPasswordState(prev => ({ ...prev, isSaving: true, error: '' }));
    try {
      updatePassword(currentUser.id, passwordState.newPassword);
      setPasswordState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        showCurrent: false,
        showNew: false,
        showConfirm: false,
        error: '',
        isSaving: false
      });
      if (addToast) {
        addToast(
          'success',
          language === 'en'
            ? 'Your password has been changed successfully'
            : 'Tu contraseña ha sido actualizada con éxito',
          language === 'en' ? 'Security Updated' : 'Seguridad Actualizada'
        );
      }
    } catch (err) {
      setPasswordState(prev => ({ ...prev, isSaving: false, error: err.message }));
    }
  };

  // =========================================================================
  // TAB 2: DIRECTORIO Y GESTIÓN DE TODOS LOS USUARIOS (ALL USERS DIRECTORY)
  // =========================================================================
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');

  // Modals for managing other users
  const [adminModal, setAdminModal] = useState({
    isOpen: false,
    practitioner: null,
    tab: 'user'
  });

  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    practitioner: null
  });

  // Filtered staff directory
  const filteredUsers = useMemo(() => {
    return (staffList || []).filter(staff => {
      if (selectedRole !== 'all' && !staff.roles?.includes(selectedRole) && staff.primaryRole !== selectedRole) {
        return false;
      }
      if (selectedStatus !== 'all' && (staff.status || 'active') !== selectedStatus) {
        return false;
      }
      if (selectedShift !== 'all' && staff.shiftInfo?.shiftType !== selectedShift) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = getStaffFullName(staff).toLowerCase();
        const spec = (staff.specialty || '').toLowerCase();
        const email = (staff.email || '').toLowerCase();
        const phone = (staff.phone || '').toLowerCase();
        const lic = (staff.license || '').toLowerCase();
        return (
          fullName.includes(q) ||
          spec.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          lic.includes(q)
        );
      }
      return true;
    });
  }, [staffList, selectedRole, selectedStatus, selectedShift, searchQuery]);

  // Statistics
  const userStats = useMemo(() => {
    const list = staffList || [];
    const total = list.length;
    const active = list.filter(s => s.status === 'active' || !s.status).length;
    const doctors = list.filter(s => s.roles?.includes('doctor') || s.roles?.includes('therapist')).length;
    const nurses = list.filter(s => s.roles?.includes('nurse')).length;
    const admins = list.filter(s => s.roles?.includes('admin')).length;
    return { total, active, doctors, nurses, admins };
  }, [staffList]);

  // Handler to toggle active/inactive status
  const handleToggleUserStatus = (userObj) => {
    const currentStatus = userObj.status || 'active';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const updated = { ...userObj, status: newStatus };
    savePractitioner(updated);
    if (addToast) {
      addToast(
        'info',
        language === 'en'
          ? `User ${getStaffFullName(userObj)} is now ${newStatus === 'active' ? 'Active' : 'Inactive'}`
          : `El usuario ${getStaffFullName(userObj)} ahora está ${newStatus === 'active' ? 'Activo' : 'Inactivo'}`,
        language === 'en' ? 'Status Updated' : 'Estado Actualizado'
      );
    }
  };

  // Handler to switch session to selected user
  const handleSwitchToUser = (targetUser) => {
    switchUser(targetUser.id);
    if (addToast) {
      addToast(
        'success',
        language === 'en'
          ? `Switched session to ${getStaffFullName(targetUser)} (${targetUser.email})`
          : `Sesión cambiada a ${getStaffFullName(targetUser)} (${targetUser.email})`,
        language === 'en' ? 'User Switched' : 'Usuario Cambiado'
      );
    }
  };

  // Handler to delete user with visual confirmation modal
  const handleDeleteUser = (targetUser) => {
    const name = getStaffFullName(targetUser);
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Delete User Profile' : 'Eliminar Perfil de Usuario',
      message: language === 'en'
        ? `Are you sure you want to permanently delete the profile of ${name} (${targetUser.email})?`
        : `¿Estás seguro de que deseas eliminar permanentemente el perfil de ${name} (${targetUser.email})?`,
      warningText: language === 'en'
        ? 'This user will no longer be able to log in or access clinical records.'
        : 'Este usuario ya no podrá iniciar sesión ni acceder al sistema clínico.',
      confirmText: language === 'en' ? 'Delete User' : 'Eliminar Usuario',
      variant: 'danger',
      icon: 'trash',
      onConfirm: () => {
        deletePractitioner(targetUser.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast(
            'info',
            language === 'en' ? `User ${name} has been deleted.` : `El usuario ${name} ha sido eliminado.`,
            language === 'en' ? 'User Deleted' : 'Usuario Eliminado'
          );
        }
      }
    });
  };

  // Handler to reset demo staff data
  const handleResetStaffConfirm = () => {
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Reset Demo Users Directory' : 'Restablecer Catálogo de Usuarios',
      message: language === 'en'
        ? 'This will restore all default clinical and administrative staff users.'
        : 'Esto restaurará todos los usuarios médicos y administrativos de muestra originales.',
      warningText: language === 'en'
        ? 'Any custom created user accounts will be reset to the default demo state.'
        : 'Cualquier usuario creado recientemente se restablecerá a los valores iniciales de prueba.',
      confirmText: language === 'en' ? 'Reset Demo' : 'Restablecer Catálogo',
      variant: 'warning',
      icon: 'reset',
      onConfirm: () => {
        resetStaff();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast(
            'info',
            language === 'en' ? 'User directory reset to default demo records.' : 'Catálogo de usuarios restablecido a valores iniciales.',
            language === 'en' ? 'Reset Complete' : 'Restablecimiento Completo'
          );
        }
      }
    });
  };

  // Avatar initials helper
  const getInitials = (userObj) => {
    if (!userObj) return 'U';
    const first = (userObj.givenName || '')[0] || '';
    const last = (userObj.familyName || '')[0] || '';
    return `${first}${last}`.toUpperCase() || 'U';
  };

  return (
    <div style={{ padding: '1.75rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Banner / Current User Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem 1.75rem',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: currentUser?.avatarBg || '#0f766e',
              color: currentUser?.avatarText || '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 800,
              boxShadow: '0 4px 10px rgba(15, 118, 110, 0.25)',
              border: '3px solid #ffffff',
              flexShrink: 0
            }}
          >
            {getInitials(currentUser)}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                {currentUser ? getStaffFullName(currentUser) : 'Usuario'}
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #bbf7d0'
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                {language === 'en' ? 'Active Session' : 'Sesión Activa'}
              </span>
              <span
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  border: '1px solid #bae6fd'
                }}
              >
                {currentUser?.preferredLanguage === 'en' ? '🇺🇸 English' : '🇲🇽 Español'}
              </span>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: '#0f766e' }}>
                {currentUser?.specialty || (language === 'en' ? 'Clinical Staff' : 'Personal Clínico')}
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Mail size={13} color="#64748b" />
                {currentUser?.email}
              </span>
              {currentUser?.phone && (
                <>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Phone size={13} color="#64748b" />
                    {currentUser?.phone}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions for current user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('my_profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.8125rem',
              fontWeight: 700,
              backgroundColor: activeTab === 'my_profile' ? '#0f766e' : '#ffffff',
              color: activeTab === 'my_profile' ? '#ffffff' : '#334155',
              border: activeTab === 'my_profile' ? '1px solid #0f766e' : '1px solid #cbd5e1',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease'
            }}
          >
            <User size={15} />
            <span>{language === 'en' ? 'My Profile' : 'Mi Perfil'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all_users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.8125rem',
              fontWeight: 700,
              backgroundColor: activeTab === 'all_users' ? '#0f766e' : '#ffffff',
              color: activeTab === 'all_users' ? '#ffffff' : '#334155',
              border: activeTab === 'all_users' ? '1px solid #0f766e' : '1px solid #cbd5e1',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease'
            }}
          >
            <Users size={15} />
            <span>{language === 'en' ? 'Manage Users' : 'Gestionar Usuarios'}</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '1.25rem',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1.75rem',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}
      >
        <button
          onClick={() => setActiveTab('my_profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 0.5rem',
            border: 'none',
            background: 'transparent',
            fontSize: '0.9375rem',
            fontWeight: activeTab === 'my_profile' ? 800 : 600,
            color: activeTab === 'my_profile' ? '#0f766e' : '#64748b',
            borderBottom: activeTab === 'my_profile' ? '3px solid #0f766e' : '3px solid transparent',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <User size={18} color={activeTab === 'my_profile' ? '#0f766e' : '#64748b'} />
          <span>{language === 'en' ? 'My Profile & Preferences' : 'Mi Perfil & Preferencias'}</span>
        </button>

        <button
          onClick={() => setActiveTab('all_users')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 0.5rem',
            border: 'none',
            background: 'transparent',
            fontSize: '0.9375rem',
            fontWeight: activeTab === 'all_users' ? 800 : 600,
            color: activeTab === 'all_users' ? '#0f766e' : '#64748b',
            borderBottom: activeTab === 'all_users' ? '3px solid #0f766e' : '3px solid transparent',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Users size={18} color={activeTab === 'all_users' ? '#0f766e' : '#64748b'} />
          <span>{language === 'en' ? `All Users (${staffList.length})` : `Directorio de Usuarios (${staffList.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('roles_permissions')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 0.5rem',
            border: 'none',
            background: 'transparent',
            fontSize: '0.9375rem',
            fontWeight: activeTab === 'roles_permissions' ? 800 : 600,
            color: activeTab === 'roles_permissions' ? '#0f766e' : '#64748b',
            borderBottom: activeTab === 'roles_permissions' ? '3px solid #0f766e' : '3px solid transparent',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Shield size={18} color={activeTab === 'roles_permissions' ? '#0f766e' : '#64748b'} />
          <span>{language === 'en' ? 'Roles & System Permissions' : 'Roles & Permisos del Sistema'}</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: MI PERFIL (MY PROFILE VIEW & EDITOR)
          ========================================================================= */}
      {activeTab === 'my_profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {/* Columna Izquierda: Datos Personales, Clínicos y Preferencias */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', gridColumn: 'span 2' }}>
            <form onSubmit={handleSaveMyProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Sección 1: Datos Personales & Contacto */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '0.875rem',
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <User size={18} color="#0f766e" />
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {language === 'en' ? 'Personal & Contact Information' : 'Información Personal y de Contacto'}
                  </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label className="form-label">{language === 'en' ? 'Title / Prefix' : 'Título / Prefijo'}</label>
                    <select
                      className="form-input"
                      value={profileForm.prefix}
                      onChange={(e) => handleProfileFormChange('prefix', e.target.value)}
                    >
                      <option value="Dr.">Dr.</option>
                      <option value="Dra.">Dra.</option>
                      <option value="Lic.">Lic.</option>
                      <option value="Enf.">Enf.</option>
                      <option value="Mtro.">Mtro.</option>
                      <option value="Mtra.">Mtra.</option>
                      <option value="Téc.">Téc.</option>
                      <option value="">(Sin título)</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">{language === 'en' ? 'First / Given Name' : 'Nombre(s)'}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileForm.givenName}
                      onChange={(e) => handleProfileFormChange('givenName', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">{language === 'en' ? 'Last / Family Name' : 'Apellidos'}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileForm.familyName}
                      onChange={(e) => handleProfileFormChange('familyName', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">{language === 'en' ? 'Gender' : 'Género'}</label>
                    <select
                      className="form-input"
                      value={profileForm.gender}
                      onChange={(e) => handleProfileFormChange('gender', e.target.value)}
                    >
                      <option value="male">{language === 'en' ? 'Male' : 'Masculino'}</option>
                      <option value="female">{language === 'en' ? 'Female' : 'Femenino'}</option>
                      <option value="other">{language === 'en' ? 'Other' : 'Otro'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">{language === 'en' ? 'Primary Email (Login User)' : 'Correo Principal (Usuario Login)'}</label>
                    <input
                      type="email"
                      className="form-input"
                      value={profileForm.email}
                      onChange={(e) => handleProfileFormChange('email', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">{language === 'en' ? 'Secondary / Personal Email' : 'Correo Secundario / Personal'}</label>
                    <input
                      type="email"
                      className="form-input"
                      value={profileForm.secondaryEmail}
                      onChange={(e) => handleProfileFormChange('secondaryEmail', e.target.value)}
                      placeholder="correo.personal@gmail.com"
                    />
                  </div>

                  <div>
                    <label className="form-label">{language === 'en' ? 'Phone / Mobile' : 'Teléfono de Contacto'}</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={profileForm.phone}
                      onChange={(e) => handleProfileFormChange('phone', e.target.value)}
                      placeholder="+52 55 1234 5678"
                    />
                  </div>

                  <div>
                    <label className="form-label">{language === 'en' ? 'WhatsApp for Clinical Alerts' : 'WhatsApp para Alertas Clínicas'}</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={profileForm.whatsapp}
                      onChange={(e) => handleProfileFormChange('whatsapp', e.target.value)}
                      placeholder="+52 55 9876 5432"
                    />
                  </div>

                  <div>
                    <label className="form-label">{language === 'en' ? 'Emergency Contact Name' : 'Contacto de Emergencia'}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileForm.emergencyContact}
                      onChange={(e) => handleProfileFormChange('emergencyContact', e.target.value)}
                      placeholder="ej. Dra. Carmen Silva"
                    />
                  </div>

                  <div>
                    <label className="form-label">{language === 'en' ? 'Relationship' : 'Parentesco / Relación'}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileForm.emergencyRelationship}
                      onChange={(e) => handleProfileFormChange('emergencyRelationship', e.target.value)}
                      placeholder="ej. Cónyuge, Familiar, Colega"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Perfil Profesional & Especialidad Médica */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '0.875rem',
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <Award size={18} color="#0f766e" />
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {language === 'en' ? 'Professional & Clinical Credentials' : 'Perfil Profesional y Credenciales Clínicas'}
                  </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">{language === 'en' ? 'Primary Medical Specialty / Department' : 'Especialidad Médica Principal o Área'}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileForm.specialty}
                      onChange={(e) => handleProfileFormChange('specialty', e.target.value)}
                      placeholder="ej. Medicina Interna & Dirección Médica, Cardiología Clínica..."
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">{language === 'en' ? 'Subspecialties & Clinical Focus (Comma separated)' : 'Subespecialidades y Enfoques Clínicos (Separados por coma)'}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileForm.subspecialtiesText}
                      onChange={(e) => handleProfileFormChange('subspecialtiesText', e.target.value)}
                      placeholder="ej. Cardiología Preventiva, Metabolismo Clínico, Cuidados Críticos"
                    />
                  </div>

                  <div>
                    <label className="form-label">{language === 'en' ? 'Professional License Number (Cédula)' : 'Cédula Profesional General'}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileForm.license}
                      onChange={(e) => handleProfileFormChange('license', e.target.value)}
                      placeholder="Céd. Prof. 7849201"
                    />
                  </div>

                  <div>
                    <label className="form-label">{language === 'en' ? 'Specialty License (Cédula Especialidad)' : 'Cédula de Especialidad'}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileForm.specialtyLicense}
                      onChange={(e) => handleProfileFormChange('specialtyLicense', e.target.value)}
                      placeholder="Céd. Esp. 948102-INT"
                    />
                  </div>

                  <div>
                    <label className="form-label">{language === 'en' ? 'Alma Mater / University' : 'Universidad / Alma Máter'}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileForm.university}
                      onChange={(e) => handleProfileFormChange('university', e.target.value)}
                      placeholder="ej. Universidad Nacional Autónoma de México (UNAM)"
                    />
                  </div>

                  <div>
                    <label className="form-label">{language === 'en' ? 'Years of Experience' : 'Años de Experiencia Clínica'}</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      className="form-input"
                      value={profileForm.yearsExperience}
                      onChange={(e) => handleProfileFormChange('yearsExperience', e.target.value)}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">{language === 'en' ? 'Assigned Consulting Room / Office' : 'Consultorio Asignado / Ubicación Interna'}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileForm.consultingRoom}
                      onChange={(e) => handleProfileFormChange('consultingRoom', e.target.value)}
                      placeholder="ej. Consultorio 101 (Ala Médica Principal - Planta Baja)"
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">{language === 'en' ? 'Professional Bio / Summary' : 'Semblanza o Biografía Profesional'}</label>
                    <textarea
                      rows={3}
                      className="form-input"
                      style={{ resize: 'vertical' }}
                      value={profileForm.bio}
                      onChange={(e) => handleProfileFormChange('bio', e.target.value)}
                      placeholder={language === 'en' ? 'Brief description of clinical background, research, and expertise...' : 'Breve resumen de trayectoria clínica, áreas de investigación y atención...'}
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Preferencias del Sistema & Idioma */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '0.875rem',
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <Sliders size={18} color="#0f766e" />
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {language === 'en' ? 'Account Preferences & Consultation Settings' : 'Preferencias de la Cuenta y Parámetros de Consulta'}
                  </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Idioma de la Cuenta */}
                  <div>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Globe size={14} color="#0f766e" />
                      <span>{language === 'en' ? 'Account Language (Persisted in User Profile)' : 'Idioma de la Cuenta (Guardado en el Perfil)'}</span>
                    </label>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '-0.2rem', marginBottom: '0.6rem' }}>
                      {language === 'en'
                        ? 'Selecting a language here will immediately switch the whole clinical application interface and save it to your user account.'
                        : 'Al cambiar el idioma aquí, se actualizará de inmediato toda la interfaz de la aplicación y se guardará como tu preferencia.'}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxWidth: '400px' }}>
                      <button
                        type="button"
                        onClick={() => handleLanguageChange('es')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          padding: '0.7rem 1rem',
                          borderRadius: '0.6rem',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          border: profileForm.preferredLanguage === 'es' ? '2px solid #0f766e' : '1px solid #e2e8f0',
                          backgroundColor: profileForm.preferredLanguage === 'es' ? '#ecfdf5' : '#ffffff',
                          color: profileForm.preferredLanguage === 'es' ? '#065f46' : '#64748b',
                          cursor: 'pointer',
                          boxShadow: profileForm.preferredLanguage === 'es' ? '0 2px 5px rgba(15, 118, 110, 0.15)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>🇲🇽</span>
                        <span>Español (México)</span>
                        {profileForm.preferredLanguage === 'es' && <Check size={16} color="#0f766e" strokeWidth={3} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLanguageChange('en')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          padding: '0.7rem 1rem',
                          borderRadius: '0.6rem',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          border: profileForm.preferredLanguage === 'en' ? '2px solid #0f766e' : '1px solid #e2e8f0',
                          backgroundColor: profileForm.preferredLanguage === 'en' ? '#ecfdf5' : '#ffffff',
                          color: profileForm.preferredLanguage === 'en' ? '#065f46' : '#64748b',
                          cursor: 'pointer',
                          boxShadow: profileForm.preferredLanguage === 'en' ? '0 2px 5px rgba(15, 118, 110, 0.15)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>🇺🇸</span>
                        <span>English (US)</span>
                        {profileForm.preferredLanguage === 'en' && <Check size={16} color="#0f766e" strokeWidth={3} />}
                      </button>
                    </div>
                  </div>

                  {/* Duración de Consulta */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={14} color="#0f766e" />
                      <span>{language === 'en' ? 'My Expected Consultation Duration' : 'Mi Duración Esperada de Consulta por Paciente'}</span>
                    </label>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '-0.2rem', marginBottom: '0.6rem' }}>
                      {language === 'en'
                        ? 'Default time allocated per appointment slot when scheduling consultations with you.'
                        : 'Tiempo predeterminado asignado en la agenda para cada una de tus citas.'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {[15, 20, 30, 45, 60, 90].map((mins) => {
                        const isSelected = Number(profileForm.consultationDurationMin) === mins;
                        return (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => handleDurationSelect(mins)}
                            style={{
                              padding: '0.5rem 1rem',
                              borderRadius: '0.5rem',
                              fontSize: '0.8125rem',
                              fontWeight: isSelected ? 800 : 600,
                              backgroundColor: isSelected ? '#0f766e' : '#f8fafc',
                              color: isSelected ? '#ffffff' : '#334155',
                              border: isSelected ? '1px solid #0f766e' : '1px solid #cbd5e1',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {mins} min
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notificaciones */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                      <Bell size={14} color="#0f766e" />
                      <span>{language === 'en' ? 'Notification & Alert Preferences' : 'Preferencias de Notificaciones y Alertas'}</span>
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8125rem', color: '#334155', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={profileForm.notifyWhatsApp}
                          onChange={(e) => handleProfileFormChange('notifyWhatsApp', e.target.checked)}
                          style={{ accentColor: '#0f766e', width: '16px', height: '16px' }}
                        />
                        <span>{language === 'en' ? 'Send WhatsApp reminders for upcoming scheduled appointments' : 'Enviar recordatorios de citas por WhatsApp'}</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8125rem', color: '#334155', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={profileForm.notifyLabAlerts}
                          onChange={(e) => handleProfileFormChange('notifyLabAlerts', e.target.checked)}
                          style={{ accentColor: '#0f766e', width: '16px', height: '16px' }}
                        />
                        <span>{language === 'en' ? 'Critical lab results and diagnostic alert notifications' : 'Notificaciones de resultados de laboratorio críticos y diagnósticos'}</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8125rem', color: '#334155', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={profileForm.notifyEmail}
                          onChange={(e) => handleProfileFormChange('notifyEmail', e.target.checked)}
                          style={{ accentColor: '#0f766e', width: '16px', height: '16px' }}
                        />
                        <span>{language === 'en' ? 'Weekly shift summary and clinic announcements via email' : 'Resumen semanal de turnos y avisos de la clínica por correo electrónico'}</span>
                      </label>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sparkles size={14} color="#0f766e" />
                      <span>{language === 'en' ? 'Integrative medicines for clinical AI' : 'Medicinas integrativas para la IA clínica'}</span>
                    </label>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '-0.2rem', marginBottom: '0.6rem' }}>
                      {language === 'en'
                        ? 'The assistant only searches vault notes tagged with these modalities (plus general notes).'
                        : 'La IA busca notas del vault. Si eliges modalidades, filtra por esas etiquetas (p. ej. mtc). Si no eliges ninguna, busca en todo el vault.'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {INTEGRATIVE_MODALITIES.filter((mod) => getEnabledClinicModalityIds().includes(mod.id)
                        || (profileForm.integrativeModalities || []).includes(mod.id)).map((mod) => {
                        const selected = (profileForm.integrativeModalities || []).includes(mod.id);
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => {
                              const current = profileForm.integrativeModalities || [];
                              handleProfileFormChange(
                                'integrativeModalities',
                                selected ? current.filter((id) => id !== mod.id) : [...current, mod.id]
                              );
                            }}
                            style={{
                              border: selected ? '1.5px solid #0f766e' : '1px solid #e2e8f0',
                              backgroundColor: selected ? '#ecfdf5' : '#ffffff',
                              color: selected ? '#0f766e' : '#475569',
                              borderRadius: '9999px',
                              padding: '0.4rem 0.85rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {language === 'en' ? mod.labelEn : mod.labelEs}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Key size={14} color="#0f766e" />
                      <span>{language === 'en' ? 'AI model (OpenAI-compatible)' : 'Modelo de IA (compatible con OpenAI)'}</span>
                    </label>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '-0.2rem', marginBottom: '0.75rem' }}>
                      {language === 'en'
                        ? 'API key is stored only on this device, never on the FHIR server. Base URL must include /v1 for OpenAI, Groq, OpenRouter, or Ollama.'
                        : 'La API key se guarda solo en este dispositivo, nunca en FHIR. La URL base debe incluir /v1 (OpenAI, Groq, OpenRouter u Ollama).'}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '520px' }}>
                      <div>
                        <label className="form-label">Base URL</label>
                        <input
                          type="url"
                          className="form-input"
                          value={profileForm.aiBaseUrl}
                          onChange={(e) => handleProfileFormChange('aiBaseUrl', e.target.value)}
                          placeholder={DEFAULT_AI_BASE_URL}
                        />
                      </div>
                      <div>
                        <label className="form-label">{language === 'en' ? 'Model' : 'Modelo'}</label>
                        <input
                          type="text"
                          className="form-input"
                          value={profileForm.aiModel}
                          onChange={(e) => handleProfileFormChange('aiModel', e.target.value)}
                          placeholder={DEFAULT_AI_MODEL}
                        />
                      </div>
                      <div>
                        <label className="form-label">API key</label>
                        <input
                          type="password"
                          className="form-input"
                          value={profileForm.aiApiKey}
                          onChange={(e) => handleProfileFormChange('aiApiKey', e.target.value)}
                          placeholder="sk-..."
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón Guardar Perfil */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: '#0f766e',
                    gap: '0.5rem',
                    padding: '0.75rem 2rem',
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)'
                  }}
                >
                  <Save size={17} />
                  <span>{isSavingProfile ? (language === 'en' ? 'Saving...' : 'Guardando...') : (language === 'en' ? 'Save Profile Changes' : 'Guardar Cambios de Mi Perfil')}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Columna Derecha: Seguridad, Contraseña y Turno Actual */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Tarjeta de Seguridad y Cambio de Contraseña */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <Key size={18} color="#0f766e" />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {language === 'en' ? 'Change Password' : 'Cambiar Contraseña'}
                </h2>
              </div>

              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.75rem',
                  color: '#475569',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <ShieldCheck size={16} color="#0f766e" />
                <span>
                  {language === 'en'
                    ? 'Default master password: '
                    : 'Contraseña maestra predeterminada: '}
                  <strong style={{ color: '#0f766e' }}>IntegraMed27</strong>
                </span>
              </div>

              {passwordState.error && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: '0.78rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <AlertCircle size={15} />
                  <span>{passwordState.error}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChangeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label className="form-label">{language === 'en' ? 'Current Password' : 'Contraseña Actual'}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={passwordState.showCurrent ? 'text' : 'password'}
                      className="form-input"
                      value={passwordState.currentPassword}
                      onChange={(e) => setPasswordState(prev => ({ ...prev, currentPassword: e.target.value, error: '' }))}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordState(prev => ({ ...prev, showCurrent: !prev.showCurrent }))}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      {passwordState.showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label">{language === 'en' ? 'New Password' : 'Nueva Contraseña'}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={passwordState.showNew ? 'text' : 'password'}
                      className="form-input"
                      value={passwordState.newPassword}
                      onChange={(e) => setPasswordState(prev => ({ ...prev, newPassword: e.target.value, error: '' }))}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordState(prev => ({ ...prev, showNew: !prev.showNew }))}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      {passwordState.showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label">{language === 'en' ? 'Confirm New Password' : 'Confirmar Nueva Contraseña'}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={passwordState.showConfirm ? 'text' : 'password'}
                      className="form-input"
                      value={passwordState.confirmPassword}
                      onChange={(e) => setPasswordState(prev => ({ ...prev, confirmPassword: e.target.value, error: '' }))}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordState(prev => ({ ...prev, showConfirm: !prev.showConfirm }))}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      {passwordState.showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passwordState.isSaving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '0.4rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Lock size={14} />
                  <span>{passwordState.isSaving ? (language === 'en' ? 'Updating...' : 'Actualizando...') : (language === 'en' ? 'Update Password' : 'Actualizar Contraseña')}</span>
                </button>
              </form>
            </div>

            {/* Tarjeta de Turno y Horario Asignado */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <Clock size={18} color="#0f766e" />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {language === 'en' ? 'Assigned Shift & Hours' : 'Turno y Horarios Asignados'}
                </h2>
              </div>

              {currentUser?.shiftInfo ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{language === 'en' ? 'Shift Type:' : 'Tipo de Turno:'}</span>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: SHIFT_TYPES[currentUser.shiftInfo.shiftType]?.bgColor || '#ecfdf5',
                        color: SHIFT_TYPES[currentUser.shiftInfo.shiftType]?.color || '#0f766e'
                      }}
                    >
                      {SHIFT_TYPES[currentUser.shiftInfo.shiftType]?.[language === 'en' ? 'labelEn' : 'labelEs'] || currentUser.shiftInfo.shiftType}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{language === 'en' ? 'Working Hours:' : 'Horario Habitual:'}</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                      {currentUser.shiftInfo.startTime || '08:00'} - {currentUser.shiftInfo.endTime || '17:00'}
                    </span>
                  </div>

                  {currentUser.shiftInfo.breakTime && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                      <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{language === 'en' ? 'Break / Meal:' : 'Receso / Almuerzo:'}</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                        {currentUser.shiftInfo.breakTime}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate('/practitioners?tab=guards')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      backgroundColor: '#f1f5f9',
                      color: '#0f766e',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      marginTop: '0.25rem'
                    }}
                  >
                    <span>{language === 'en' ? 'View Full Shift & Guards Schedule' : 'Ver Rol Completo de Turnos y Guardias'}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  {language === 'en' ? 'No specific shift schedule assigned.' : 'Sin horario de turno específico asignado.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: DIRECTORIO Y GESTIÓN DE TODOS LOS USUARIOS (ALL USERS DIRECTORY)
          ========================================================================= */}
      {activeTab === 'all_users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* KPI Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                {language === 'en' ? 'Total Users' : 'Total de Usuarios'}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '0.25rem 0' }}>
                {userStats.total}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                {userStats.active} {language === 'en' ? 'active accounts' : 'cuentas activas'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                {language === 'en' ? 'Medical Staff' : 'Personal Médico'}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0284c7', margin: '0.25rem 0' }}>
                {userStats.doctors}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {language === 'en' ? 'Doctors & specialists' : 'Doctores y terapeutas'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                {language === 'en' ? 'Nursing & Labs' : 'Enfermería & Laboratorio'}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#059669', margin: '0.25rem 0' }}>
                {userStats.nurses}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {language === 'en' ? 'Clinical support' : 'Apoyo clínico y triage'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                {language === 'en' ? 'Administrators' : 'Administradores'}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#dc2626', margin: '0.25rem 0' }}>
                {userStats.admins}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {language === 'en' ? 'Full system access' : 'Acceso total al sistema'}
              </div>
            </div>
          </div>

          {/* Search, Filter & Action Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'en' ? 'Search user by name, email, specialty, license...' : 'Buscar usuario por nombre, correo, especialidad, cédula...'}
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                  />
                </div>

                <select
                  className="form-input"
                  style={{ width: 'auto', minWidth: '150px' }}
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="all">{language === 'en' ? 'All Roles' : 'Todos los Roles'}</option>
                  {Object.entries(CLINICAL_ROLES).map(([key, r]) => (
                    <option key={key} value={key}>
                      {language === 'en' ? r.labelEn : r.labelEs}
                    </option>
                  ))}
                </select>

                <select
                  className="form-input"
                  style={{ width: 'auto', minWidth: '130px' }}
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">{language === 'en' ? 'All Status' : 'Todos los Estados'}</option>
                  <option value="active">{language === 'en' ? 'Active' : 'Activo'}</option>
                  <option value="inactive">{language === 'en' ? 'Inactive' : 'Inactivo'}</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleResetStaffConfirm}
                  title={language === 'en' ? 'Reset demo staff data' : 'Restaurar catálogo inicial de usuarios'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    backgroundColor: '#f8fafc',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={14} />
                  <span>{language === 'en' ? 'Reset Demo' : 'Restaurar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminModal({ isOpen: true, practitioner: null, tab: 'user' })}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: '#0f766e',
                    gap: '0.4rem',
                    padding: '0.55rem 1.1rem',
                    fontSize: '0.8125rem',
                    fontWeight: 700
                  }}
                >
                  <Plus size={16} />
                  <span>{language === 'en' ? 'New User Profile' : 'Nuevo Usuario'}</span>
                </button>
              </div>
            </div>

            {/* Users Directory Table */}
            <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '0.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{language === 'en' ? 'User / Practitioner' : 'Usuario / Profesional'}</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{language === 'en' ? 'Roles & Specialty' : 'Roles & Especialidad'}</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{language === 'en' ? 'Assigned Shift' : 'Turno Asignado'}</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{language === 'en' ? 'Language' : 'Idioma'}</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{language === 'en' ? 'Status' : 'Estado'}</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'right' }}>{language === 'en' ? 'Actions' : 'Acciones'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
                        {language === 'en' ? 'No user profiles found matching your search.' : 'No se encontraron perfiles de usuario que coincidan con la búsqueda.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((userObj) => {
                      const isCurrentUser = currentUser?.id === userObj.id;
                      const userRoleKey = userObj.primaryRole || userObj.roles?.[0] || 'doctor';
                      const roleConfig = CLINICAL_ROLES[userRoleKey] || CLINICAL_ROLES.doctor;
                      const shiftConfig = SHIFT_TYPES[userObj.shiftInfo?.shiftType];
                      const isActive = (userObj.status || 'active') === 'active';

                      return (
                        <tr
                          key={userObj.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isCurrentUser ? '#f0fdf4' : '#ffffff',
                            transition: 'background-color 0.12s ease'
                          }}
                        >
                          {/* Usuario / Avatar / Nombre */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  backgroundColor: userObj.avatarBg || '#0f766e',
                                  color: userObj.avatarText || '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.85rem',
                                  fontWeight: 800,
                                  flexShrink: 0
                                }}
                              >
                                {getInitials(userObj)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span>{getStaffFullName(userObj)}</span>
                                  {isCurrentUser && (
                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                                      {language === 'en' ? 'YOU' : 'TÚ'}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {userObj.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Roles & Especialidad */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  width: 'fit-content',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  backgroundColor: roleConfig.bgColor,
                                  color: roleConfig.color
                                }}
                              >
                                {language === 'en' ? roleConfig.labelEn : roleConfig.labelEs}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>
                                {userObj.specialty || 'General'}
                              </span>
                            </div>
                          </td>

                          {/* Turno */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            {shiftConfig ? (
                              <div style={{ fontSize: '0.78rem' }}>
                                <span style={{ fontWeight: 600, color: shiftConfig.color }}>
                                  {language === 'en' ? shiftConfig.labelEn : shiftConfig.labelEs}
                                </span>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                  {userObj.shiftInfo?.startTime || '08:00'} - {userObj.shiftInfo?.endTime || '17:00'}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>-</span>
                            )}
                          </td>

                          {/* Idioma */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
                              {userObj.preferredLanguage === 'en' ? '🇺🇸 English' : '🇲🇽 Español'}
                            </span>
                          </td>

                          {/* Estado */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(userObj)}
                              title={language === 'en' ? 'Click to toggle active status' : 'Clic para cambiar estado activo/inactivo'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '9999px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: isActive ? '#ecfdf5' : '#fef2f2',
                                color: isActive ? '#065f46' : '#991b1b',
                                border: isActive ? '1px solid #a7f3d0' : '1px solid #fecaca',
                                cursor: 'pointer',
                                transition: 'all 0.12s ease'
                              }}
                            >
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isActive ? '#10b981' : '#ef4444' }} />
                              <span>{isActive ? (language === 'en' ? 'Active' : 'Activo') : (language === 'en' ? 'Inactive' : 'Inactivo')}</span>
                            </button>
                          </td>

                          {/* Acciones */}
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                              {!isCurrentUser && (
                                <button
                                  type="button"
                                  onClick={() => handleSwitchToUser(userObj)}
                                  title={language === 'en' ? 'Switch active session to this user' : 'Iniciar sesión como este usuario'}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.35rem 0.6rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    backgroundColor: '#f0fdf4',
                                    color: '#0f766e',
                                    border: '1px solid #bbf7d0',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <UserCheck size={13} />
                                  <span>{language === 'en' ? 'Switch' : 'Cambiar a'}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setPasswordModal({ isOpen: true, practitioner: userObj })}
                                title={language === 'en' ? 'Change password' : 'Cambiar contraseña'}
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: '0.375rem',
                                  backgroundColor: '#f8fafc',
                                  color: '#475569',
                                  border: '1px solid #cbd5e1',
                                  cursor: 'pointer'
                                }}
                              >
                                <Key size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setAdminModal({ isOpen: true, practitioner: userObj, tab: 'user' })}
                                title={language === 'en' ? 'Edit full profile' : 'Editar perfil completo'}
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: '0.375rem',
                                  backgroundColor: '#f8fafc',
                                  color: '#0f766e',
                                  border: '1px solid #cbd5e1',
                                  cursor: 'pointer'
                                }}
                              >
                                <Edit3 size={14} />
                              </button>

                              {!isCurrentUser && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(userObj)}
                                  title={language === 'en' ? 'Delete user profile' : 'Eliminar perfil de usuario'}
                                  style={{
                                    padding: '0.35rem 0.5rem',
                                    borderRadius: '0.375rem',
                                    backgroundColor: '#fff1f2',
                                    color: '#e11d48',
                                    border: '1px solid #fecdd3',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ROLES Y PERMISOS DEL SISTEMA (ROLES & PERMISSIONS MATRIX)
          ========================================================================= */}
      {activeTab === 'roles_permissions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <ShieldCheck size={20} color="#0f766e" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {language === 'en' ? 'System Roles & Access Permissions Matrix' : 'Matriz de Roles y Permisos de Acceso al Sistema'}
              </h2>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.5rem' }}>
              {language === 'en'
                ? 'Overview of clinical, administrative, and pharmacy capabilities configured per user role across the IntegraMed platform.'
                : 'Resumen de capacidades clínicas, administrativas y farmacéuticas configuradas por cada rol de usuario en la plataforma IntegraMed.'}
            </p>

            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#0f172a' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{language === 'en' ? 'Role' : 'Rol'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{language === 'en' ? 'Clinical Records & SOAP' : 'Expediente & SOAP'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{language === 'en' ? 'Prescriptions & Rx' : 'Recetas & Rx'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{language === 'en' ? 'Labs & Diagnostics' : 'Labs & Diagnósticos'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{language === 'en' ? 'Pharmacy' : 'Farmacia'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{language === 'en' ? 'Shifts & Guards' : 'Turnos & Guardias'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{language === 'en' ? 'System Settings' : 'Configuración'}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      roleKey: 'doctor',
                      soap: 'Total (Crear, Editar, Firmar)',
                      rx: 'Total (Prescribir fármacos)',
                      labs: 'Solicitar & Interpretar',
                      pharmacy: 'Consulta de stock',
                      shifts: 'Ver rol & ausencias',
                      settings: 'Horarios personales'
                    },
                    {
                      roleKey: 'admin',
                      soap: 'Auditoría & Consulta',
                      rx: 'Auditoría de recetas',
                      labs: 'Gestión de catálogo',
                      pharmacy: 'Control total de inventario',
                      shifts: 'Gestión total de turnos',
                      settings: 'Configuración total'
                    },
                    {
                      roleKey: 'nurse',
                      soap: 'Signos vitales & Triage',
                      rx: 'Dispensación & Aplicación',
                      labs: 'Toma de muestras',
                      pharmacy: 'Solicitud de insumos',
                      shifts: 'Ver rol de guardias',
                      settings: 'Sin acceso'
                    },
                    {
                      roleKey: 'therapist',
                      soap: 'Notas de rehabilitación',
                      rx: 'Indicaciones terapéuticas',
                      labs: 'Consulta de estudios',
                      pharmacy: 'Insumos de terapia',
                      shifts: 'Ver agenda',
                      settings: 'Sin acceso'
                    },
                    {
                      roleKey: 'pharmacist',
                      soap: 'Sin acceso clínico',
                      rx: 'Validar & Surtir recetas',
                      labs: 'Sin acceso',
                      pharmacy: 'Control total de medicamentos',
                      shifts: 'Turnos de farmacia',
                      settings: 'Sin acceso'
                    },
                    {
                      roleKey: 'lab_tech',
                      soap: 'Sin acceso clínico',
                      rx: 'Sin acceso',
                      labs: 'Carga & Validación de resultados',
                      pharmacy: 'Reactivos clínicos',
                      shifts: 'Turnos de laboratorio',
                      settings: 'Sin acceso'
                    },
                    {
                      roleKey: 'receptionist',
                      soap: 'Padrón de pacientes & Citas',
                      rx: 'Impresión de recetas',
                      labs: 'Cobro & Citas de lab',
                      pharmacy: 'Sin acceso',
                      shifts: 'Agenda de médicos',
                      settings: 'Sin acceso'
                    }
                  ].map((row, idx) => {
                    const rConfig = CLINICAL_ROLES[row.roleKey] || CLINICAL_ROLES.doctor;
                    return (
                      <tr key={row.roleKey} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fbfcfd' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: rConfig.bgColor,
                              color: rConfig.color
                            }}
                          >
                            {language === 'en' ? rConfig.labelEn : rConfig.labelEs}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#334155' }}>{row.soap}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#334155' }}>{row.rx}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#334155' }}>{row.labs}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#334155' }}>{row.pharmacy}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#334155' }}>{row.shifts}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#334155' }}>{row.settings}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Practitioner Admin Modal for Creating or Editing another user */}
      {adminModal.isOpen && (
        <PractitionerAdminModal
          isOpen={adminModal.isOpen}
          onClose={() => setAdminModal({ isOpen: false, practitioner: null, tab: 'user' })}
          practitioner={adminModal.practitioner}
          initialTab={adminModal.tab}
          onSave={(practitionerData) => {
            savePractitioner(practitionerData);
            if (addToast) {
              addToast(
                'success',
                language === 'en' ? 'User record saved successfully' : 'Registro de usuario guardado exitosamente',
                language === 'en' ? 'User Saved' : 'Usuario Guardado'
              );
            }
          }}
        />
      )}

      {/* Change Password Modal for another user */}
      {passwordModal.isOpen && (
        <ChangePasswordModal
          isOpen={passwordModal.isOpen}
          onClose={() => setPasswordModal({ isOpen: false, practitioner: null })}
          practitioner={passwordModal.practitioner}
          onPasswordChanged={(practitioner, newPwd) => {
            updatePassword(practitioner.id, newPwd);
            if (addToast) {
              addToast(
                'success',
                language === 'en'
                  ? `Password updated for ${getStaffFullName(practitioner)}`
                  : `Contraseña actualizada para ${getStaffFullName(practitioner)}`,
                language === 'en' ? 'Password Changed' : 'Contraseña Actualizada'
              );
            }
          }}
        />
      )}

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
