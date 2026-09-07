import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Calendar,
  Users,
  Stethoscope,
  Microscope,
  FileText,
  Activity,
  Settings,
  UserCheck,
  User,
  PlusSquare,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Building2,
  Pill,
  Clock,
  RotateCw
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { CLINICAL_ROLES, getStaffFullName } from '../../utils/staffStorage';

export default function Sidebar({ onOpenSettings }) {
  const { language, t } = useLanguage();
  const { currentUser, activeRole } = useAuth();
  const location = useLocation();

  // Sidebar collapsed state (defaults to true for icon-only mode)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('integramed_sidebar_collapsed');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('integramed_sidebar_collapsed', String(next));
      } catch (e) {
        console.warn('Could not save sidebar state', e);
      }
      return next;
    });
  };

  const navItems = [
    { to: '/', label: t('navHome'), icon: Home, exact: true },
    { to: '/agenda', label: t('navAgenda'), icon: Calendar },
    { to: '/patients', label: t('navPatients'), icon: Users, aliases: ['/patient/'] },
    { to: '/consulta', label: t('navEncounters'), icon: Stethoscope, aliases: ['/encounters', '/consulta'] },
    { to: '/practitioners', label: t('navPractitioners'), icon: UserCheck, aliases: ['/practitioners', '/medicos'] },
    { to: '/turnos', label: t('navShiftsGuards'), icon: Clock, aliases: ['/turnos', '/guardias', '/shifts'] },
    { to: '/inventario', label: t('navInventory'), icon: Pill, aliases: ['/inventario', '/medicamentos', '/pharmacy'] },
    { to: '/laboratorios', label: t('navLabs'), icon: Microscope, aliases: ['/labs', '/laboratorios'] },
    { to: '/recetas', label: t('navPrescriptions'), icon: FileText, aliases: ['/recetas', '/prescriptions'] }
  ];

  const isItemActive = (item) => {
    if (item.exact) {
      return location.pathname === '/' || location.pathname === '/home' || location.pathname === '/inicio';
    }
    if (location.pathname === item.to) return true;
    if (item.aliases?.some(alias => location.pathname.startsWith(alias))) return true;
    return false;
  };

  const roleConfig = CLINICAL_ROLES[activeRole] || CLINICAL_ROLES.doctor;
  const userInitials = currentUser
    ? `${currentUser.givenName[0]}${currentUser.familyName[0]}`
    : 'JR';

  return (
    <aside
      style={{
        width: isCollapsed ? '72px' : '240px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}
    >
      {/* Top Brand Header & Toggle Button */}
      <div>
        <div
          style={{
            height: '68px',
            padding: isCollapsed ? '0 0.75rem' : '0 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid #f1f5f9',
            transition: 'padding 0.22s ease'
          }}
        >
          {/* Logo / Brand Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
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
                justifyContent: 'center',
                flexShrink: 0
              }}
              title="IntegraMed"
            >
              <PlusSquare size={22} strokeWidth={2.5} />
            </div>

            {!isCollapsed && (
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2, margin: 0, whiteSpace: 'nowrap' }}>
                  IntegraMed
                </h1>
                <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, margin: 0, whiteSpace: 'nowrap' }}>
                  {t('brandSubtitleSidebar')}
                </p>
              </div>
            )}
          </div>

          {/* Toggle Expand / Collapse Button (visible when expanded) */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              title={language === 'en' ? 'Collapse menu' : 'Contraer menú (solo iconos)'}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ecfdf5';
                e.currentTarget.style.color = '#047857';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Toggle Expand Button when Collapsed */}
        {isCollapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0 0.25rem' }}>
            <button
              type="button"
              onClick={toggleCollapsed}
              title={language === 'en' ? 'Expand menu' : 'Expandir menú'}
              style={{
                width: '32px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ecfdf5';
                e.currentTarget.style.color = '#047857';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Navigation List */}
        <nav
          style={{
            padding: isCollapsed ? '0.5rem 0.5rem' : '0.875rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            transition: 'padding 0.22s ease'
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  gap: '0.75rem',
                  padding: isCollapsed ? '0.65rem 0' : '0.65rem 0.875rem',
                  borderRadius: '0.625rem',
                  fontSize: '0.875rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#047857' : '#475569',
                  backgroundColor: active ? '#5eead4' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                <Icon
                  size={20}
                  color={active ? '#047857' : '#64748b'}
                  strokeWidth={active ? 2.5 : 2}
                  style={{ flexShrink: 0 }}
                />
                {!isCollapsed && (
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}

          {/* Settings Nav Link */}
          <NavLink
            to="/configuracion"
            title={isCollapsed ? t('navSettings') : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '0.75rem',
              padding: isCollapsed ? '0.65rem 0' : '0.65rem 0.875rem',
              borderRadius: '0.625rem',
              fontSize: '0.875rem',
              fontWeight: location.pathname.startsWith('/configuracion') || location.pathname.startsWith('/settings') ? 700 : 500,
              color: location.pathname.startsWith('/configuracion') || location.pathname.startsWith('/settings') ? '#047857' : '#475569',
              backgroundColor: location.pathname.startsWith('/configuracion') || location.pathname.startsWith('/settings') ? '#5eead4' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Settings
              size={20}
              color={location.pathname.startsWith('/configuracion') || location.pathname.startsWith('/settings') ? '#047857' : '#64748b'}
              style={{ flexShrink: 0 }}
            />
            {!isCollapsed && (
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t('navSettings')}
              </span>
            )}
          </NavLink>
        </nav>
      </div>

      {/* Footer / Profile Card */}
      <NavLink
        to="/perfil"
        title={
          isCollapsed
            ? `${currentUser ? getStaffFullName(currentUser) : 'Usuario'} (${roleConfig?.[language === 'en' ? 'labelEn' : 'labelEs']}) - ${language === 'en' ? 'My Profile & Users' : 'Mi Perfil y Usuarios'}`
            : (language === 'en' ? 'My Profile & Users' : 'Mi Perfil y Usuarios')
        }
        style={{
          padding: isCollapsed ? '1rem 0' : '1rem 1.25rem',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: '0.75rem',
          textDecoration: 'none',
          backgroundColor: location.pathname.startsWith('/perfil') || location.pathname.startsWith('/profile') || location.pathname.startsWith('/usuarios') || location.pathname.startsWith('/users') ? '#ecfdf5' : 'transparent',
          transition: 'all 0.22s ease'
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: currentUser?.avatarBg || '#0f766e',
            color: currentUser?.avatarText || '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.8125rem',
            flexShrink: 0,
            boxShadow: '0 2px 5px rgba(0,0,0,0.08)'
          }}
        >
          {userInitials}
        </div>

        {!isCollapsed && (
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser ? getStaffFullName(currentUser) : t('doctorProfileTitle')}
            </div>
            <div style={{ fontSize: '0.7rem', color: roleConfig?.color || '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: roleConfig?.color || '#10b981' }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {roleConfig?.[language === 'en' ? 'labelEn' : 'labelEs'] || t('onlineStatus')}
              </span>
            </div>
          </div>
        )}
      </NavLink>
    </aside>
  );
}
