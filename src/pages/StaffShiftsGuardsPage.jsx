import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Shield,
  UserCheck,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  User,
  MapPin,
  RotateCw,
  Check,
  Users,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
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
import { SHIFT_TYPES, getStaffFullName } from '../utils/staffStorage';
import ScheduleGuardModal from '../components/shifts/ScheduleGuardModal';
import CoverageRequestModal from '../components/shifts/CoverageRequestModal';

export default function StaffShiftsGuardsPage({ addToast }) {
  const { language, t } = useLanguage();
  const { staffList } = useAuth();

  const [activeTab, setActiveTab] = useState('guards'); // 'guards' | 'coverages' | 'roster'
  const [guards, setGuards] = useState(() => getGuards());
  const [coverages, setCoverages] = useState(() => getCoverages());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Modals state
  const [guardModal, setGuardModal] = useState({ isOpen: false, guard: null });
  const [coverageModal, setCoverageModal] = useState({ isOpen: false, coverage: null });

  // Filtered Guards
  const filteredGuards = useMemo(() => {
    return guards.filter(g => {
      if (selectedRoleFilter !== 'all' && g.role !== selectedRoleFilter) return false;
      if (selectedStatusFilter !== 'all' && g.status !== selectedStatusFilter) return false;
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
  }, [guards, selectedRoleFilter, selectedStatusFilter, searchQuery]);

  // Filtered Coverages
  const filteredCoverages = useMemo(() => {
    return coverages.filter(c => {
      if (selectedStatusFilter !== 'all' && c.status !== selectedStatusFilter) return false;
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
  }, [coverages, selectedStatusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalGuards = guards.length;
    const activeGuards = guards.filter(g => g.status === 'scheduled' || g.status === 'active').length;
    const totalCoverages = coverages.length;
    const approvedCoverages = coverages.filter(c => c.status === 'approved').length;

    return { totalGuards, activeGuards, totalCoverages, approvedCoverages };
  }, [guards, coverages]);

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
    if (window.confirm(language === 'en' ? 'Delete this guard duty?' : '¿Eliminar esta asignación de guardia?')) {
      const updated = deleteGuard(guard.id);
      setGuards(updated);
      if (addToast) addToast('info', language === 'en' ? 'Guard removed' : 'Guardia eliminada');
    }
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
    if (window.confirm(language === 'en' ? 'Delete this coverage record?' : '¿Eliminar este registro de suplencia?')) {
      const updated = deleteCoverage(cov.id);
      setCoverages(updated);
      if (addToast) addToast('info', language === 'en' ? 'Coverage removed' : 'Suplencia eliminada');
    }
  };

  // Reset demo
  const handleReset = () => {
    if (window.confirm(language === 'en' ? 'Reset shifts, guards, and coverages data to default demo state?' : '¿Restablecer el rol de guardias y relevos a los valores iniciales?')) {
      const { guards: newGuards, coverages: newCoverages } = resetShiftGuardData();
      setGuards(newGuards);
      setCoverages(newCoverages);
      if (addToast) addToast('success', language === 'en' ? 'Data reset' : 'Datos restaurados');
    }
  };

  return (
    <div style={{ padding: '1.75rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
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
              <Clock size={22} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              {language === 'en' ? 'Staff Shifts, Guards & Coverages' : 'Administración de Turnos, Guardias y Relevos'}
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
            {language === 'en'
              ? 'Manage weekly shifts, 24h on-call clinical guards, and substitute practitioner assignments for leaves'
              : 'Gestión de turnos laborales, rol de guardias 24h/nocturnas y asignación de sustitutos o relevos médicos'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.8125rem', gap: '0.35rem' }}
          >
            <RotateCcw size={14} />
            <span>{language === 'en' ? 'Reset Demo Data' : 'Restablecer Demo'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCoverageModal({ isOpen: true, coverage: null })}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.8125rem', gap: '0.35rem', borderColor: '#cbd5e1' }}
          >
            <RotateCw size={15} color="#0f766e" />
            <span>{language === 'en' ? '+ Assign Substitute' : '+ Asignar Sustituto / Relevo'}</span>
          </button>

          <button
            type="button"
            onClick={() => setGuardModal({ isOpen: true, guard: null })}
            className="btn btn-primary"
            style={{ backgroundColor: '#0f766e', boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)', gap: '0.4rem' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{language === 'en' ? 'Schedule Guard Duty' : 'Programar Guardia'}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Active Guards */}
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
            <Shield size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
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

        {/* Coverages / Substitutes */}
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
            <RotateCw size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
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

        {/* Total Active Staff */}
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
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {language === 'en' ? 'Clinical Practitioners' : 'Personal Clínico'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {staffList.length}{' '}
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0284c7' }}>
                {language === 'en' ? 'in roster' : 'en nómina'}
              </span>
            </div>
          </div>
        </div>

        {/* Shift Modes */}
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
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {language === 'en' ? 'Shift Coverage' : 'Cobertura de Turnos'}
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              24/7 / 365 días
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs (Guards vs Coverages vs Roster) */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button
          type="button"
          onClick={() => setActiveTab('guards')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '0.625rem',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'guards' ? 800 : 500,
            border: 'none',
            backgroundColor: activeTab === 'guards' ? '#ecfdf5' : 'transparent',
            color: activeTab === 'guards' ? '#065f46' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Shield size={18} />
          <span>{language === 'en' ? 'Rol of Clinical Guards' : 'Rol de Guardias Clínicas'} ({guards.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('coverages')}
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
            gap: '0.5rem'
          }}
        >
          <RotateCw size={18} />
          <span>{language === 'en' ? 'Substitutes & Coverages (Relevos)' : 'Sustitutos y Relevos'} ({coverages.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '0.625rem',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'roster' ? 800 : 500,
            border: 'none',
            backgroundColor: activeTab === 'roster' ? '#ecfdf5' : 'transparent',
            color: activeTab === 'roster' ? '#065f46' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Users size={18} />
          <span>{language === 'en' ? 'Staff Working Shifts' : 'Horarios y Turnos Asignados'} ({staffList.length})</span>
        </button>
      </div>

      {/* TAB 1: GUARDS */}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Filter size={15} color="#64748b" />
              <select
                className="form-input"
                style={{ height: '38px', width: 'auto', fontSize: '0.8125rem' }}
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
              >
                <option value="all">{language === 'en' ? 'All Roles' : 'Todos los Roles'}</option>
                <option value="doctor">{language === 'en' ? 'Doctors' : 'Médicos'}</option>
                <option value="nurse">{language === 'en' ? 'Nurses' : 'Enfermeras'}</option>
                <option value="therapist">{language === 'en' ? 'Therapists' : 'Terapeutas'}</option>
              </select>
            </div>
          </div>

          {/* Guards Cards Grid */}
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
        </div>
      )}

      {/* TAB 2: COVERAGES & SUBSTITUTES */}
      {activeTab === 'coverages' && (
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
                        {cov.reasonType === 'congress' ? 'Congreso / Capacitación' : cov.reasonType === 'vacation' ? 'Vacaciones' : 'Incapacidad Médica'}
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

                {/* Substitute Diagram */}
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

      {/* TAB 3: STAFF ROSTER & SHIFTS */}
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
                  <span style={{ color: '#059669', fontWeight: 700 }}>Activo</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
    </div>
  );
}
