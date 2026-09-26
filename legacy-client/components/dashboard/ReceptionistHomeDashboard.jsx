import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Calendar,
  Building,
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowRight,
  Ban
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getTodayAppointments, updateAppointmentStatus } from '../../utils/dashboardStorage';
import { isTerminalAppointmentStatus, normalizeAppointmentStatus } from '../../utils/appointmentStatus';

export default function ReceptionistHomeDashboard({ onOpenScheduleModal, addToast }) {
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const { currentUser } = useAuth();

  const [appointments, setAppointments] = useState(() => getTodayAppointments());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const refresh = () => setAppointments(getTodayAppointments());
    window.addEventListener('integramed_appointments_updated', refresh);
    return () => window.removeEventListener('integramed_appointments_updated', refresh);
  }, []);

  const setStatus = (id, status, toastMsg) => {
    const updated = updateAppointmentStatus(id, status);
    setAppointments(updated);
    if (addToast && toastMsg) addToast('success', toastMsg, 'Recepción');
  };

  const queue = appointments.filter((a) => !isTerminalAppointmentStatus(a.status));
  const waitingCount = appointments.filter((a) => normalizeAppointmentStatus(a.status) === 'waiting').length;
  const inRoomCount = appointments.filter((a) => normalizeAppointmentStatus(a.status) === 'in_room').length;

  const filtered = queue.filter((a) =>
    (a.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.documentId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.reason || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Módulo de Recepción & Admisión • Plantel Central
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 500 }}>
            Control de llegadas, check-in de pacientes a sala, cobros y asignación de consultorios
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            type="button"
            onClick={() => navigate('/pacientes')}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem', gap: '0.35rem' }}
          >
            <Users size={15} />
            <span>Nuevo Paciente</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenScheduleModal && onOpenScheduleModal()}
            className="btn btn-primary"
            style={{ backgroundColor: '#d97706', fontSize: '0.8125rem', gap: '0.35rem' }}
          >
            <Plus size={15} />
            <span>Agendar Cita</span>
          </button>
        </div>
      </div>

      {/* 4 Reception KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Citas Estimadas Hoy</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>{appointments.length}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>En espera / En sala</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>{waitingCount} / {inRoomCount}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Consultorios Activos</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>8 / 10</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Pagos Registrados</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>$14,850</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)', gap: '1.5rem' }}>
        {/* Left: Check-in queue */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Control de Llegadas y Sala de Espera
            </h2>
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar paciente..."
                className="form-input"
                style={{ height: '32px', fontSize: '0.78rem', paddingLeft: '1.8rem' }}
              />
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '9px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map((appt) => (
              <div key={appt.id} style={{ padding: '0.85rem 1rem', backgroundColor: normalizeAppointmentStatus(appt.status) === 'in_room' ? '#f0fdf4' : '#f8fafc', borderRadius: '0.625rem', border: normalizeAppointmentStatus(appt.status) === 'in_room' ? '1px solid #bbf7d0' : '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{appt.time} {appt.period}</span>
                    <span>•</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{appt.patientName}</span>
                    <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: appt.statusBg, color: appt.statusColor }}>
                      {appt.statusLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    {appt.gender} • {appt.age} años • {appt.reason} • {appt.room}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {normalizeAppointmentStatus(appt.status) === 'planned' && (
                    <button type="button" onClick={() => setStatus(appt.id, 'confirmed', `${appt.patientName} confirmó su cita`)} className="btn btn-primary btn-sm" style={{ backgroundColor: '#0284c7', fontSize: '0.75rem' }}>
                      Confirmar
                    </button>
                  )}
                  {normalizeAppointmentStatus(appt.status) === 'confirmed' && (
                    <button type="button" onClick={() => setStatus(appt.id, 'waiting', `${appt.patientName} está en espera`)} className="btn btn-primary btn-sm" style={{ backgroundColor: '#475569', fontSize: '0.75rem', gap: '0.25rem' }}>
                      <UserCheck size={13} />
                      <span>Registrar llegada</span>
                    </button>
                  )}
                  {normalizeAppointmentStatus(appt.status) === 'waiting' && (
                    <button type="button" onClick={() => setStatus(appt.id, 'in_room', `${appt.patientName} pasó a sala`)} className="btn btn-primary btn-sm" style={{ backgroundColor: '#059669', fontSize: '0.75rem' }}>
                      Pasar a sala
                    </button>
                  )}
                  {normalizeAppointmentStatus(appt.status) === 'in_room' && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={15} />
                      <span>En sala</span>
                    </span>
                  )}
                  {normalizeAppointmentStatus(appt.status) === 'in_consultation' && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e11d48' }}>En consulta</span>
                  )}
                  {!isTerminalAppointmentStatus(appt.status) && normalizeAppointmentStatus(appt.status) !== 'in_consultation' && (
                    <button type="button" onClick={() => setStatus(appt.id, 'cancelled', `${appt.patientName}: cita cancelada`)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', color: '#991b1b', gap: '0.25rem' }}>
                      <Ban size={13} />
                      <span>Cancelar</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Quick actions */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            Acciones de Recepción
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => onOpenScheduleModal && onOpenScheduleModal()}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', fontSize: '0.8125rem', gap: '0.5rem' }}
            >
              <Calendar size={15} color="#d97706" />
              <span>Agendar Nueva Cita FHIR</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/pacientes')}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', fontSize: '0.8125rem', gap: '0.5rem' }}
            >
              <Users size={15} color="#0f766e" />
              <span>Alta de Paciente Nuevo</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/sedes')}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', fontSize: '0.8125rem', gap: '0.5rem' }}
            >
              <Building size={15} color="#7c3aed" />
              <span>Ver Ocupación de Consultorios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
