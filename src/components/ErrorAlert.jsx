import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorAlert({ error, onRetry, title = 'Error Loading Patients' }) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' 
    ? error 
    : (error.message || 'An unexpected error occurred while communicating with the FHIR server.');

  const diagnostics = error.diagnostics || (error.operationOutcome ? JSON.stringify(error.operationOutcome) : null);

  return (
    <div
      className="animate-fade-in"
      style={{
        backgroundColor: '#fff1f2',
        border: '1px solid #fecdd3',
        borderRadius: '0.75rem',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem'
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: '#ffe4e6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#e11d48'
        }}
      >
        <AlertTriangle size={20} />
      </div>

      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#9f1239', marginBottom: '0.25rem' }}>
          {title}
        </h4>
        <p style={{ fontSize: '0.875rem', color: '#be123c', lineHeight: 1.5, marginBottom: diagnostics ? '0.5rem' : '0' }}>
          {errorMessage}
        </p>

        {diagnostics && diagnostics !== errorMessage && (
          <details style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#881337' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>FHIR Server Diagnostics</summary>
            <pre
              style={{
                marginTop: '0.35rem',
                padding: '0.5rem',
                backgroundColor: 'rgba(255,255,255,0.7)',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap'
              }}
            >
              {diagnostics}
            </pre>
          </details>
        )}
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-secondary btn-sm"
          style={{
            borderColor: '#fda4af',
            color: '#be123c',
            backgroundColor: '#ffffff',
            flexShrink: 0,
            alignSelf: 'center'
          }}
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}
