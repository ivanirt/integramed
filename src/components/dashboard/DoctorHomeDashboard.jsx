import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  UserCheck,
  FlaskConical,
  FileText,
  CheckCircle2,
  ChevronDown,
  Stethoscope,
  Activity,
  Plus,
  ArrowRight,
  ExternalLink,
  Pill,
  AlertCircle,
  Eye,
  Check,
  Building2,
  MapPin,
  HeartPulse,
  Send,
  SlidersHorizontal,
  ChevronRight,
  GripVertical,
  Trash2,
  Ban
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  getTodayAppointments,
  updateAppointmentStatus,
  loadDashboardFromFhir,
  getPendingTasks,
  toggleTaskCompleted,
  addPendingTask,
  reorderTasks,
  deleteTask,
  sortTasksByCompletion,
  INITIAL_AI_SUGGESTIONS
} from '../../utils/dashboardStorage';
import { loadPatientPastEncounters } from '../../utils/encounterHistoryStorage';
import { isTerminalAppointmentStatus, normalizeAppointmentStatus } from '../../utils/appointmentStatus';
import PreviousEncounterReviewModal from '../encounters/PreviousEncounterReviewModal';

export default function DoctorHomeDashboard({ onOpenScheduleModal, addToast }) {
  const navigate = useNavigate();
  const { t, locale, language } = useLanguage();
  const { currentUser, activeRole } = useAuth();

  // Appointments & Tasks state
  const [appointments, setAppointments] = useState(() => getTodayAppointments());
  const [tasks, setTasks] = useState(() => getPendingTasks());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'tomorrow' | 'week'
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [showFinishedSection, setShowFinishedSection] = useState(false);

  // Filter active vs finished appointments
  const activeAppointments = appointments.filter(a => a.status !== 'finished' && a.status !== 'completed' && a.status !== 'cancelled');
  const finishedAppointments = appointments.filter(a => a.status === 'finished' || a.status === 'completed');

  // Drag and Drop state for tasks
  const [draggedTaskIndex, setDraggedTaskIndex] = useState(null);
  const [dragOverTaskIndex, setDragOverTaskIndex] = useState(null);

  // AI Encounter Review Modal
  const [isAiReviewModalOpen, setIsAiReviewModalOpen] = useState(false);
  const [aiReviewEncounter, setAiReviewEncounter] = useState(null);
  const [aiReviewList, setAiReviewList] = useState([]);

  // Sync state
  useEffect(() => {
    const handleApptUpdate = () => setAppointments(getTodayAppointments());
    const handleTaskUpdate = () => setTasks(getPendingTasks());
    window.addEventListener('integramed_appointments_updated', handleApptUpdate);
    window.addEventListener('integramed_tasks_updated', handleTaskUpdate);
    loadDashboardFromFhir()
      .then((data) => {
        if (data?.appointments) setAppointments(data.appointments);
        if (data?.tasks) setTasks(data.tasks);
      })
      .catch(() => {});
    return () => {
      window.removeEventListener('integramed_appointments_updated', handleApptUpdate);
      window.removeEventListener('integramed_tasks_updated', handleTaskUpdate);
    };
  }, []);

  // Format today's full date banner
  const todayFormatted = (() => {
    const now = new Date();
    try {
      const dateText = new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(now);
      // Capitalize first letter
      return dateText.charAt(0).toUpperCase() + dateText.slice(1);
    } catch {
      return 'Miércoles, 2 de Septiembre de 2026';
    }
  })();

  // Salutation based on time of day
  const greetingText = (() => {
    const hour = new Date().getHours();
    let salutation = 'Buenos días';
    if (hour >= 12 && hour < 19) salutation = 'Buenas tardes';
    else if (hour >= 19 || hour < 6) salutation = 'Buenas noches';

    const prefix = currentUser?.prefix || (activeRole === 'therapist' ? 'Lic.' : 'Dr.');
    const name = currentUser?.givenName ? `${currentUser.givenName} ${currentUser.familyName || ''}`.trim() : 'Alejandro Morales';
    return `${salutation}, ${prefix} ${name}`;
  })();

  // Calculate quick metrics
  const totalActiveAppointments = activeAppointments.length;
  const inWaitingRoomCount = appointments.filter(a => a.status === 'in_room').length;
  const labResultsCount = 5;
  const pendingPrescriptionsCount = 2;

  // Toggle Task (Auto-sorts uncompleted first, completed at the end)
  const handleToggleTask = (taskId) => {
    const updated = toggleTaskCompleted(taskId);
    setTasks(updated);
    if (addToast) {
      const task = updated.find(t => t.id === taskId);
      if (task?.completed) {
        addToast('success', 'Tarea completada (movida al final)', 'Tareas');
      } else {
        addToast('info', 'Tarea reabierta (movida a pendientes)', 'Tareas');
      }
    }
  };

  // Add Task
  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const updated = addPendingTask(newTaskTitle.trim(), null, false);
    setTasks(updated);
    setNewTaskTitle('');
    setIsAddingTask(false);
    if (addToast) {
      addToast('success', 'Nueva tarea agregada a pendientes', 'Tareas');
    }
  };

  // Delete Task
  const handleDeleteTask = (e, taskId) => {
    e.stopPropagation();
    const updated = deleteTask(taskId);
    setTasks(updated);
    if (addToast) {
      addToast('info', 'Tarea eliminada de la lista', 'Tareas');
    }
  };

  // Drag and Drop handlers for tasks
  const handleDragStart = (e, index) => {
    setDraggedTaskIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTaskIndex !== index) {
      setDragOverTaskIndex(index);
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedTaskIndex === null || draggedTaskIndex === targetIndex) {
      setDraggedTaskIndex(null);
      setDragOverTaskIndex(null);
      return;
    }

    const updated = reorderTasks(draggedTaskIndex, targetIndex);
    setTasks(updated);
    setDraggedTaskIndex(null);
    setDragOverTaskIndex(null);
    if (addToast) {
      addToast('success', 'Orden de tareas actualizado con éxito', 'Tareas');
    }
  };

  const handleDragEnd = () => {
    setDraggedTaskIndex(null);
    setDragOverTaskIndex(null);
  };

  // Handle AI Review Trigger
  const handleOpenAiHistory = async (patientId, patientName) => {
    const history = await loadPatientPastEncounters(patientId, patientName);
    if (history.length > 0) {
      setAiReviewEncounter(history[0]);
      setAiReviewList(history);
      setIsAiReviewModalOpen(true);
    } else {
      if (addToast) {
        addToast('info', 'No se encontraron consultas previas registradas', 'Historial');
      }
    }
  };

  // Shift name badge
  const shiftText = currentUser?.shiftInfo?.shiftType === 'afternoon'
    ? 'Turno Vespertino'
    : currentUser?.shiftInfo?.shiftType === 'night'
    ? 'Turno Nocturno'
    : 'Turno Matutino';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* =========================================================================
          TOP WELCOME & DATE HEADER BAR (Directly matching attached mockup)
          ========================================================================= */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {greetingText}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{todayFormatted}</span>
            <span>•</span>
            <span style={{ color: '#0f766e', fontWeight: 700 }}>{shiftText}</span>
            {currentUser?.consultingRoom && (
              <>
                <span>•</span>
                <span>{currentUser.consultingRoom}</span>
              </>
            )}
          </p>
        </div>

        {/* Date Filter Dropdown & Quick New Appointment Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
          {/* Date Selector Pill */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.45rem 0.95rem',
                borderRadius: '0.625rem',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease'
              }}
            >
              <Calendar size={15} color="#0f766e" />
              <span>{dateFilter === 'today' ? 'Hoy' : dateFilter === 'tomorrow' ? 'Mañana' : 'Esta Semana'}</span>
              <ChevronDown size={14} color="#64748b" />
            </button>

            {isDateDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '110%',
                  backgroundColor: '#ffffff',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  zIndex: 50,
                  width: '140px',
                  overflow: 'hidden',
                  padding: '0.25rem'
                }}
              >
                <button
                  type="button"
                  onClick={() => { setDateFilter('today'); setIsDateDropdownOpen(false); }}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem',
                    textAlign: 'left',
                    background: dateFilter === 'today' ? '#ecfdf5' : 'transparent',
                    color: dateFilter === 'today' ? '#047857' : '#334155',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => { setDateFilter('tomorrow'); setIsDateDropdownOpen(false); }}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem',
                    textAlign: 'left',
                    background: dateFilter === 'tomorrow' ? '#ecfdf5' : 'transparent',
                    color: dateFilter === 'tomorrow' ? '#047857' : '#334155',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Mañana
                </button>
                <button
                  type="button"
                  onClick={() => { setDateFilter('week'); setIsDateDropdownOpen(false); }}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem',
                    textAlign: 'left',
                    background: dateFilter === 'week' ? '#ecfdf5' : 'transparent',
                    color: dateFilter === 'week' ? '#047857' : '#334155',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Esta Semana
                </button>
              </div>
            )}
          </div>

          {/* New Appointment Quick Trigger */}
          <button
            type="button"
            onClick={() => onOpenScheduleModal && onOpenScheduleModal()}
            className="btn btn-primary"
            style={{
              backgroundColor: '#0f766e',
              fontSize: '0.8125rem',
              padding: '0.45rem 1rem',
              gap: '0.35rem',
              boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)'
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nueva cita</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          4 KEY CLINICAL METRIC CARDS (Directly matching attached mockup)
          ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}
      >
        {/* 1. Citas de hoy */}
        <div
          onClick={() => navigate('/agenda')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.875rem',
            border: '1px solid #e2e8f0',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0f766e';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 14px rgba(15, 118, 110, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.04)';
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '0.75rem',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Calendar size={24} strokeWidth={2.2} />
          </div>

          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
              Citas de hoy
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '2px' }}>
              <span style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1, fontFamily: 'var(--font-mono)' }}>
                {totalActiveAppointments}
              </span>
              {finishedAppointments.length > 0 && (
                <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, backgroundColor: '#ecfdf5', padding: '1px 6px', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>
                  {finishedAppointments.length} finalizadas
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Pacientes en sala */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.875rem',
            border: '1px solid #e2e8f0',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '0.75rem',
              backgroundColor: '#ccfbf1',
              color: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <UserCheck size={24} strokeWidth={2.2} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
              Pacientes en sala
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '2px' }}>
              <span style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1, fontFamily: 'var(--font-mono)' }}>
                {inWaitingRoomCount}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  padding: '2px 8px',
                  borderRadius: '9999px'
                }}
              >
                Esperando
              </span>
            </div>
          </div>
        </div>

        {/* 3. Resultados lab. */}
        <div
          onClick={() => navigate('/laboratorios')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.875rem',
            border: '1px solid #e2e8f0',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0284c7';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 14px rgba(2, 132, 199, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.04)';
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '0.75rem',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <FlaskConical size={24} strokeWidth={2.2} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
              Resultados lab.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '2px' }}>
              <span style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1, fontFamily: 'var(--font-mono)' }}>
                {labResultsCount}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  border: '1px solid #bae6fd',
                  padding: '2px 8px',
                  borderRadius: '9999px'
                }}
              >
                Nuevos
              </span>
            </div>
          </div>
        </div>

        {/* 4. Recetas pendientes */}
        <div
          onClick={() => navigate('/recetas')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.875rem',
            border: '1px solid #e2e8f0',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#d97706';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 14px rgba(217, 119, 6, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.04)';
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '0.75rem',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <FileText size={24} strokeWidth={2.2} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
              Recetas pendientes
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '2px' }}>
              <span style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1, fontFamily: 'var(--font-mono)' }}>
                {pendingPrescriptionsCount}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fde68a',
                  padding: '2px 8px',
                  borderRadius: '9999px'
                }}
              >
                Por firmar
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN 2-COLUMN SECTION: AGENDA DEL DÍA (Left) + TAREAS Y SUGERENCIAS AI (Right)
          ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.85fr) minmax(320px, 1fr)',
          gap: '1.5rem',
          alignItems: 'start'
        }}
      >
        {/* =========================================================================
            COLUMN 1: AGENDA DEL DÍA (Main interactive appointment list)
            ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Header row with "Ver agenda completa" */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Agenda del Día
              </h2>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: '9999px' }}>
                {activeAppointments.length} pendientes
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/agenda')}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#0f766e',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <span>Ver agenda completa</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Active Appointments List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {activeAppointments.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '0.875rem',
                  border: '1px solid #e2e8f0',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                }}
              >
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    backgroundColor: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.25rem'
                  }}
                >
                  <CheckCircle2 size={30} strokeWidth={2.2} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  ¡Agenda del día al día!
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#64748b', maxWidth: '440px', lineHeight: 1.45, margin: 0 }}>
                  No tienes consultas pendientes en este momento. Todas las citas programadas han sido completadas o no hay pacientes en espera.
                </p>
                {finishedAppointments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowFinishedSection(!showFinishedSection)}
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: '0.5rem', color: '#0f766e', borderColor: '#a7f3d0', gap: '0.4rem' }}
                  >
                    <Eye size={14} />
                    <span>{showFinishedSection ? 'Ocultar' : 'Ver'} {finishedAppointments.length} consultas finalizadas hoy</span>
                  </button>
                )}
              </div>
            ) : (
              activeAppointments.map((appt) => {
                const status = normalizeAppointmentStatus(appt.status);
                const isInRoom = status === 'in_room' || status === 'in_consultation';
                const isCurrentlyConsulting = status === 'in_consultation';

                const applyStatus = (nextStatus) => {
                  const updated = updateAppointmentStatus(appt.id, nextStatus);
                  setAppointments(updated);
                };

                return (
                  <div
                    key={appt.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '0.875rem',
                      border: isCurrentlyConsulting ? '1.5px solid #fecdd3' : isInRoom ? '1.5px solid #a7f3d0' : '1px solid #e2e8f0',
                      padding: '1.15rem 1.35rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1.25rem',
                      boxShadow: isCurrentlyConsulting ? '0 4px 12px rgba(225, 29, 72, 0.08)' : isInRoom ? '0 4px 12px rgba(16, 185, 129, 0.08)' : '0 1px 3px rgba(15, 23, 42, 0.04)',
                      transition: 'all 0.15s ease',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Left: Time Block + Patient Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: '240px', flex: '1 1 auto' }}>
                      {/* Time Box */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '70px',
                          padding: '0.4rem 0.6rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '0.625rem',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', fontFamily: 'var(--font-mono)' }}>
                          {appt.time}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                          {appt.period}
                        </span>
                      </div>

                      {/* Patient Name, Age, ID, Status Badge & Reason */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                            {appt.patientName}
                          </h3>

                          {/* Status Badge */}
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '1px 8px',
                              borderRadius: '9999px',
                              backgroundColor: appt.statusBg || '#f1f5f9',
                              color: appt.statusColor || '#475569',
                              border: `1px solid ${appt.statusBorder || '#cbd5e1'}`
                            }}
                          >
                            {appt.statusLabel || 'Programada'}
                          </span>
                        </div>

                        {/* Sub-info: Gender • Age • Document ID */}
                        <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span>{appt.gender}</span>
                          <span>•</span>
                          <span>{appt.age} años</span>
                          <span>•</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{appt.documentId}</span>
                        </div>

                        {/* Reason with Icon */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: '#334155', fontWeight: 600, marginTop: '2px' }}>
                          {activeRole === 'therapist' ? <Activity size={14} color="#0284c7" /> : <Stethoscope size={14} color="#0f766e" />}
                          <span>{appt.reason}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0, flexWrap: 'wrap' }}>
                      {status === 'planned' && (
                        <button
                          type="button"
                          onClick={() => {
                            applyStatus('confirmed');
                            if (addToast) addToast('success', `${appt.patientName}: cita confirmada`, 'Consulta');
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', color: '#0284c7' }}
                        >
                          Confirmar
                        </button>
                      )}
                      {status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => {
                            applyStatus('waiting');
                            if (addToast) addToast('success', `${appt.patientName} está en espera`, 'Recepción');
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem', color: '#475569' }}
                        >
                          <UserCheck size={13} />
                          <span>Llegó</span>
                        </button>
                      )}
                      {status === 'waiting' && (
                        <button
                          type="button"
                          onClick={() => {
                            applyStatus('in_room');
                            if (addToast) addToast('success', `${appt.patientName} pasó a sala`, 'Consulta');
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', color: '#047857' }}
                        >
                          <UserCheck size={13} />
                          <span>En sala</span>
                        </button>
                      )}
                      {(status === 'in_room' || status === 'in_consultation') && (
                        <button
                          type="button"
                          onClick={() => {
                            applyStatus('in_consultation');
                            navigate(`/consulta?patientId=${appt.patientId}`);
                          }}
                          className="btn btn-primary"
                          style={{
                            backgroundColor: isCurrentlyConsulting ? '#e11d48' : '#0f766e',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            padding: '0.55rem 1.25rem',
                            borderRadius: '0.625rem',
                            boxShadow: isCurrentlyConsulting ? '0 4px 10px rgba(225, 29, 72, 0.25)' : '0 4px 10px rgba(15, 118, 110, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          <Stethoscope size={15} />
                          <span>{isCurrentlyConsulting ? 'Continuar consulta' : 'Iniciar consulta'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/pacientes/${appt.patientId}`)}
                        className="btn btn-secondary"
                        style={{
                          fontSize: '0.8125rem',
                          padding: '0.5rem 1rem',
                          borderRadius: '0.625rem',
                          color: '#334155'
                        }}
                      >
                        <span>Ver ficha</span>
                      </button>
                      {!isTerminalAppointmentStatus(status) && status !== 'in_consultation' && (
                        <button
                          type="button"
                          onClick={() => {
                            applyStatus('cancelled');
                            if (addToast) addToast('info', `${appt.patientName}: cita cancelada`, 'Consulta');
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', color: '#991b1b' }}
                          title="Cancelar cita"
                        >
                          <Ban size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Collapsible Section for Finished Consultations of the Day */}
          {finishedAppointments.length > 0 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                padding: '1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <div
                onClick={() => setShowFinishedSection(!showFinishedSection)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#ecfdf5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Check size={14} strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#334155' }}>
                    Consultas finalizadas hoy ({finishedAppointments.length})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                  <span>{showFinishedSection ? 'Ocultar' : 'Mostrar'}</span>
                  <ChevronDown
                    size={16}
                    style={{
                      transform: showFinishedSection ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease'
                    }}
                  />
                </div>
              </div>

              {showFinishedSection && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                  {finishedAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '0.625rem',
                        border: '1px solid #e2e8f0',
                        gap: '0.75rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                          {appt.time} {appt.period}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                            {appt.patientName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {appt.reason}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0',
                            padding: '1px 7px',
                            borderRadius: '9999px'
                          }}
                        >
                          ✓ Completada
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenAiHistory(appt.patientId, appt.patientName)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', color: '#0f766e', borderColor: '#a7f3d0' }}
                        >
                          <Eye size={12} />
                          <span>Ver historial</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/pacientes/${appt.patientId}`)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                        >
                          <span>Ficha</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* =========================================================================
            COLUMN 2: TAREAS PENDIENTES & SUGERENCIAS AI (Sidebar Widgets)
            ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* 1. TAREAS PENDIENTES WIDGET (Directly matching attached mockup) */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            {/* Widget Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Tareas Pendientes
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '9999px' }}>
                  {tasks.filter(t => !t.completed).length} pendientes
                </span>

                <button
                  type="button"
                  onClick={() => setIsAddingTask(!isAddingTask)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#0f766e',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Añadir tarea"
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Add Task Input (Collapsible) */}
            {isAddingTask && (
              <form onSubmit={handleCreateTask} style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Nueva tarea médica..."
                  className="form-input"
                  style={{ height: '32px', fontSize: '0.78rem', flex: 1 }}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ backgroundColor: '#0f766e', padding: '0 0.6rem' }}
                >
                  <Check size={14} />
                </button>
              </form>
            )}

            {/* Drag & Drop Instructions Sub-bar */}
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <GripVertical size={12} />
              <span>Arrastra y suelta para reordenar prioridades</span>
            </div>

            {/* Drag & Drop Task List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tasks.map((task, index) => {
                const isDragging = draggedTaskIndex === index;
                const isDragOver = dragOverTaskIndex === index;

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      padding: '0.55rem 0.65rem',
                      borderRadius: '0.625rem',
                      backgroundColor: isDragOver ? '#f0fdfa' : task.completed ? '#f8fafc' : '#ffffff',
                      border: isDragOver ? '2px dashed #0f766e' : task.completed ? '1px solid #f1f5f9' : '1px solid #e2e8f0',
                      opacity: isDragging ? 0.35 : 1,
                      transform: isDragOver ? 'scale(1.01)' : 'none',
                      boxShadow: isDragOver ? '0 4px 12px rgba(15, 118, 110, 0.15)' : '0 1px 2px rgba(0,0,0,0.02)',
                      cursor: 'grab',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    {/* Drag Grip Handle */}
                    <div
                      style={{
                        cursor: 'grab',
                        color: '#94a3b8',
                        marginTop: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0
                      }}
                      title="Arrastrar para mover"
                    >
                      <GripVertical size={15} />
                    </div>

                    {/* Custom Checkbox */}
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        marginTop: '4px',
                        cursor: 'pointer',
                        width: '16px',
                        height: '16px',
                        accentColor: '#0f766e',
                        flexShrink: 0
                      }}
                    />

                    {/* Task Title & Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          color: task.completed ? '#94a3b8' : '#0f172a',
                          textDecoration: task.completed ? 'line-through' : 'none',
                          lineHeight: 1.3,
                          wordBreak: 'break-word'
                        }}
                      >
                        {task.title}
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {task.urgent && (
                          <span style={{ color: '#e11d48', fontWeight: 800 }}>
                            Urgente •
                          </span>
                        )}
                        {task.patient && <span>Paciente: {task.patient}</span>}
                        {task.badgeText && !task.urgent && (
                          <span style={{ color: '#d97706', fontWeight: 700 }}>
                            {task.badgeText}
                          </span>
                        )}
                        {task.completed && (
                          <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.68rem' }}>
                            ✓ Completada
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete Action Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTask(e, task.id)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#cbd5e1',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        flexShrink: 0,
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#e11d48'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}
                      title="Eliminar tarea"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Link */}
            <div style={{ paddingTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => {
                  const sorted = sortTasksByCompletion(tasks);
                  setTasks(sorted);
                  if (addToast) addToast('info', 'Tareas reordenadas: pendientes primero, completadas al final', 'Tareas');
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#0f766e',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Reordenar (Pendientes arriba)
              </button>

              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                {tasks.length} tareas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PREVIOUS ENCOUNTER REVIEW MODAL (from agenda "Ver historial")
          ========================================================================= */}
      <PreviousEncounterReviewModal
        isOpen={isAiReviewModalOpen}
        encounter={aiReviewEncounter}
        encountersList={aiReviewList}
        onClose={() => setIsAiReviewModalOpen(false)}
        onSelectEncounter={(enc) => setAiReviewEncounter(enc)}
        onEncounterUpdated={(updated) => {
          setAiReviewEncounter(updated);
          setAiReviewList(prev => prev.map(item => item.id === updated.id ? updated : item));
        }}
        onEncounterDeleted={(deletedId) => {
          const next = aiReviewList.filter(item => item.id !== deletedId);
          setAiReviewList(next);
          if (next.length === 0) {
            setIsAiReviewModalOpen(false);
            setAiReviewEncounter(null);
          } else {
            setAiReviewEncounter(next[0]);
          }
        }}
        addToast={addToast}
      />
    </div>
  );
}
