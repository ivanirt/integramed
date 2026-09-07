import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Award,
  GraduationCap,
  Clock,
  Key,
  Plus,
  Trash2,
  Check,
  Calendar,
  Building,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  RotateCcw,
  Stethoscope,
  Briefcase
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { CLINICAL_ROLES, SHIFT_TYPES, getStaffFullName } from '../../utils/staffStorage';

export default function PractitionerAdminModal({
  isOpen,
  onClose,
  practitioner, // null for create, object for edit
  initialTab = 'user',
  onSave
}) {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    prefix: 'Dr.',
    givenName: '',
    familyName: '',
    gender: 'male',
    email: '',
    secondaryEmail: '',
    phone: '',
    password: 'IntegraMed27',
    roles: ['doctor'],
    primaryRole: 'doctor',
    preferredLanguage: 'es',
    status: 'active',
    avatarBg: '#0f766e',
    avatarText: '#ffffff',
    // Especialidades
    specialty: '',
    subspecialties: [],
    license: '',
    specialtyLicense: '',
    university: '',
    yearsExperience: 5,
    consultingRoom: '',
    // Turno
    shiftInfo: {
      shiftType: 'full_time',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startTime: '08:00',
      endTime: '17:00',
      breakTime: '14:00 - 15:00',
      consultationDurationMin: 30
    },
    // Cursos
    courses: []
  });

  // State for adding subspecialty tag
  const [newSubspecialty, setNewSubspecialty] = useState('');

  // State for adding new course
  const [newCourse, setNewCourse] = useState({
    title: '',
    institution: '',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    hours: 30,
    status: 'vigente',
    credentialId: ''
  });
  const [isAddingCourse, setIsAddingCourse] = useState(false);

  // Password Show / Hide
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'user');
      setError('');
      setIsAddingCourse(false);
      setNewSubspecialty('');

      if (practitioner) {
        setFormData({
          id: practitioner.id || '',
          prefix: practitioner.prefix || 'Dr.',
          givenName: practitioner.givenName || '',
          familyName: practitioner.familyName || '',
          gender: practitioner.gender || 'male',
          email: practitioner.email || '',
          secondaryEmail: practitioner.secondaryEmail || '',
          phone: practitioner.phone || '',
          password: practitioner.password || 'IntegraMed27',
          roles: practitioner.roles || ['doctor'],
          primaryRole: practitioner.primaryRole || practitioner.roles?.[0] || 'doctor',
          preferredLanguage: practitioner.preferredLanguage || 'es',
          status: practitioner.status || 'active',
          avatarBg: practitioner.avatarBg || '#0f766e',
          avatarText: practitioner.avatarText || '#ffffff',
          specialty: practitioner.specialty || '',
          subspecialties: Array.isArray(practitioner.subspecialties) ? [...practitioner.subspecialties] : [],
          license: practitioner.license || '',
          specialtyLicense: practitioner.specialtyLicense || '',
          university: practitioner.university || '',
          yearsExperience: practitioner.yearsExperience || 5,
          consultingRoom: practitioner.consultingRoom || '',
          shiftInfo: practitioner.shiftInfo ? { ...practitioner.shiftInfo } : {
            shiftType: 'full_time',
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            startTime: '08:00',
            endTime: '17:00',
            breakTime: '14:00 - 15:00',
            consultationDurationMin: 30
          },
          courses: Array.isArray(practitioner.courses) ? [...practitioner.courses] : []
        });
      } else {
        // New Practitioner default
        const randomColor = ['#0f766e', '#0369a1', '#be123c', '#d97706', '#6d28d9', '#4f46e5'][Math.floor(Math.random() * 6)];
        setFormData({
          id: `staff-${Date.now()}`,
          prefix: 'Dr.',
          givenName: '',
          familyName: '',
          gender: 'male',
          email: '',
          secondaryEmail: '',
          phone: '+52 55 ',
          password: 'IntegraMed27',
          roles: ['doctor'],
          primaryRole: 'doctor',
          preferredLanguage: 'es',
          status: 'active',
          avatarBg: randomColor,
          avatarText: '#ffffff',
          specialty: 'Medicina General',
          subspecialties: [],
          license: 'Céd. Prof. ',
          specialtyLicense: '',
          university: '',
          yearsExperience: 4,
          consultingRoom: 'Consultorio Clínico',
          shiftInfo: {
            shiftType: 'morning',
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            startTime: '08:00',
            endTime: '15:00',
            breakTime: '12:00 - 12:30',
            consultationDurationMin: 30
          },
          courses: []
        });
      }
    }
  }, [isOpen, practitioner, initialTab]);

  if (!isOpen) return null;

  const handleRoleToggle = (roleId) => {
    setFormData(prev => {
      let currentRoles = [...prev.roles];
      if (currentRoles.includes(roleId)) {
        if (currentRoles.length === 1) return prev; // Keep at least one
        currentRoles = currentRoles.filter(r => r !== roleId);
      } else {
        currentRoles.push(roleId);
      }
      const primaryRole = currentRoles.includes(prev.primaryRole) ? prev.primaryRole : currentRoles[0];
      return { ...prev, roles: currentRoles, primaryRole };
    });
  };

  const handleDayToggle = (dayKey) => {
    setFormData(prev => {
      const days = [...(prev.shiftInfo?.workingDays || [])];
      let updatedDays;
      if (days.includes(dayKey)) {
        if (days.length === 1) return prev;
        updatedDays = days.filter(d => d !== dayKey);
      } else {
        updatedDays = [...days, dayKey];
      }
      return {
        ...prev,
        shiftInfo: {
          ...prev.shiftInfo,
          workingDays: updatedDays
        }
      };
    });
  };

  const handleAddSubspecialty = () => {
    if (!newSubspecialty.trim()) return;
    if (!formData.subspecialties.includes(newSubspecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        subspecialties: [...prev.subspecialties, newSubspecialty.trim()]
      }));
    }
    setNewSubspecialty('');
  };

  const handleRemoveSubspecialty = (index) => {
    setFormData(prev => ({
      ...prev,
      subspecialties: prev.subspecialties.filter((_, i) => i !== index)
    }));
  };

  const handleAddCourse = (e) => {
    e.preventDefault();
    if (!newCourse.title.trim()) return;
    const courseItem = {
      id: `course-${Date.now()}`,
      title: newCourse.title.trim(),
      institution: newCourse.institution.trim() || 'Institución Médica',
      issueDate: newCourse.issueDate || new Date().toISOString().split('T')[0],
      expiryDate: newCourse.expiryDate || '',
      hours: Number(newCourse.hours) || 20,
      status: newCourse.status || 'vigente',
      credentialId: newCourse.credentialId.trim() || `CERT-${Math.floor(Math.random() * 90000 + 10000)}`
    };

    setFormData(prev => ({
      ...prev,
      courses: [courseItem, ...prev.courses]
    }));

    setNewCourse({
      title: '',
      institution: '',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      hours: 30,
      status: 'vigente',
      credentialId: ''
    });
    setIsAddingCourse(false);
  };

  const handleRemoveCourse = (courseId) => {
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.filter(c => c.id !== courseId)
    }));
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let generated = 'Med';
    for (let i = 0; i < 7; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: generated }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.givenName.trim() || !formData.familyName.trim()) {
      setError(language === 'en' ? 'First name and Last name are required' : 'El nombre y apellidos son requeridos');
      setActiveTab('user');
      return;
    }

    if (!formData.email.trim()) {
      setError(language === 'en' ? 'Email is required' : 'El correo electrónico es requerido');
      setActiveTab('user');
      return;
    }

    onSave(formData);
    onClose();
  };

  const tabs = [
    { id: 'user', labelEs: 'Información de Usuario', labelEn: 'User Profile', icon: User },
    { id: 'specialty', labelEs: 'Especialidades & Cédulas', labelEn: 'Specialties & License', icon: GraduationCap },
    { id: 'courses', labelEs: `Cursos & Certificaciones (${formData.courses?.length || 0})`, labelEn: `Courses & CME (${formData.courses?.length || 0})`, icon: Award },
    { id: 'shift', labelEs: 'Turno & Horarios', labelEn: 'Shift & Hours', icon: Clock },
    { id: 'security', labelEs: 'Seguridad & Contraseña', labelEn: 'Password & Security', icon: Key }
  ];

  const daysWeek = [
    { key: 'monday', shortEs: 'Lun', shortEn: 'Mon' },
    { key: 'tuesday', shortEs: 'Mar', shortEn: 'Tue' },
    { key: 'wednesday', shortEs: 'Mié', shortEn: 'Wed' },
    { key: 'thursday', shortEs: 'Jue', shortEn: 'Thu' },
    { key: 'friday', shortEs: 'Vie', shortEn: 'Fri' },
    { key: 'saturday', shortEs: 'Sáb', shortEn: 'Sat' },
    { key: 'sunday', shortEs: 'Dom', shortEn: 'Sun' }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1040,
        padding: '1.25rem',
        animation: 'fadeIn 0.15s ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'slideUp 0.2s ease'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fafafa'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: formData.avatarBg || '#0f766e',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.1rem',
                flexShrink: 0
              }}
            >
              {formData.givenName ? `${formData.givenName[0]}${formData.familyName?.[0] || ''}` : <Stethoscope size={22} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {practitioner
                  ? `${language === 'en' ? 'Edit Practitioner:' : 'Editar Profesional:'} ${getStaffFullName(formData)}`
                  : (language === 'en' ? 'Register New Clinical Practitioner' : 'Registrar Nuevo Profesional Clínico')}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                {language === 'en'
                  ? 'Manage specialties, CME courses, assigned shift, and access credentials'
                  : 'Gestión de especialidades, cursos, turno asignado y credenciales de acceso'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '0.375rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            padding: '0 1rem',
            overflowX: 'auto',
            gap: '0.25rem'
          }}
        >
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.85rem 1rem',
                  fontSize: '0.84rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#047857' : '#64748b',
                  border: 'none',
                  borderBottom: active ? '2px solid #047857' : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} color={active ? '#047857' : '#94a3b8'} />
                <span>{language === 'en' ? tab.labelEn : tab.labelEs}</span>
              </button>
            );
          })}
        </div>

        {/* Error Notification */}
        {error && (
          <div
            style={{
              margin: '1rem 1.75rem 0',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Scrollable Body Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>

            {/* TAB 1: INFORMACIÓN DE USUARIO */}
            {activeTab === 'user' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'Prefix' : 'Prefijo / Título'}
                    </label>
                    <select
                      className="form-input"
                      value={formData.prefix}
                      onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                    >
                      <option value="Dr.">Dr.</option>
                      <option value="Dra.">Dra.</option>
                      <option value="Lic.">Lic.</option>
                      <option value="Enf.">Enf.</option>
                      <option value="QFB.">QFB.</option>
                      <option value="Ing.">Ing.</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'First / Given Name' : 'Nombre(s) *'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.givenName}
                      onChange={(e) => setFormData({ ...formData, givenName: e.target.value })}
                      placeholder="Ej. Jesús"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'Last / Family Name' : 'Apellidos *'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.familyName}
                      onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                      placeholder="Ej. Robledo Morales"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'Gender' : 'Género'}
                    </label>
                    <select
                      className="form-input"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="male">{language === 'en' ? 'Male' : 'Masculino'}</option>
                      <option value="female">{language === 'en' ? 'Female' : 'Femenino'}</option>
                      <option value="other">{language === 'en' ? 'Other' : 'Otro'}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'Mobile Phone' : 'Teléfono Móvil'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="tel"
                        className="form-input"
                        style={{ paddingLeft: '2.2rem' }}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+52 55 5234 8100"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'Account Status' : 'Estado de Cuenta'}
                    </label>
                    <select
                      className="form-input"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="active">{language === 'en' ? 'Active' : 'Activo'}</option>
                      <option value="on_call">{language === 'en' ? 'On Call' : 'En Guardia'}</option>
                      <option value="leave">{language === 'en' ? 'On Leave / Vacation' : 'Permiso / Vacaciones'}</option>
                      <option value="inactive">{language === 'en' ? 'Inactive' : 'Inactivo'}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'Language' : 'Idioma'}
                    </label>
                    <select
                      className="form-input"
                      value={formData.preferredLanguage || 'es'}
                      onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                    >
                      <option value="es">🇲🇽 Español</option>
                      <option value="en">🇺🇸 English</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'Institutional Email (Login ID) *' : 'Correo Institucional (ID Acceso) *'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="email"
                        className="form-input"
                        style={{ paddingLeft: '2.2rem' }}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="nombre@integramed.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'Secondary / Personal Email' : 'Correo Secundario / Notificaciones'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="email"
                        className="form-input"
                        style={{ paddingLeft: '2.2rem' }}
                        value={formData.secondaryEmail}
                        onChange={(e) => setFormData({ ...formData, secondaryEmail: e.target.value })}
                        placeholder="personal@clinica.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Roles Assignment (Multi-role support) */}
                <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                    {language === 'en' ? 'Clinical Roles & Permissions (Multi-role)' : 'Roles Clínicos y Funciones (Multi-rol)'}
                  </label>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.875rem' }}>
                    {language === 'en'
                      ? 'Select all roles this practitioner can perform. They will be able to switch duties in session.'
                      : 'Seleccione todos los roles que puede desempeñar este usuario en la clínica.'}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {Object.values(CLINICAL_ROLES).map(role => {
                      const isSelected = formData.roles.includes(role.id);
                      const isPrimary = formData.primaryRole === role.id;

                      return (
                        <div
                          key={role.id}
                          onClick={() => handleRoleToggle(role.id)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '0.625rem',
                            border: isSelected ? `2px solid ${role.color}` : '1px solid #cbd5e1',
                            backgroundColor: isSelected ? role.bgColor : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: role.color }} />
                            <span style={{ fontSize: '0.8125rem', fontWeight: isSelected ? 700 : 500, color: '#0f172a' }}>
                              {language === 'en' ? role.labelEn : role.labelEs}
                            </span>
                          </div>
                          {isSelected && (
                            <CheckCircle2 size={16} color={role.color} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {formData.roles.length > 1 && (
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
                        {language === 'en' ? 'Default Primary Role:' : 'Rol Primario por Defecto:'}
                      </span>
                      <select
                        className="form-input"
                        style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }}
                        value={formData.primaryRole}
                        onChange={(e) => setFormData({ ...formData, primaryRole: e.target.value })}
                      >
                        {formData.roles.map(rId => {
                          const r = CLINICAL_ROLES[rId];
                          return (
                            <option key={rId} value={rId}>
                              {language === 'en' ? r?.labelEn : r?.labelEs}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ESPECIALIDADES & CÉDULAS */}
            {activeTab === 'specialty' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    {language === 'en' ? 'Main Specialty / Clinical Title *' : 'Especialidad Principal o Título Clínico *'}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    placeholder="Ej. Medicina Interna & Dirección Médica"
                    required
                  />
                </div>

                {/* Subspecialties / Tags */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    {language === 'en' ? 'Subspecialties & Areas of Expertise' : 'Subespecialidades y Áreas de Enfoque Clínico'}
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={newSubspecialty}
                      onChange={(e) => setNewSubspecialty(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubspecialty();
                        }
                      }}
                      placeholder="Ej. Cardiología Preventiva, Cuidados Críticos..."
                    />
                    <button
                      type="button"
                      onClick={handleAddSubspecialty}
                      className="btn btn-secondary"
                      style={{ flexShrink: 0, gap: '0.35rem' }}
                    >
                      <Plus size={15} />
                      <span>{language === 'en' ? 'Add' : 'Agregar'}</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '32px' }}>
                    {formData.subspecialties?.map((sub, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.65rem',
                          backgroundColor: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#065f46',
                          borderRadius: '9999px',
                          fontSize: '0.8125rem',
                          fontWeight: 600
                        }}
                      >
                        {sub}
                        <button
                          type="button"
                          onClick={() => handleRemoveSubspecialty(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#047857',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex'
                          }}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                    {formData.subspecialties?.length === 0 && (
                      <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        {language === 'en' ? 'No subspecialties added yet' : 'Sin subespecialidades añadidas'}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'General Professional License (Cédula)' : 'Cédula Profesional General'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.license}
                      onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                      placeholder="Céd. Prof. 7849201-ESP"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'Specialty License (Cédula de Especialidad)' : 'Cédula de Especialidad'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.specialtyLicense}
                      onChange={(e) => setFormData({ ...formData, specialtyLicense: e.target.value })}
                      placeholder="Céd. Esp. 948102-INT"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'Alma Mater / Medical School' : 'Universidad / Institución de Egreso'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.university}
                      onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                      placeholder="Ej. UNAM / Tecnológico de Monterrey"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'Years of Experience' : 'Años de Experiencia'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      className="form-input"
                      value={formData.yearsExperience}
                      onChange={(e) => setFormData({ ...formData, yearsExperience: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    {language === 'en' ? 'Assigned Consulting Room / Department' : 'Consultorio o Gabinete Clínico Asignado'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2.2rem' }}
                      value={formData.consultingRoom}
                      onChange={(e) => setFormData({ ...formData, consultingRoom: e.target.value })}
                      placeholder="Ej. Consultorio 101 (Ala Médica Principal)"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CURSOS & CERTIFICACIONES */}
            {activeTab === 'courses' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {language === 'en' ? 'Medical CME Courses & Certifications' : 'Cursos y Certificaciones Médicas Registradas'}
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                      {language === 'en' ? 'Track ongoing medical education, credentials, and expiry dates.' : 'Historial de educación médica continua, certificados de soporte vital y vigencias.'}
                    </p>
                  </div>

                  {!isAddingCourse && (
                    <button
                      type="button"
                      onClick={() => setIsAddingCourse(true)}
                      className="btn btn-primary btn-sm"
                      style={{ backgroundColor: '#0f766e', gap: '0.35rem' }}
                    >
                      <Plus size={14} />
                      <span>{language === 'en' ? 'Add Course' : 'Agregar Curso'}</span>
                    </button>
                  )}
                </div>

                {/* Form to Add New Course */}
                {isAddingCourse && (
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.75rem',
                      border: '1.5px solid #0d9488',
                      padding: '1.25rem',
                      animation: 'fadeIn 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Award size={16} />
                        {language === 'en' ? 'New Course Details' : 'Datos del Nuevo Curso / Certificación'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingCourse(false)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                          {language === 'en' ? 'Course / Certification Title *' : 'Nombre del Curso / Certificación *'}
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={newCourse.title}
                          onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                          placeholder="Ej. Soporte Vital Cardiovascular Avanzado (ACLS)"
                          required
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                            {language === 'en' ? 'Issuing Institution' : 'Institución Emisora'}
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            value={newCourse.institution}
                            onChange={(e) => setNewCourse({ ...newCourse, institution: e.target.value })}
                            placeholder="Ej. American Heart Association"
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                            {language === 'en' ? 'Credential / Folio ID' : 'Folio / ID de Certificado'}
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            value={newCourse.credentialId}
                            onChange={(e) => setNewCourse({ ...newCourse, credentialId: e.target.value })}
                            placeholder="Ej. AHA-ACLS-88492"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                            {language === 'en' ? 'Issue Date' : 'Fecha Emisión'}
                          </label>
                          <input
                            type="date"
                            className="form-input"
                            value={newCourse.issueDate}
                            onChange={(e) => setNewCourse({ ...newCourse, issueDate: e.target.value })}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                            {language === 'en' ? 'Expiry Date' : 'Fecha Expiración'}
                          </label>
                          <input
                            type="date"
                            className="form-input"
                            value={newCourse.expiryDate}
                            onChange={(e) => setNewCourse({ ...newCourse, expiryDate: e.target.value })}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                            {language === 'en' ? 'Hours / Credits' : 'Horas / Créditos'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            className="form-input"
                            value={newCourse.hours}
                            onChange={(e) => setNewCourse({ ...newCourse, hours: parseInt(e.target.value) || 0 })}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                            {language === 'en' ? 'Status' : 'Estado'}
                          </label>
                          <select
                            className="form-input"
                            value={newCourse.status}
                            onChange={(e) => setNewCourse({ ...newCourse, status: e.target.value })}
                          >
                            <option value="vigente">{language === 'en' ? 'Active' : 'Vigente'}</option>
                            <option value="por_vencer">{language === 'en' ? 'Expiring Soon' : 'Por Vencer'}</option>
                            <option value="vencido">{language === 'en' ? 'Expired' : 'Vencido'}</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setIsAddingCourse(false)}
                          className="btn btn-secondary btn-sm"
                        >
                          {language === 'en' ? 'Cancel' : 'Cancelar'}
                        </button>
                        <button
                          type="button"
                          onClick={handleAddCourse}
                          className="btn btn-primary btn-sm"
                          style={{ backgroundColor: '#0f766e' }}
                        >
                          {language === 'en' ? 'Save Course' : 'Guardar Curso'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Courses List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {formData.courses?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px dashed #cbd5e1' }}>
                      <Award size={36} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                      <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                        {language === 'en' ? 'No courses or certifications registered yet.' : 'No hay cursos o certificaciones registradas.'}
                      </p>
                    </div>
                  ) : (
                    formData.courses?.map(c => {
                      const isVigente = c.status === 'vigente';
                      const isPorVencer = c.status === 'por_vencer';

                      return (
                        <div
                          key={c.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem 1.25rem',
                            backgroundColor: '#ffffff',
                            borderRadius: '0.75rem',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '8px',
                                backgroundColor: isVigente ? '#ecfdf5' : isPorVencer ? '#fef3c7' : '#fef2f2',
                                border: `1px solid ${isVigente ? '#a7f3d0' : isPorVencer ? '#fde68a' : '#fecaca'}`,
                                color: isVigente ? '#047857' : isPorVencer ? '#b45309' : '#b91c1c',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              <Award size={18} />
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                                  {c.title}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '9999px',
                                    backgroundColor: isVigente ? '#ecfdf5' : isPorVencer ? '#fef3c7' : '#fef2f2',
                                    color: isVigente ? '#047857' : isPorVencer ? '#b45309' : '#b91c1c',
                                    border: `1px solid ${isVigente ? '#a7f3d0' : isPorVencer ? '#fde68a' : '#fecaca'}`
                                  }}
                                >
                                  {isVigente ? (language === 'en' ? 'Active' : 'Vigente') : isPorVencer ? (language === 'en' ? 'Expiring Soon' : 'Por Vencer') : (language === 'en' ? 'Expired' : 'Vencido')}
                                </span>
                              </div>

                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <span>{c.institution}</span>
                                {c.hours && <span>• {c.hours} {language === 'en' ? 'hours CME' : 'horas curriculares'}</span>}
                                {c.credentialId && <span>• Folio: <code style={{ fontFamily: 'var(--font-mono)' }}>{c.credentialId}</code></span>}
                                {c.expiryDate && <span>• Vigencia: {c.expiryDate}</span>}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveCourse(c.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '0.4rem',
                              borderRadius: '0.375rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.15s ease'
                            }}
                            title={language === 'en' ? 'Delete Course' : 'Eliminar Curso'}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: TURNO & HORARIOS */}
            {activeTab === 'shift' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                    {language === 'en' ? 'Assigned Shift Type' : 'Tipo de Turno Asignado'}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {Object.values(SHIFT_TYPES).map(shift => {
                      const isSelected = formData.shiftInfo?.shiftType === shift.id;

                      return (
                        <div
                          key={shift.id}
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            shiftInfo: {
                              ...prev.shiftInfo,
                              shiftType: shift.id
                            }
                          }))}
                          style={{
                            padding: '0.875rem 1rem',
                            borderRadius: '0.75rem',
                            border: isSelected ? `2px solid ${shift.color}` : '1px solid #cbd5e1',
                            backgroundColor: isSelected ? shift.bgColor : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                              {language === 'en' ? shift.labelEn : shift.labelEs}
                            </span>
                            {isSelected && <CheckCircle2 size={16} color={shift.color} />}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {shift.defaultHours}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Working Days Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                    {language === 'en' ? 'Working Days of Week' : 'Días Laborables de la Semana'}
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {daysWeek.map(d => {
                      const isActive = formData.shiftInfo?.workingDays?.includes(d.key);

                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => handleDayToggle(d.key)}
                          style={{
                            padding: '0.55rem 1rem',
                            borderRadius: '0.5rem',
                            border: isActive ? '1.5px solid #059669' : '1px solid #cbd5e1',
                            backgroundColor: isActive ? '#ecfdf5' : '#ffffff',
                            color: isActive ? '#047857' : '#475569',
                            fontWeight: isActive ? 800 : 500,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {language === 'en' ? d.shortEn : d.shortEs}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'Start Time' : 'Hora de Entrada'}
                    </label>
                    <input
                      type="time"
                      className="form-input"
                      value={formData.shiftInfo?.startTime || '08:00'}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        shiftInfo: { ...prev.shiftInfo, startTime: e.target.value }
                      }))}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'End Time' : 'Hora de Salida'}
                    </label>
                    <input
                      type="time"
                      className="form-input"
                      value={formData.shiftInfo?.endTime || '17:00'}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        shiftInfo: { ...prev.shiftInfo, endTime: e.target.value }
                      }))}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'Break / Meal Time' : 'Receso / Comida'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.shiftInfo?.breakTime || '14:00 - 15:00'}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        shiftInfo: { ...prev.shiftInfo, breakTime: e.target.value }
                      }))}
                      placeholder="14:00 - 15:00"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'Avg. Appointment Duration' : 'Duración Estimada por Consulta'}
                    </label>
                    <select
                      className="form-input"
                      value={formData.shiftInfo?.consultationDurationMin || 30}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        shiftInfo: { ...prev.shiftInfo, consultationDurationMin: parseInt(e.target.value) || 30 }
                      }))}
                    >
                      <option value="15">15 {language === 'en' ? 'minutes (Triage / Lab)' : 'minutos (Triage / Laboratorio)'}</option>
                      <option value="20">20 {language === 'en' ? 'minutes (Fast Follow-up)' : 'minutos (Revisión rápida)'}</option>
                      <option value="30">30 {language === 'en' ? 'minutes (Standard Consultation)' : 'minutos (Consulta estándar)'}</option>
                      <option value="45">45 {language === 'en' ? 'minutes (Physiotherapy / Specialty)' : 'minutos (Terapia / Especialidad)'}</option>
                      <option value="60">60 {language === 'en' ? 'minutes (Initial Comprehensive Assessment)' : 'minutos (Primera vez / Integral)'}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {language === 'en' ? 'Room / Station Assignment' : 'Consultorio o Estación'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.consultingRoom}
                      onChange={(e) => setFormData({ ...formData, consultingRoom: e.target.value })}
                      placeholder="Consultorio 101"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: SEGURIDAD & CONTRASEÑA */}
            {activeTab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '1.25rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {language === 'en' ? 'User Access Credentials' : 'Credenciales de Acceso del Profesional'}
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                      {language === 'en'
                        ? 'Users can sign in with their institutional email and assigned password.'
                        : 'El usuario podrá autenticarse con su correo institucional y esta contraseña.'}
                    </p>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    {language === 'en' ? 'Access Password' : 'Contraseña de Acceso'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Key size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      style={{ paddingLeft: '2.4rem', paddingRight: '2.5rem' }}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, password: 'IntegraMed27' })}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', gap: '0.35rem', backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}
                  >
                    <RotateCcw size={13} />
                    <span>{language === 'en' ? 'Set to IntegraMed27' : 'Usar IntegraMed27'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', gap: '0.35rem', color: '#0369a1', borderColor: '#bae6fd', backgroundColor: '#f0f9ff' }}
                  >
                    <Sparkles size={13} />
                    <span>{language === 'en' ? 'Generate Random Password' : 'Generar Contraseña Aleatoria'}</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Modal Footer Actions */}
          <div
            style={{
              padding: '1rem 1.75rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fafafa'
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {practitioner ? `ID: ${practitioner.id}` : (language === 'en' ? 'New practitioner profile' : 'Nuevo registro clínico')}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                {language === 'en' ? 'Cancel' : 'Cancelar'}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ backgroundColor: '#0f766e' }}
              >
                <Check size={16} strokeWidth={2.5} />
                <span>{language === 'en' ? 'Save Practitioner' : 'Guardar Profesional'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
