import React from 'react';
import { Trash2, AlertTriangle, X, Loader2, RotateCcw, AlertCircle, ShieldAlert } from 'lucide-react';
import { getPatientFullName } from '../utils/fhirHelper';
import { useLanguage } from '../i18n/LanguageContext';

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  // Patient-specific compatibility
  patient,
  isDeleting,
  // Universal props
  title,
  message,
  warningText,
  confirmText,
  cancelText,
  itemName,
  itemId,
  variant = 'danger', // 'danger' | 'warning' | 'info'
  icon = 'trash', // 'trash' | 'reset' | 'warning'
  isLoading = false
}) {
  const { language, t } = useLanguage();

  if (!isOpen) return null;

  // Determine effective loading state
  const loading = isDeleting || isLoading;

  // Derive title & message if patient prop was passed
  let modalTitle = title;
  let modalMessage = message;
  let modalWarning = warningText;

  if (patient) {
    const fullName = getPatientFullName(patient);
    const resolvedName = fullName === 'Unnamed Patient' ? t('unnamedPatient') : fullName;
    modalTitle = modalTitle || t('deleteTitle');
    modalMessage = modalMessage || t('deleteConfirmText', { name: resolvedName, id: patient.id });
    modalWarning = modalWarning || t('deleteWarningText', { id: patient.id });
  }

  // Fallback defaults
  modalTitle = modalTitle || (language === 'en' ? 'Confirm Action' : 'Confirmar Acción');
  modalMessage = modalMessage || (language === 'en' ? 'Are you sure you want to proceed?' : '¿Estás seguro de que deseas continuar?');

  const resolvedConfirmText = confirmText || (
    icon === 'reset'
      ? (language === 'en' ? 'Reset to Default' : 'Restablecer')
      : (t('btnDeleteResource') || (language === 'en' ? 'Delete' : 'Eliminar'))
  );

  const resolvedCancelText = cancelText || t('btnCancel') || (language === 'en' ? 'Cancel' : 'Cancelar');

  // Variant styles
  const isVariantDanger = variant === 'danger';
  const headerBg = isVariantDanger ? '#fee2e2' : '#fef3c7';
  const headerColor = isVariantDanger ? '#dc2626' : '#d97706';

  const renderIcon = () => {
    if (icon === 'reset') return <RotateCcw size={18} />;
    if (icon === 'warning') return <AlertTriangle size={18} />;
    return isVariantDanger ? <Trash2 size={18} /> : <AlertCircle size={18} />;
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content animate-modal-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px', padding: 0, overflow: 'hidden', borderRadius: '1rem', border: '1px solid #e2e8f0' }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: headerBg,
                color: headerColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {renderIcon()}
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {modalTitle}
              </h3>
              {(itemName || itemId) && (
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  {itemName} {itemId ? `(ID: ${itemId})` : ''}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            style={{ border: 'none', color: '#64748b', cursor: 'pointer', background: 'none' }}
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.55 }}>
            {modalMessage}
          </div>

          {modalWarning && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                backgroundColor: isVariantDanger ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${isVariantDanger ? '#fecaca' : '#fde68a'}`,
                color: isVariantDanger ? '#991b1b' : '#92400e',
                fontSize: '0.8125rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}
            >
              <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{modalWarning}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={loading}
            style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem', fontWeight: 600 }}
          >
            {resolvedCancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={isVariantDanger ? 'btn btn-danger' : 'btn btn-primary'}
            disabled={loading}
            style={{
              padding: '0.55rem 1.25rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              gap: '0.4rem',
              backgroundColor: isVariantDanger ? '#dc2626' : '#0f766e',
              borderColor: isVariantDanger ? '#dc2626' : '#0f766e'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{language === 'en' ? 'Processing...' : 'Procesando...'}</span>
              </>
            ) : (
              <>
                {renderIcon()}
                <span>{resolvedConfirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
