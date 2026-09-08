import React from 'react';
import {
  Stethoscope,
  Activity,
  HeartPulse,
  Users,
  Pill,
  ShieldCheck,
  Building2,
  Sparkles,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import DoctorHomeDashboard from '../components/dashboard/DoctorHomeDashboard';
import NurseHomeDashboard from '../components/dashboard/NurseHomeDashboard';
import ReceptionistHomeDashboard from '../components/dashboard/ReceptionistHomeDashboard';
import PharmacistHomeDashboard from '../components/dashboard/PharmacistHomeDashboard';
import AdminHomeDashboard from '../components/dashboard/AdminHomeDashboard';
import SettingsPage from './SettingsPage';

export default function HomePage({ addToast, onOpenScheduleModal, serverInfo, onConfigUpdated }) {
  const { language } = useLanguage();
  const { currentUser, activeRole, switchRole, rolesConfig } = useAuth();

  // Role pill definitions for fast navigation / testing
  const roleNavItems = [
    {
      roleId: 'doctor',
      labelEs: 'Médico / Terapeuta',
      labelEn: 'Physician / Therapist',
      icon: Stethoscope,
      color: '#0f766e',
      bgActive: '#ecfdf5',
      borderActive: '#a7f3d0'
    },
    {
      roleId: 'nurse',
      labelEs: 'Enfermería & Triage',
      labelEn: 'Nursing & Triage',
      icon: HeartPulse,
      color: '#e11d48',
      bgActive: '#fff1f2',
      borderActive: '#fecdd3'
    },
    {
      roleId: 'receptionist',
      labelEs: 'Recepción & Admisión',
      labelEn: 'Front Desk & Reception',
      icon: Users,
      color: '#d97706',
      bgActive: '#fef3c7',
      borderActive: '#fde68a'
    },
    {
      roleId: 'pharmacist',
      labelEs: 'Farmacia & Dispensario',
      labelEn: 'Pharmacy & Dispensary',
      icon: Pill,
      color: '#059669',
      bgActive: '#ecfdf5',
      borderActive: '#a7f3d0'
    },
    {
      roleId: 'admin',
      labelEs: 'Dirección & Admin',
      labelEn: 'Executive & Admin',
      icon: ShieldCheck,
      color: '#7c3aed',
      bgActive: '#ede9fe',
      borderActive: '#ddd6fe'
    }
  ];

  // Render role-specific dashboard based on activeRole
  const renderRoleDashboard = () => {
    switch (activeRole) {
      case 'doctor':
      case 'therapist':
        return (
          <DoctorHomeDashboard
            onOpenScheduleModal={onOpenScheduleModal}
            addToast={addToast}
          />
        );
      case 'nurse':
        return (
          <NurseHomeDashboard
            onOpenScheduleModal={onOpenScheduleModal}
            addToast={addToast}
          />
        );
      case 'receptionist':
        return (
          <ReceptionistHomeDashboard
            onOpenScheduleModal={onOpenScheduleModal}
            addToast={addToast}
          />
        );
      case 'pharmacist':
      case 'lab':
        return (
          <PharmacistHomeDashboard
            addToast={addToast}
          />
        );
      case 'admin':
        return (
          <SettingsPage
            addToast={addToast}
            serverInfo={serverInfo}
            onConfigUpdated={onConfigUpdated}
          />
        );
      default:
        return (
          <DoctorHomeDashboard
            onOpenScheduleModal={onOpenScheduleModal}
            addToast={addToast}
          />
        );
    }
  };

  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '1500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* =========================================================================
          TOP ROLE SWITCHER NAVIGATION BAR
          ========================================================================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          backgroundColor: '#ffffff',
          borderRadius: '0.875rem',
          border: '1px solid #e2e8f0',
          padding: '0.6rem 1rem',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '0.25rem' }}>
            {language === 'en' ? 'Dashboard View:' : 'Vista por Rol:'}
          </span>

          {roleNavItems.map((item) => {
            const Icon = item.icon;
            const isCurrentActive = activeRole === item.roleId || (item.roleId === 'doctor' && activeRole === 'therapist');

            return (
              <button
                key={item.roleId}
                type="button"
                onClick={() => {
                  switchRole(item.roleId);
                  if (addToast) {
                    addToast('info', `Cambiando a vista de ${item.labelEs}`, 'Vista de Inicio');
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                  border: isCurrentActive ? `1.5px solid ${item.borderActive}` : '1px solid #e2e8f0',
                  backgroundColor: isCurrentActive ? item.bgActive : '#ffffff',
                  color: isCurrentActive ? item.color : '#475569',
                  fontSize: '0.78rem',
                  fontWeight: isCurrentActive ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isCurrentActive ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                <Icon size={14} color={isCurrentActive ? item.color : '#64748b'} strokeWidth={isCurrentActive ? 2.5 : 2} />
                <span>{language === 'en' ? item.labelEn : item.labelEs}</span>
              </button>
            );
          })}
        </div>

        {/* Active Connected User Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#64748b' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)' }} />
          <span>
            {currentUser?.prefix || 'Dr.'} {currentUser?.givenName || 'Alejandro'} ({currentUser?.specialty?.slice(0, 24) || 'Medicina Interna'})
          </span>
        </div>
      </div>

      {/* =========================================================================
          DYNAMIC ROLE-SPECIFIC HOME DASHBOARD CONTENT
          ========================================================================= */}
      {renderRoleDashboard()}
    </div>
  );
}
