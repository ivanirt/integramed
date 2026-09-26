import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Calendar,
  Clock,
  User,
  Check,
  AlertCircle,
  FileText,
  RotateCw
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getStaffList, getStaffFullName } from '../../utils/staffStorage';
import { getLocations } from '../../utils/facilityStorage';

export default function CoverageRequestModal({
  isOpen,
  onClose,
  coverage, // null for create, object for edit
  onSave
}) {
  const { language, t } = useLanguage();
  const [staffList, setStaffList] = useState(() => getStaffList());
  const [locations, setLocations] = useState(() => getLocations());

  const [formData, setFormData] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    originalPractitionerId: '',
    originalPractitionerName: '',
    substitutePractitionerId: '',
    substitutePractitionerName: '',
    role: 'doctor',
    shiftType: 'morning',
    shiftHours: '08:00 - 15:00',
    locationName: 'Plantel Santa Fe',
    reasonType: 'congress',
    reason: '',
    status: 'approved',
    approvedBy: 'Dirección Médica IntegraMed',
    notes: ''
  });

  const [error, setError] = useState('');

  const reasonTypes = [
    { id: 'congress', labelEs: 'Asistencia a Congreso / Capacitación', labelEn: 'Medical Congress / Training' },
    { id: 'vacation', labelEs: 'Periodo Vacacional', labelEn: 'Vacation Leave' },
    { id: 'medical_leave', labelEs: 'Incapacidad Médica / Salud', labelEn: 'Medical Leave / Illness' },
    { id: 'emergency', labelEs: 'Emergencia Personal / Familiar', labelEn: 'Family / Personal Emergency' },
    { id: 'shift_swap', labelEs: 'Permuta o Intercambio de Turno', labelEn: 'Shift Swap' }
  ];

  useEffect(() => {
    if (isOpen) {
      const currentStaff = getStaffList();
      const currentLocs = getLocations();
      setStaffList(currentStaff);
      setLocations(currentLocs);
      setError('');

      if (coverage) {
        setFormData({ ...coverage });
      } else {
        const staffA = currentStaff[0] || null;
        const staffB = currentStaff[1] || currentStaff[0] || null;

        setFormData({
          id: `cov-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          originalPractitionerId: staffA?.id || '',
          originalPractitionerName: getStaffFullName(staffA),
          substitutePractitionerId: staffB?.id || '',
          substitutePractitionerName: getStaffFullName(staffB),
          role: staffA?.primaryRole || 'doctor',
          shiftType: 'morning',
          shiftHours: '08:00 - 15:00',
          locationName: currentLocs[0]?.name || 'Plantel Santa Fe',
          reasonType: 'congress',
          reason: 'Asistencia a Jornadas Médicas',
          status: 'approved',
          approvedBy: 'Dirección Médica IntegraMed',
          notes: ''
        });
      }
    }
  }, [isOpen, coverage]);

  if (!isOpen) return null;

  const handleOriginalStaffChange = (staffId) => {
    const s = staffList.find(item => item.id === staffId);
    if (s) {
      setFormData(prev => ({
        ...prev,
        originalPractitionerId: s.id,
        originalPractitionerName: getStaffFullName(s),
        role: s.primaryRole || s.roles?.[0] || 'doctor'
      }));
    }
  };

  const handleSubstituteStaffChange = (staffId) => {
    const s = staffList.find(item => item.id === staffId);
    if (s) {
      setFormData(prev => ({
        ...prev,
        substitutePractitionerId: s.id,
        substitutePractitionerName: getStaffFullName(s)
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.originalPractitionerId || !formData.substitutePractitionerId) {
      setError(language === 'en' ? 'Both original and substitute practitioners are required' : 'Debe seleccionar tanto al titular como al sustituto');
      return;
    }
    if (formData.originalPractitionerId === formData.substitutePractitionerId) {
      setError(language === 'en' ? 'Substitute must be a different practitioner' : 'El sustituto debe ser un colaborador diferente');
      return;
    }

    onSave(formData);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '1.25rem',
        animation: 'fadeIn 0.15s ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '640px',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'slideUp 0.2s ease'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fafafa'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RotateCw size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {coverage
                  ? (language === 'en' ? 'Edit Staff Coverage / Substitute' : 'Editar Asignación de Sustituto / Relevo')
                  : (language === 'en' ? 'Assign Staff Substitute / Coverage' : 'Asignar Médico o Personal Sustituto (Relevo)')}
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                {language === 'en' ? 'Register shift replacements for leaves, congresses or holidays' : 'Registro oficial de suplencias por vacaciones, congresos o permisos'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.35rem',
              display: 'flex'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Original Practitioner -> Substitute Practitioner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#b91c1c', marginBottom: '0.35rem' }}>
                {language === 'en' ? '1. Practitioner on Leave (Titular) *' : '1. Colaborador Titular (Ausente) *'}
              </label>
              <select
                className="form-input"
                value={formData.originalPractitionerId}
                onChange={(e) => handleOriginalStaffChange(e.target.value)}
                required
              >
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>
                    {getStaffFullName(s)} ({s.specialty || s.primaryRole})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#047857', marginBottom: '0.35rem' }}>
                {language === 'en' ? '2. Substitute Practitioner (Relevo) *' : '2. Colaborador Sustituto (Relevo) *'}
              </label>
              <select
                className="form-input"
                value={formData.substitutePractitionerId}
                onChange={(e) => handleSubstituteStaffChange(e.target.value)}
                required
              >
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>
                    {getStaffFullName(s)} ({s.specialty || s.primaryRole})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date and Shift Hours */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Date of Coverage *' : 'Fecha de la Suplencia *'}
              </label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Shift Hours to Cover' : 'Horario a Cubrir'}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.shiftHours}
                onChange={(e) => setFormData({ ...formData, shiftHours: e.target.value })}
                placeholder="08:00 - 15:00"
              />
            </div>
          </div>

          {/* Reason Type and Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Reason Category' : 'Motivo de la Ausencia'}
              </label>
              <select
                className="form-input"
                value={formData.reasonType}
                onChange={(e) => setFormData({ ...formData, reasonType: e.target.value })}
              >
                {reasonTypes.map(rt => (
                  <option key={rt.id} value={rt.id}>
                    {language === 'en' ? rt.labelEn : rt.labelEs}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Detailed Reason / Justification' : 'Detalle o Justificación'}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Ej. Asistencia al Congreso Nacional de Medicina"
              />
            </div>
          </div>

          {/* Location and Approval Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Plantel / Facility' : 'Plantel / Sede'}
              </label>
              <select
                className="form-input"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
              >
                {locations.map(l => (
                  <option key={l.id} value={l.name}>{l.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Approval Status' : 'Estado de Aprobación'}
              </label>
              <select
                className="form-input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="approved">{language === 'en' ? 'Approved by Direction' : 'Aprobado por Dirección'}</option>
                <option value="pending">{language === 'en' ? 'Pending Approval' : 'Pendiente de Aprobación'}</option>
                <option value="completed">{language === 'en' ? 'Completed' : 'Completado'}</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              {language === 'en' ? 'Clinical Directives for Substitute' : 'Directivas y Pacientes a Atender'}
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ej. Cobertura de 6 pacientes en consulta externa y pase de visita"
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              {language === 'en' ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ backgroundColor: '#0f766e' }}
            >
              <Check size={16} />
              <span>{language === 'en' ? 'Save Substitute Assignment' : 'Guardar Asignación de Relevo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
