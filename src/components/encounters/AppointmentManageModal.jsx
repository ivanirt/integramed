import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Calendar,
  Clock,
  User,
  Stethoscope,
  FileText,
  Building2,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  Activity
} from 'lucide-react';
import { getStaffList } from '../../utils/staffStorage.js';
import { updateAppointment, deleteAppointment, APPOINTMENT_STATUS_OPTIONS } from '../../utils/appointmentStorage.js';
import { WEEKLY_TIME_SLOTS } from './ClinicalWeeklyCalendar.jsx';

export default function AppointmentManageModal({
  isOpen,
  encounter,
  onClose,
  onUpdated,
  onDeleted
}) {
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form state
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('09:00');
  const [editPractitionerName, setEditPractitionerName] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editStatus, setEditStatus] = useState('planned');
  const [editRoom, setEditRoom] = useState('');

  // Doctors directory
  const doctorsList = getStaffList().filter(s => s.roles?.includes('doctor') || s.roles?.includes('therapist'));

  useEffect(() => {
    if (encounter) {
      setEditDate(encounter.date || (encounter.period?.start ? encounter.period.start.slice(0, 10) : ''));
      setEditTime(encounter.time || (encounter.period?.start ? encounter.period.start.slice(11, 16) : '09:00'));
      setEditPractitionerName(encounter.practitionerName || encounter.participant?.[0]?.individual?.display || '');
      setEditReason(encounter.reason || encounter.reasonCode?.[0]?.text || encounter.type?.[0]?.text || '');
      setEditStatus(encounter.status || 'planned');
      setEditRoom(encounter.room || 'Consultorio 101');
      setIsEditing(false);
      setConfirmDelete(false);
    }
  }, [encounter]);

  if (!isOpen || !encounter) return null;

  const patientId = encounter.patientId || encounter.subject?.reference?.replace('Patient/', '');
  const patientName = encounter.patientName || encounter.subject?.display || 'Paciente General';

  const handleQuickStatusChange = async (newStatus) => {
    try {
      setIsSubmitting(true);
      const updated = await updateAppointment(encounter.id, { status: newStatus });
      if (onUpdated) onUpdated(updated);
    } catch (err) {
      console.error('Failed to change status:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const selectedDoc = doctorsList.find(d => d.name === editPractitionerName);
      const updated = await updateAppointment(encounter.id, {
        date: editDate,
        time: editTime,
        practitionerName: editPractitionerName,
        practitionerSpecialty: selectedDoc?.specialty || encounter.practitionerSpecialty,
        reason: editReason,
        status: editStatus,
        room: editRoom
      });
      setIsEditing(false);
      if (onUpdated) onUpdated(updated);
    } catch (err) {
      console.error('Failed to update appointment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await deleteAppointment(encounter.id);
      if (onDeleted) onDeleted(encounter.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete appointment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStatusCfg = APPOINTMENT_STATUS_OPTIONS.find(s => s.id === (isEditing ? editStatus : encounter.status)) || APPOINTMENT_STATUS_OPTIONS[0];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="modal-content animate-modal-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', padding: 0, overflow: 'hidden' }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: '#fafbfc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f766e'
              }}
            >
              <Calendar size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {isEditing ? 'Editar Cita Médica' : 'Detalles de la Cita'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                ID: {encounter.id}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: currentStatusCfg.color,
                backgroundColor: currentStatusCfg.bg,
                border: `1px solid ${currentStatusCfg.border}`,
                padding: '2px 8px',
                borderRadius: '9999px'
              }}
            >
              {currentStatusCfg.label}
            </span>

            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                padding: '4px'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem' }}>
          {isEditing ? (
            /* =========================================================================
               EDIT FORM MODE (UPDATE)
               ========================================================================= */
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    Fecha
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    style={{ width: '100%', height: '38px', fontSize: '0.8125rem' }}
                  />
                </div>

                {/* Time (30 min increments) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    Hora (Intervalo 30 min)
                  </label>
                  <select
                    className="form-input"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    required
                    style={{ width: '100%', height: '38px', fontSize: '0.8125rem' }}
                  >
                    {WEEKLY_TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Doctor / Practitioner */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Doctor / Profesional Asignado
                </label>
                <select
                  className="form-input"
                  value={editPractitionerName}
                  onChange={(e) => setEditPractitionerName(e.target.value)}
                  required
                  style={{ width: '100%', height: '38px', fontSize: '0.8125rem' }}
                >
                  {doctorsList.map((doc) => (
                    <option key={doc.id || doc.name} value={doc.name}>
                      {doc.name} {doc.specialty ? `— ${doc.specialty}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status & Room */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    Estado de la Cita
                  </label>
                  <select
                    className="form-input"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    style={{ width: '100%', height: '38px', fontSize: '0.8125rem' }}
                  >
                    {APPOINTMENT_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    Consultorio / Sala
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    placeholder="Ej. Consultorio 101"
                    style={{ width: '100%', height: '38px', fontSize: '0.8125rem' }}
                  />
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Motivo de Consulta / Diagnóstico
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Detalle el motivo o tipo de cita médica..."
                  style={{ width: '100%', fontSize: '0.8125rem', padding: '0.5rem' }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary btn-sm"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting}
                  style={{ backgroundColor: '#0f766e', gap: '0.35rem' }}
                >
                  <Save size={14} />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          ) : (
            /* =========================================================================
               VIEW MODE (READ & QUICK ACTIONS)
               ========================================================================= */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Information Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Paciente */}
                <div style={{ backgroundColor: '#f8fafc', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    <User size={13} color="#0f766e" />
                    <span>Paciente</span>
                  </div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
                    {patientName}
                  </div>
                  {patientId && (
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/patient/${patientId}`);
                        onClose();
                      }}
                      style={{
                        marginTop: '0.4rem',
                        border: 'none',
                        background: 'transparent',
                        padding: 0,
                        color: '#0f766e',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <span>Ver expediente clínico</span>
                      <ExternalLink size={11} />
                    </button>
                  )}
                </div>

                {/* Doctor */}
                <div style={{ backgroundColor: '#f8fafc', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    <Stethoscope size={13} color="#0284c7" />
                    <span>Médico Asignado</span>
                  </div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
                    {encounter.practitionerName || encounter.participant?.[0]?.individual?.display || 'Dr. Alejandro Morales'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                    {encounter.practitionerSpecialty || 'Medicina General'}
                  </div>
                </div>

                {/* Horario y Fecha */}
                <div style={{ backgroundColor: '#f8fafc', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    <Clock size={13} color="#d97706" />
                    <span>Horario</span>
                  </div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                    {encounter.time || '09:00'} • {encounter.date}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Duración: 30 minutos
                  </div>
                </div>

                {/* Consultorio */}
                <div style={{ backgroundColor: '#f8fafc', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    <Building2 size={13} color="#7c3aed" />
                    <span>Ubicación</span>
                  </div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
                    {encounter.room || 'Consultorio 101'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Plantel Central
                  </div>
                </div>
              </div>

              {/* Motivo de Consulta */}
              <div style={{ backgroundColor: '#ffffff', padding: '0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  <FileText size={13} color="#d97706" />
                  <span>Motivo de Consulta</span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#1e293b', marginTop: '0.35rem', fontWeight: 600 }}>
                  {encounter.reason || encounter.reasonCode?.[0]?.text || encounter.type?.[0]?.text || 'Consulta de revisión clínica general.'}
                </div>
              </div>

              {/* Quick Status Change */}
              <div>
                <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  Cambiar Estado Rápidamente:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {APPOINTMENT_STATUS_OPTIONS.map((opt) => {
                    const isCurrent = encounter.status === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleQuickStatusChange(opt.id)}
                        disabled={isSubmitting || isCurrent}
                        style={{
                          border: `1px solid ${isCurrent ? opt.color : opt.border}`,
                          backgroundColor: isCurrent ? opt.bg : '#ffffff',
                          color: opt.color,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.6rem',
                          borderRadius: '9999px',
                          cursor: isCurrent ? 'default' : 'pointer',
                          opacity: isCurrent ? 1 : 0.85,
                          transition: 'all 0.12s ease'
                        }}
                      >
                        {isCurrent ? `✓ ${opt.label}` : opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Delete confirmation alert if active */}
              {confirmDelete && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1.5px solid #fecaca',
                    borderRadius: '0.5rem',
                    padding: '0.875rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c', fontWeight: 800, fontSize: '0.85rem' }}>
                    <AlertCircle size={17} />
                    <span>¿Confirmas que deseas eliminar esta cita?</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#7f1d1d', margin: 0 }}>
                    Esta acción eliminará la cita del horario del doctor y de la agenda semanal permanentemente.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      style={{
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '0.375rem',
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Sí, Eliminar Cita
                    </button>
                  </div>
                </div>
              )}

              {/* Footer Actions: Edit and Delete */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#dc2626',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.3rem 0.5rem',
                      borderRadius: '0.375rem'
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Eliminar Cita</span>
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '0.35rem', color: '#0f766e', borderColor: '#99f6e4', backgroundColor: '#f0fdfa' }}
                  >
                    <Edit2 size={13} />
                    <span>Editar Cita</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-primary btn-sm"
                    style={{ backgroundColor: '#0f766e' }}
                  >
                    Listo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
