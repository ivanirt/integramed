import React from 'react';
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
  PlusSquare
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Sidebar({ onOpenSettings }) {
  const { t } = useLanguage();
  const location = useLocation();

  const navItems = [
    { to: '/', label: t('navHome'), icon: Home, exact: true },
    { to: '/agenda', label: t('navAgenda'), icon: Calendar },
    { to: '/patients', label: t('navPatients'), icon: Users, aliases: ['/patient/'] },
    { to: '/consulta', label: t('navEncounters'), icon: Stethoscope, aliases: ['/encounters', '/consulta'] },
    { to: '/practitioners', label: t('navPractitioners'), icon: UserCheck },
    { to: '/labs', label: t('navLabs'), icon: Microscope },
    { to: '/prescriptions', label: t('navPrescriptions'), icon: FileText },
    { to: '/follow-up', label: t('navFollowUp'), icon: Activity }
  ];

  const isItemActive = (item) => {
    if (item.exact && (location.pathname === '/' || location.pathname === '/patients')) {
      return location.pathname === item.to || (item.to === '/patients' && location.pathname === '/');
    }
    if (location.pathname === item.to) return true;
    if (item.aliases?.some(alias => location.pathname.startsWith(alias))) return true;
    return false;
  };

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 30
      }}
    >
      {/* Brand Header */}
      <div>
        <div
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            borderBottom: '1px solid #f1f5f9'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
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
            <PlusSquare size={22} strokeWidth={2.5} />
          </div>

          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              IntegraMed
            </h1>
            <p style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
              {t('brandSubtitleSidebar')}
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav style={{ padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '0.625rem',
                  fontSize: '0.875rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#047857' : '#475569',
                  backgroundColor: active ? '#5eead4' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={18} color={active ? '#047857' : '#64748b'} strokeWidth={active ? 2.5 : 2} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {/* Settings Nav Button */}
          <button
            onClick={onOpenSettings}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.65rem 1rem',
              borderRadius: '0.625rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#475569',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              transition: 'all 0.15s ease'
            }}
          >
            <Settings size={18} color="#64748b" />
            <span>{t('navSettings')}</span>
          </button>
        </nav>
      </div>

      {/* Footer / Profile Card */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-100)',
            color: 'var(--color-primary-800)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.8125rem',
            flexShrink: 0
          }}
        >
          <User size={18} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t('doctorProfileTitle')}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            <span>{t('onlineStatus')}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
