import React, { useState, useMemo, useCallback } from 'react';
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
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { CLINICAL_ROLES, SHIFT_TYPES, getStaffFullName } from '../utils/staffStorage';
import PractitionerAdminModal from '../components/practitioners/PractitionerAdminModal';
import ChangePasswordModal from '../components/practitioners/ChangePasswordModal';

export default function PractitionersPage({ addToast, onOpenScheduleModal }) {
  const { language, t } = useLanguage();
  const {
    staffList,
    savePractitioner,
    updatePassword,
    deletePractitioner,
    resetStaff,
    refreshStaff
  } = useAuth();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

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

  // Statistics
  const stats = useMemo(() => {
    const list = staffList || [];
    const total = list.length;
    const active = list.filter(s => s.status === 'active' || !s.status).length;
    const doctors = list.filter(s => s.roles?.includes('doctor') || s.roles?.includes('therapist')).length;
    const nurses = list.filter(s => s.roles?.includes('nurse')).length;
    const totalCourses = list.reduce((acc, curr) => acc + (curr.courses?.length || 0), 0);
    return { total, active, doctors, nurses, totalCourses };
  }, [staffList]);

  // Save handler
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

  // Delete handler
  const handleDeletePractitioner = (staff) => {
    const name = getStaffFullName(staff);
    const confirmMsg = language === 'en'
      ? `Are you sure you want to remove ${name} from the practitioners directory?`
      : `¿Está seguro de que desea eliminar a ${name} del directorio de profesionales?`;

    if (window.confirm(confirmMsg)) {
      deletePractitioner(staff.id);
      if (addToast) {
        addToast(
          'info',
          language === 'en' ? `${name} was removed` : `${name} fue eliminado del directorio`,
          language === 'en' ? 'Staff Removed' : 'Personal Eliminado'
        );
      }
    }
  };

  // Reset to default handler
  const handleResetStaff = () => {
    const confirmMsg = language === 'en'
      ? 'Reset staff directory back to original IntegraMed demo setup?'
      : '¿Restablecer el directorio de personal a los valores iniciales de demostración de IntegraMed?';

    if (window.confirm(confirmMsg)) {
      resetStaff();
      if (addToast) {
        addToast(
          'success',
          language === 'en' ? 'Staff directory restored to initial demo state' : 'Directorio de personal restaurado a los valores iniciales',
          language === 'en' ? 'Data Reset' : 'Datos Restaurados'
        );
      }
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
              {language === 'en' ? 'Staff & Practitioners Administration' : 'Administración de Profesionales y Personal'}
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
            {language === 'en'
              ? 'Manage clinical staff profiles, medical specialties, CME courses, assigned shifts, and security credentials'
              : 'Gestión integral de personal clínico, especialidades, cursos de educación continua, turnos y contraseñas de acceso'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleResetStaff}
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.4rem', color: '#475569', fontSize: '0.8125rem' }}
            title={language === 'en' ? 'Reset demo staff directory' : 'Restablecer directorio demo'}
          >
            <RotateCcw size={14} />
            <span>{language === 'en' ? 'Reset Demo Data' : 'Restablecer Demo'}</span>
          </button>

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
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
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
              {language === 'en' ? 'Total Staff' : 'Personal Clínico'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.total}{' '}
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>
                ({stats.active} {language === 'en' ? 'active' : 'activos'})
              </span>
            </div>
          </div>
        </div>

        {/* Tile 2: Doctors & Therapists */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Stethoscope size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {language === 'en' ? 'Doctors & Therapists' : 'Médicos & Terapeutas'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.doctors}
            </div>
          </div>
        </div>

        {/* Tile 3: Nurses */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
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
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {language === 'en' ? 'Nursing Staff' : 'Personal de Enfermería'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.nurses}
            </div>
          </div>
        </div>

        {/* Tile 4: CME Courses & Certifications */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
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
            <Award size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {language === 'en' ? 'CME Certifications' : 'Cursos & Certificaciones'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.totalCourses}{' '}
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7c3aed' }}>
                {language === 'en' ? 'registered' : 'acreditados'}
              </span>
            </div>
          </div>
        </div>
      </div>

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

                  {/* 4. User Account & Password Status */}
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
    </div>
  );
}
