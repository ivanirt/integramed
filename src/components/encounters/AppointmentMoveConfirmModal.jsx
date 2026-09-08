import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  ArrowRight,
  AlertTriangle,
  User,
  Stethoscope,
  CheckCircle2,
  X
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function AppointmentMoveConfirmModal({
  isOpen,
  moveData,
  onClose,
  onConfirm
}) {
  const { t, language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !moveData) return null;

  const { encounter, originDate, originTime, targetDate, targetTime } = moveData;

  const patientName = encounter.patientName || encounter.subject?.display || 'Paciente';
  const practitionerName = encounter.practitionerName || encounter.participant?.[0]?.individual?.display || 'Médico Asignado';
  const reason = encounter.reason || encounter.reasonCode?.[0]?.text || encounter.type?.[0]?.text || 'Consulta médica';

  // Format date helper (e.g., "Miércoles, 09 de Septiembre de 2026")
  const formatDateFriendly = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const originDateFormatted = formatDateFriendly(originDate);
  const targetDateFormatted = formatDateFriendly(targetDate);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm(moveData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content animate-modal-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', padding: 0, overflow: 'hidden' }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: '#fffbeb',
            borderBottom: '1px solid #fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706'
              }}
            >
              <AlertTriangle size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#92400e', margin: 0 }}>
                {language === 'en' ? 'Confirm Appointment Reschedule' : '¿Mover cita de horario?'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#b45309' }}>
                {language === 'en'
                  ? 'Confirm moving this appointment to the new slot'
                  : 'Verifica los detalles antes de aplicar el cambio'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#92400e',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '0.375rem',
              display: 'flex'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Patient and Doctor Card */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '0.875rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={16} color="var(--color-primary-600)" />
              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.925rem' }}>
                {patientName}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Stethoscope size={14} color="#0d9488" />
                {practitionerName}
              </span>
              <span style={{ fontStyle: 'italic', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                "{reason}"
              </span>
            </div>
          </div>

          {/* Before vs After Comparison */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            {/* Origin Slot */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.625rem',
                padding: '0.875rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {language === 'en' ? 'Original Slot' : 'Horario Actual'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: 600 }}>
                <Calendar size={13} color="#64748b" />
                <span style={{ textTransform: 'capitalize' }}>{originDateFormatted || originDate}</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#f1f5f9', color: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.825rem', fontWeight: 700, width: 'fit-content', marginTop: '0.2rem' }}>
                <Clock size={13} />
                <span>{originTime} hrs</span>
              </div>
            </div>

            {/* Transition Arrow */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}
            >
              <ArrowRight size={16} strokeWidth={2.5} />
            </div>

            {/* Target Slot (Highlighted) */}
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '0.625rem',
                padding: '0.875rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                boxShadow: '0 2px 6px rgba(34, 197, 94, 0.08)'
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {language === 'en' ? 'New Slot' : 'Nuevo Horario'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#14532d', fontSize: '0.8rem', fontWeight: 700 }}>
                <Calendar size={13} color="#16a34a" />
                <span style={{ textTransform: 'capitalize' }}>{targetDateFormatted || targetDate}</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.825rem', fontWeight: 800, width: 'fit-content', marginTop: '0.2rem' }}>
                <Clock size={13} />
                <span>{targetTime} hrs</span>
              </div>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
            {language === 'en'
              ? 'Are you sure you want to move this appointment to the selected schedule?'
              : '¿Deseas confirmar el cambio de horario para esta cita en la agenda clínica?'}
          </p>
        </div>

        {/* Footer Buttons */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#fafbfc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem'
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ minWidth: '100px', fontSize: '0.875rem' }}
          >
            {language === 'en' ? 'Cancel' : 'Cancelar'}
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={isSubmitting}
            style={{
              minWidth: '160px',
              fontSize: '0.875rem',
              gap: '0.4rem',
              backgroundColor: '#0d9488',
              borderColor: '#0f766e'
            }}
          >
            <CheckCircle2 size={16} />
            <span>
              {isSubmitting
                ? (language === 'en' ? 'Moving...' : 'Moviendo...')
                : (language === 'en' ? 'Confirm Move' : 'Confirmar cambio')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
