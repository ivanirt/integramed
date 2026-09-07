import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      maxWidth: '420px',
      width: '100%',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className="animate-modal-in"
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              backgroundColor: '#ffffff',
              borderRadius: '0.625rem',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
              border: `1px solid ${isSuccess ? '#99f6e4' : isError ? '#fecaca' : '#e2e8f0'}`,
              borderLeft: `4px solid ${isSuccess ? '#0d9488' : isError ? '#ef4444' : '#3b82f6'}`
            }}
          >
            <div style={{ flexShrink: 0, marginTop: '2px' }}>
              {isSuccess && <CheckCircle2 size={18} color="#0d9488" />}
              {isError && <AlertCircle size={18} color="#ef4444" />}
              {!isSuccess && !isError && <Info size={18} color="#3b82f6" />}
            </div>

            <div style={{ flex: 1 }}>
              {toast.title && (
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.4 }}>
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '2px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Dismiss toast"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
