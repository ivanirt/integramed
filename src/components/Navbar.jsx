import React from 'react';
import { Activity, Plus, RefreshCw, Server, Settings, Languages, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function Navbar({
  serverInfo,
  onRefresh,
  isRefreshing,
  onOpenCreate,
  onOpenSettings
}) {
  const { language, setLanguage, t } = useLanguage();
  const isConnected = serverInfo?.status === 'connected';
  const isAuthError = serverInfo?.status === 'auth_error';

  return (
    <header className="glass-header" style={{ position: 'sticky', top: 0, zIndex: 40 }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '70px' }}>
        {/* Brand & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-primary-600)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(13, 148, 136, 0.35)'
            }}
          >
            <Activity size={22} strokeWidth={2.5} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                IntegraMed
              </h1>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  letterSpacing: '0.04em'
                }}
              >
                FHIR R4
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {t('brandSubtitle')}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Language Switcher Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              padding: '3px',
              borderRadius: '0.5rem',
              gap: '2px',
              border: '1px solid #e2e8f0'
            }}
          >
            <button
              onClick={() => setLanguage('en')}
              style={{
                border: 'none',
                background: language === 'en' ? '#ffffff' : 'transparent',
                color: language === 'en' ? 'var(--color-primary-700)' : '#64748b',
                fontWeight: language === 'en' ? 700 : 500,
                fontSize: '0.75rem',
                padding: '0.25rem 0.55rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                boxShadow: language === 'en' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="English"
              id="lang-en-btn"
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('es')}
              style={{
                border: 'none',
                background: language === 'es' ? '#ffffff' : 'transparent',
                color: language === 'es' ? 'var(--color-primary-700)' : '#64748b',
                fontWeight: language === 'es' ? 700 : 500,
                fontSize: '0.75rem',
                padding: '0.25rem 0.55rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                boxShadow: language === 'es' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="Español"
              id="lang-es-btn"
            >
              ES
            </button>
          </div>

          {/* Server Connection Status Pill */}
          <div
            onClick={onOpenSettings}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              backgroundColor: isConnected ? '#ecfdf5' : isAuthError ? '#fff1f2' : '#f8fafc',
              border: `1px solid ${isConnected ? '#a7f3d0' : isAuthError ? '#fecdd3' : '#e2e8f0'}`,
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: isConnected ? '#047857' : isAuthError ? '#be123c' : '#64748b',
              transition: 'all 0.15s ease'
            }}
            title={t('settingsTooltip')}
          >
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#10b981' : isAuthError ? '#ef4444' : '#94a3b8'
              }}
            />
            <span>{isConnected ? t('fhirLive') : isAuthError ? t('authFailed') : t('connecting')}</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="btn btn-secondary btn-icon"
            style={{ height: '38px', width: '38px' }}
            disabled={isRefreshing}
            title={t('refreshTooltip')}
            id="refresh-patients-btn"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="btn btn-secondary btn-icon"
            style={{ height: '38px', width: '38px' }}
            title={t('settingsTooltip')}
            id="open-settings-btn"
          >
            <Settings size={16} />
          </button>

          {/* New Patient CTA */}
          <button
            onClick={onOpenCreate}
            className="btn btn-primary"
            style={{ height: '38px', padding: '0 1.1rem' }}
            id="create-patient-btn"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{t('newPatient')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
