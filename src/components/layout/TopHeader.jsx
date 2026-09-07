import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Plus,
  User,
  Activity,
  Check,
  RefreshCw,
  X,
  ChevronRight,
  ChevronDown,
  LogOut,
  Shield,
  Stethoscope,
  HeartPulse,
  Users,
  ShieldCheck,
  FlaskConical,
  Globe
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { CLINICAL_ROLES, getStaffFullName } from '../../utils/staffData';
import { getPatients } from '../../services/fhirApi';
import { getPatientFullName } from '../../utils/fhirHelper';

export default function TopHeader({
  serverInfo,
  onScheduleEncounter,
  onOpenSettings
}) {
  const { language, setLanguage, t } = useLanguage();
  const { currentUser, activeRole, switchRole, updateUserLanguage, logout } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close user menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for quick search dropdown in header
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await getPatients(searchQuery.trim());
        setSearchResults(res.patients.slice(0, 6));
        setIsDropdownOpen(true);
      } catch (err) {
        console.warn('Quick search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPatient = (patientId) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    navigate(`/patient/${patientId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isConnected = serverInfo?.status === 'connected';
  const roleConfig = CLINICAL_ROLES[activeRole] || CLINICAL_ROLES.doctor;

  const renderRoleIcon = (roleId, size = 14) => {
    switch (roleId) {
      case 'doctor':
        return <Stethoscope size={size} />;
      case 'therapist':
        return <Activity size={size} />;
      case 'nurse':
        return <HeartPulse size={size} />;
      case 'receptionist':
        return <Users size={size} />;
      case 'admin':
        return <ShieldCheck size={size} />;
      case 'lab':
        return <FlaskConical size={size} />;
      default:
        return <Shield size={size} />;
    }
  };

  const initials = currentUser
    ? `${currentUser.givenName[0]}${currentUser.familyName[0]}`
    : 'JR';

  return (
    <header
      style={{
        height: '68px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.75rem',
        position: 'sticky',
        top: 0,
        zIndex: 20
      }}
    >
      {/* Search Bar with Quick Dropdown */}
      <div ref={searchRef} style={{ position: 'relative', width: '380px' }}>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: '0.875rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Search size={17} />
          </div>

          <input
            type="text"
            className="form-input"
            style={{
              paddingLeft: '2.5rem',
              paddingRight: isSearching ? '2.5rem' : '1rem',
              borderRadius: '9999px',
              backgroundColor: '#f8fafc',
              borderColor: '#e2e8f0',
              fontSize: '0.875rem',
              height: '40px'
            }}
            placeholder={t('searchPlaceholderTop') || 'Buscar pacientes...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setIsDropdownOpen(true);
            }}
          />

          {isSearching && (
            <div
              style={{
                position: 'absolute',
                right: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            >
              <div className="spinner" style={{ width: '15px', height: '15px' }} />
            </div>
          )}
        </div>

        {/* Quick Dropdown Results */}
        {isDropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              zIndex: 50
            }}
          >
            <div
              style={{
                padding: '0.5rem 0.875rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#64748b',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #f1f5f9'
              }}
            >
              {t('quickResults') || 'Resultados Rápidos'}
            </div>

            {searchResults.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                {t('noPatientsFound', { query: searchQuery })}
              </div>
            ) : (
              <div>
                {searchResults.map((p) => {
                  const name = getPatientFullName(p);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPatient(p.id)}
                      style={{
                        padding: '0.625rem 0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f8fafc',
                        transition: 'background-color 0.12s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        >
                          <User size={14} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>{name}</div>
                          <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                            {p.gender || 'Unknown'} • ID: {p.id}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={15} color="#94a3b8" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Header Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Server Status Pill */}
        <div
          onClick={onOpenSettings}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.7rem',
            borderRadius: '9999px',
            backgroundColor: isConnected ? '#ecfdf5' : '#fff1f2',
            border: `1px solid ${isConnected ? '#a7f3d0' : '#fecdd3'}`,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: isConnected ? '#047857' : '#be123c',
            cursor: 'pointer'
          }}
          title={t('settingsTooltip')}
        >
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isConnected ? '#10b981' : '#ef4444' }} />
          <span>{isConnected ? 'FHIR Live' : 'Offline'}</span>
        </div>

        {/* Notifications Icon */}
        <button
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            cursor: 'pointer'
          }}
          title={t('notifications')}
        >
          <Bell size={17} />
        </button>

        {/* Primary CTA: + Nueva Cita */}
        <button
          onClick={onScheduleEncounter}
          className="btn btn-primary"
          style={{
            backgroundColor: '#0f766e',
            borderRadius: '9999px',
            padding: '0.55rem 1.25rem',
            boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)'
          }}
          id="top-new-appointment-btn"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>{t('btnNewAppointment')}</span>
        </button>

        {/* Authenticated User Menu & Multi-Role Switcher */}
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '4px 8px 4px 4px',
              borderRadius: '9999px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: currentUser?.avatarBg || '#0f766e',
                color: currentUser?.avatarText || '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.8125rem',
                flexShrink: 0
              }}
            >
              {initials}
            </div>

            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                {getStaffFullName(currentUser)}
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: roleConfig.color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                {renderRoleIcon(activeRole, 11)}
                <span>{language === 'en' ? roleConfig.labelEn : roleConfig.labelEs}</span>
              </span>
            </div>

            <ChevronDown size={14} color="#64748b" />
          </button>

          {/* User & Role Switcher Dropdown */}
          {isUserMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '280px',
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0',
                padding: '0.75rem',
                zIndex: 60
              }}
            >
              {/* User Header */}
              <div style={{ padding: '0.5rem 0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                  {getStaffFullName(currentUser)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {currentUser?.specialty}
                </div>
                {currentUser?.license && (
                  <div style={{ fontSize: '0.6875rem', color: '#0d9488', fontWeight: 600, marginTop: '2px' }}>
                    {currentUser.license}
                  </div>
                )}
              </div>

              {/* Multi-role Switcher */}
              {currentUser && currentUser.roles.length > 1 && (
                <div style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    {language === 'en' ? 'Switch Active Role' : 'Cambiar Rol Activo'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {currentUser.roles.map(rKey => {
                      const r = CLINICAL_ROLES[rKey];
                      const isActive = activeRole === rKey;
                      return (
                        <button
                          key={rKey}
                          type="button"
                          onClick={() => {
                            switchRole(rKey);
                            setIsUserMenuOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.4rem 0.625rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            border: 'none',
                            backgroundColor: isActive ? r?.bgColor : '#f8fafc',
                            color: isActive ? r?.color : '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.12s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {renderRoleIcon(rKey, 14)}
                            <span>{language === 'en' ? r?.labelEn : r?.labelEs}</span>
                          </div>
                          {isActive && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Account Language Preference in Profile */}
              <div style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Globe size={13} color="#0d9488" />
                  <span>{language === 'en' ? 'Account Language' : 'Idioma de la Cuenta'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (updateUserLanguage) {
                        updateUserLanguage('es');
                      } else {
                        setLanguage('es');
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.5rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: language === 'es' ? '1px solid #0d9488' : '1px solid #e2e8f0',
                      backgroundColor: language === 'es' ? '#ecfdf5' : '#f8fafc',
                      color: language === 'es' ? '#0f766e' : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>🇲🇽 Español</span>
                    {language === 'es' && <Check size={13} color="#0d9488" strokeWidth={3} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (updateUserLanguage) {
                        updateUserLanguage('en');
                      } else {
                        setLanguage('en');
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.5rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: language === 'en' ? '1px solid #0d9488' : '1px solid #e2e8f0',
                      backgroundColor: language === 'en' ? '#ecfdf5' : '#f8fafc',
                      color: language === 'en' ? '#0f766e' : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>🇺🇸 English</span>
                    {language === 'en' && <Check size={13} color="#0d9488" strokeWidth={3} />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div style={{ paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    navigate('/login');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.625rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.8125rem',
                    color: '#0d9488',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  <Users size={15} />
                  <span>{language === 'en' ? 'Switch Practitioner Profile' : 'Cambiar Perfil de Usuario'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.625rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.8125rem',
                    color: '#e11d48',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  <LogOut size={15} />
                  <span>{language === 'en' ? 'Log Out' : 'Cerrar Sesión'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
