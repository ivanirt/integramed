import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Calendar,
  Clock,
  User,
  MapPin,
  Check,
  AlertCircle,
  Building
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { GUARD_TYPES } from '../../utils/shiftGuardStorage';
import { getStaffList, getStaffFullName } from '../../utils/staffStorage';
import { getLocations } from '../../utils/facilityStorage';

export default function ScheduleGuardModal({
  isOpen,
  onClose,
  guard, // null for new, object for edit
  onSave
}) {
  const { language, t } = useLanguage();
  const [staffList, setStaffList] = useState(() => getStaffList());
  const [locations, setLocations] = useState(() => getLocations());

  const [formData, setFormData] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    practitionerId: '',
    practitionerName: '',
    role: 'doctor',
    guardType: 'presential_24h',
    locationName: 'Plantel Santa Fe — Sede Principal',
    department: 'Urgencias Médicas y Triage',
    shiftHours: '08:00 - 08:00 (+1)',
    status: 'scheduled',
    notes: ''
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const currentStaff = getStaffList();
      const currentLocs = getLocations();
      setStaffList(currentStaff);
      setLocations(currentLocs);
      setError('');

      if (guard) {
        setFormData({ ...guard });
      } else {
        const firstDoctor = currentStaff.find(s => s.roles?.includes('doctor')) || currentStaff[0];
        setFormData({
          id: `guard-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          practitionerId: firstDoctor?.id || '',
          practitionerName: getStaffFullName(firstDoctor),
          role: firstDoctor?.primaryRole || 'doctor',
          guardType: 'presential_24h',
          locationName: currentLocs[0]?.name || 'Plantel Santa Fe',
          department: 'Urgencias Médicas y Triage',
          shiftHours: '08:00 - 08:00 (+1)',
          status: 'scheduled',
          notes: ''
        });
      }
    }
  }, [isOpen, guard]);

  if (!isOpen) return null;

  const handleStaffChange = (staffId) => {
    const selected = staffList.find(s => s.id === staffId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        practitionerId: selected.id,
        practitionerName: getStaffFullName(selected),
        role: selected.primaryRole || selected.roles?.[0] || 'doctor'
      }));
    }
  };

  const handleGuardTypeChange = (typeKey) => {
    const gType = GUARD_TYPES[typeKey];
    setFormData(prev => ({
      ...prev,
      guardType: typeKey,
      shiftHours: gType?.hours || prev.shiftHours
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.practitionerId) {
      setError(language === 'en' ? 'Please select a practitioner for the guard duty' : 'Seleccione al profesional asignado a la guardia');
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
          maxWidth: '580px',
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
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#e11d48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Shield size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {guard
                  ? (language === 'en' ? 'Edit Clinical Guard' : 'Editar Guardia Clínica')
                  : (language === 'en' ? 'Schedule New Guard Duty' : 'Programar Nueva Guardia Clínica')}
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                {language === 'en' ? 'Assign on-call medical or nursing staff' : 'Asigna personal médico o de enfermería para cobertura de guardia'}
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

          {/* Practitioner Picker */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              {language === 'en' ? 'Assigned Practitioner *' : 'Profesional Asignado a Guardia *'}
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <select
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                value={formData.practitionerId}
                onChange={(e) => handleStaffChange(e.target.value)}
                required
              >
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>
                    {getStaffFullName(s)} — {s.specialty || s.primaryRole}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date and Guard Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Guard Date *' : 'Fecha de la Guardia *'}
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
                {language === 'en' ? 'Guard Type' : 'Modalidad de Guardia'}
              </label>
              <select
                className="form-input"
                value={formData.guardType}
                onChange={(e) => handleGuardTypeChange(e.target.value)}
              >
                {Object.values(GUARD_TYPES).map(gt => (
                  <option key={gt.id} value={gt.id}>
                    {language === 'en' ? gt.labelEn : gt.labelEs}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location and Department */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Plantel / Location' : 'Plantel / Sede Asignada'}
              </label>
              <select
                className="form-input"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Department / Service Area' : 'Área o Servicio'}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Urgencias y Triage / Terapia Intensiva"
              />
            </div>
          </div>

          {/* Schedule Hours and Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Guard Hours' : 'Horario de Guardia'}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.shiftHours}
                onChange={(e) => setFormData({ ...formData, shiftHours: e.target.value })}
                placeholder="08:00 - 08:00 (+1)"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Status' : 'Estado'}
              </label>
              <select
                className="form-input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="scheduled">{language === 'en' ? 'Scheduled' : 'Programada'}</option>
                <option value="active">{language === 'en' ? 'Active / On Duty Now' : 'En Curso / En Guardia'}</option>
                <option value="completed">{language === 'en' ? 'Completed' : 'Completada'}</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              {language === 'en' ? 'Observations / Directives' : 'Observaciones o Directivas'}
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ej. Jefe de guardia médica para soporte respiratorio"
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
              <span>{language === 'en' ? 'Save Guard' : 'Guardar Guardia'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
