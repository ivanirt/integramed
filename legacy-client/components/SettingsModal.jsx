import React, { useState, useEffect } from 'react';
import { X, Server, Save, Check, AlertCircle } from 'lucide-react';
import { updateProxyConfig, checkProxyHealth } from '../services/fhirApi';
import { useLanguage } from '../i18n/LanguageContext';

export default function SettingsModal({ isOpen, onClose, serverInfo, onConfigUpdated }) {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    if (isOpen && serverInfo) {
      setUrl(serverInfo.serverUrl || '');
      setToken('');
      setStatusMsg(null);
    }
  }, [isOpen, serverInfo]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    try {
      await updateProxyConfig(url, token || undefined);
      const updatedHealth = await checkProxyHealth();
      setStatusMsg({ type: 'success', text: t('settingsSuccess') });
      if (onConfigUpdated) onConfigUpdated(updatedHealth);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-modal-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '540px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155'
              }}
            >
              <Server size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                {t('settingsTitle')}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {t('settingsSubtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            style={{ border: 'none', color: '#64748b' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {statusMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: statusMsg.type === 'success' ? '#f0fdf4' : '#fff1f2',
                border: `1px solid ${statusMsg.type === 'success' ? '#bbf7d0' : '#fecdd3'}`,
                borderRadius: '0.5rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                color: statusMsg.type === 'success' ? '#15803d' : '#be123c',
                fontSize: '0.875rem'
              }}
            >
              {statusMsg.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <form id="settings-form" onSubmit={handleSave}>
            <div className="form-group">
              <label htmlFor="fhirUrl" className="form-label">
                {t('fhirUrlLabel')}
              </label>
              <input
                id="fhirUrl"
                type="url"
                className="form-input"
                placeholder="https://fhir.medblocks.com/fhir/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                {t('fhirUrlHelper')}
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="fhirToken" className="form-label">
                {t('bearerTokenLabel')}
              </label>
              <input
                id="fhirToken"
                type="password"
                className="form-input"
                placeholder={serverInfo?.hasToken ? t('tokenConfigured') : t('enterToken')}
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                {t('bearerTokenHelper')}
              </span>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {t('btnCancel')}
          </button>
          <button
            type="submit"
            form="settings-form"
            className="btn btn-primary"
            disabled={isSaving}
          >
            <Save size={15} />
            <span>{t('btnSaveSettings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
