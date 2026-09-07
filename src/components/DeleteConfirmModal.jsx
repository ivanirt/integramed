import React from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { getPatientFullName } from '../utils/fhirHelper';
import { useLanguage } from '../i18n/LanguageContext';

export default function DeleteConfirmModal({ isOpen, patient, onClose, onConfirm, isDeleting }) {
  const { t } = useLanguage();

  if (!isOpen || !patient) return null;

  const fullName = getPatientFullName(patient);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-modal-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                {t('deleteTitle')}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            style={{ border: 'none', color: '#64748b' }}
            disabled={isDeleting}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
            {t('deleteConfirmText', { name: fullName === 'Unnamed Patient' ? t('unnamedPatient') : fullName, id: patient.id })}
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#ef4444', marginTop: '0.5rem', fontWeight: 500 }}>
            {t('deleteWarningText', { id: patient.id })}
          </p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isDeleting}
          >
            {t('btnCancel')}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-danger"
            disabled={isDeleting}
            id="confirm-delete-patient-btn"
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t('btnDeleting')}</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>{t('btnDeleteResource')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
