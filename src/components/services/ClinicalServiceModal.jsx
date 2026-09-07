import React, { useState, useEffect } from 'react';
import {
  X,
  Stethoscope,
  Radio,
  FlaskConical,
  Activity,
  Sparkles,
  AlertCircle,
  Clock,
  DollarSign,
  Building2,
  Check,
  FileText,
  HelpCircle,
  Layers
} from 'lucide-react';
import { SERVICE_CATEGORIES } from '../../utils/clinicalServicesStorage';
import { getLocations } from '../../utils/facilityStorage';
import { useLanguage } from '../../i18n/LanguageContext';

export default function ClinicalServiceModal({
  isOpen,
  onClose,
  service,
  onSave
}) {
  const { language, t } = useLanguage();
  const [locations, setLocations] = useState(() => getLocations());

  const [formData, setFormData] = useState({
    id: '',
    code: '',
    nameEs: '',
    nameEn: '',
    category: 'consulta_especialidad',
    department: 'Medicina General',
    descriptionEs: '',
    descriptionEn: '',
    durationMinutes: 30,
    price: 600,
    currency: 'MXN',
    requiresAppointment: true,
    preparationInstructionsEs: '',
    preparationInstructionsEn: '',
    turnaroundTimeEs: 'Inmediato (en consulta)',
    turnaroundTimeEn: 'Immediate (in consultation)',
    sampleType: 'N/A',
    equipmentRequired: '',
    availableLocations: [],
    status: 'available'
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setLocations(getLocations());
      if (service) {
        setFormData({
          id: service.id || '',
          code: service.code || '',
          nameEs: service.nameEs || '',
          nameEn: service.nameEn || '',
          category: service.category || 'consulta_especialidad',
          department: service.department || '',
          descriptionEs: service.descriptionEs || '',
          descriptionEn: service.descriptionEn || '',
          durationMinutes: service.durationMinutes || 30,
          price: service.price || 0,
          currency: service.currency || 'MXN',
          requiresAppointment: service.requiresAppointment !== undefined ? service.requiresAppointment : true,
          preparationInstructionsEs: service.preparationInstructionsEs || '',
          preparationInstructionsEn: service.preparationInstructionsEn || '',
          turnaroundTimeEs: service.turnaroundTimeEs || '',
          turnaroundTimeEn: service.turnaroundTimeEn || '',
          sampleType: service.sampleType || 'N/A',
          equipmentRequired: service.equipmentRequired || '',
          availableLocations: Array.isArray(service.availableLocations) ? [...service.availableLocations] : [],
          status: service.status || 'available'
        });
      } else {
        const allLocIds = getLocations().map(l => l.id);
        setFormData({
          id: `serv-${Date.now()}`,
          code: 'CPT-',
          nameEs: '',
          nameEn: '',
          category: 'consulta_especialidad',
          department: 'Medicina Especializada',
          descriptionEs: '',
          descriptionEn: '',
          durationMinutes: 30,
          price: 750,
          currency: 'MXN',
          requiresAppointment: true,
          preparationInstructionsEs: 'Sin preparación especial previa.',
          preparationInstructionsEn: 'No special prior preparation required.',
          turnaroundTimeEs: 'Inmediato (en consulta)',
          turnaroundTimeEn: 'Immediate (in consultation)',
          sampleType: 'N/A',
          equipmentRequired: '',
          availableLocations: allLocIds,
          status: 'available'
        });
      }
    }
  }, [isOpen, service]);

  if (!isOpen) return null;

  const handleLocationToggle = (locId) => {
    setFormData(prev => {
      const exists = prev.availableLocations.includes(locId);
      return {
        ...prev,
        availableLocations: exists
          ? prev.availableLocations.filter(id => id !== locId)
          : [...prev.availableLocations, locId]
      };
    });
  };

  const handleSelectAllLocations = () => {
    setFormData(prev => ({
      ...prev,
      availableLocations: locations.map(l => l.id)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nameEs.trim() && !formData.nameEn.trim()) {
      setError(language === 'en' ? 'Service name is required' : 'El nombre del servicio es requerido');
      return;
    }
    if (!formData.code.trim()) {
      setError(language === 'en' ? 'Service code is required' : 'El código clínico (CPT/LOINC) es requerido');
      return;
    }

    onSave({
      ...formData,
      nameEs: formData.nameEs.trim() || formData.nameEn.trim(),
      nameEn: formData.nameEn.trim() || formData.nameEs.trim(),
      code: formData.code.trim().toUpperCase(),
      durationMinutes: Number(formData.durationMinutes) || 30,
      price: Number(formData.price) || 0
    });
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
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'slideUp 0.2s ease'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fafafa'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Stethoscope size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {service
                  ? (language === 'en' ? 'Edit Clinical & Diagnostic Service' : 'Editar Servicio Clínico / Diagnóstico')
                  : (language === 'en' ? 'New Clinical & Diagnostic Service' : 'Nuevo Servicio Clínico / Diagnóstico')}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                {language === 'en'
                  ? 'Configure service code, category, expected duration, fees, preparation, and locations'
                  : 'Configura código clínico, categoría, duración esperada, precio, preparación y sedes'}
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
              padding: '0.4rem',
              borderRadius: '0.375rem'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div
            style={{
              margin: '1rem 1.75rem 0',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Service Names */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Service Name (Spanish) *' : 'Nombre del Servicio (Español) *'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.nameEs}
                  onChange={(e) => setFormData({ ...formData, nameEs: e.target.value })}
                  placeholder="ej. Ecocardiograma Doppler Color Transtorácico"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Service Name (English)' : 'Nombre del Servicio (Inglés)'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder="e.g. Transthoracic Color Doppler Echocardiogram"
                />
              </div>
            </div>

            {/* Code, Category, Department & Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.2fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Code (CPT / LOINC) *' : 'Código (CPT / LOINC) *'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="CPT-93306"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Clinical Category' : 'Categoría Clínica'}
                </label>
                <select
                  className="form-input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {Object.values(SERVICE_CATEGORIES).map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {language === 'en' ? cat.labelEn : cat.labelEs}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Department' : 'Departamento'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="ej. Cardiología / Imagenología"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Status' : 'Disponibilidad'}
                </label>
                <select
                  className="form-input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="available">{language === 'en' ? 'Available' : 'Disponible'}</option>
                  <option value="temporarily_unavailable">{language === 'en' ? 'Unavailable' : 'No Disponible'}</option>
                  <option value="maintenance">{language === 'en' ? 'In Maintenance' : 'En Mantenimiento'}</option>
                </select>
              </div>
            </div>

            {/* Duration, Price, Appointment Required & Sample Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Duration (Minutes)' : 'Duración (Minutos)'}
                </label>
                <select
                  className="form-input"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                >
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                  <option value={20}>20 min</option>
                  <option value={25}>25 min</option>
                  <option value={30}>30 min</option>
                  <option value={40}>40 min</option>
                  <option value={45}>45 min</option>
                  <option value={50}>50 min</option>
                  <option value={60}>60 min (1 h)</option>
                  <option value={90}>90 min (1.5 h)</option>
                  <option value={120}>120 min (2 h)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Fee / Price ($ MXN)' : 'Precio / Tarifa ($ MXN)'}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700 }}>$</span>
                  <input
                    type="number"
                    className="form-input"
                    style={{ paddingLeft: '1.75rem' }}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    min="0"
                    step="10"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Appointment Required?' : '¿Requiere Cita?'}
                </label>
                <select
                  className="form-input"
                  value={formData.requiresAppointment ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, requiresAppointment: e.target.value === 'true' })}
                >
                  <option value="true">{language === 'en' ? 'Yes (Scheduled)' : 'Sí (Con Cita)'}</option>
                  <option value="false">{language === 'en' ? 'No (Walk-in / Urgent)' : 'No (Sin Cita / Directo)'}</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Sample Type / Matrix' : 'Tipo de Muestra'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.sampleType}
                  onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })}
                  placeholder="Sangre / N/A"
                />
              </div>
            </div>

            {/* Preparation Instructions & Turnaround Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Patient Preparation Instructions' : 'Instrucciones de Preparación para el Paciente'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.preparationInstructionsEs}
                  onChange={(e) => setFormData({ ...formData, preparationInstructionsEs: e.target.value })}
                  placeholder="ej. Ayuno de 8 a 12 horas. Traer ropa cómoda de dos piezas."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Turnaround / Delivery Time' : 'Tiempo de Entrega / Resultados'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.turnaroundTimeEs}
                  onChange={(e) => setFormData({ ...formData, turnaroundTimeEs: e.target.value })}
                  placeholder="ej. Mismo día (2 horas) / Inmediato"
                />
              </div>
            </div>

            {/* Clinical Equipment & Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Clinical Technology / Equipment Required' : 'Equipamiento o Tecnología Requerida'}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.equipmentRequired}
                onChange={(e) => setFormData({ ...formData, equipmentRequired: e.target.value })}
                placeholder="ej. Ecógrafo Cardiovascular Philips CX50 / Analizador Beckman AU480"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Clinical Description & Scope' : 'Descripción y Alcance Clínico'}
              </label>
              <textarea
                className="form-input"
                rows={2}
                value={formData.descriptionEs}
                onChange={(e) => setFormData({ ...formData, descriptionEs: e.target.value })}
                placeholder="Detalle clínico del estudio, diagnóstico y metodología de atención..."
              />
            </div>

            {/* Available Planteles / Locations Selector */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                  {language === 'en' ? 'Available at Facilities / Planteles' : 'Sedes y Planteles donde se Ofrece'}
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllLocations}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0d9488',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {language === 'en' ? 'Select all planteles' : 'Seleccionar todas las sedes'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                {locations.map(loc => {
                  const isChecked = formData.availableLocations.includes(loc.id);
                  return (
                    <div
                      key={loc.id}
                      onClick={() => handleLocationToggle(loc.id)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: isChecked ? '1px solid #0d9488' : '1px solid #e2e8f0',
                        backgroundColor: isChecked ? '#f0fdf4' : '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: isChecked ? '1px solid #0d9488' : '1px solid #cbd5e1',
                          backgroundColor: isChecked ? '#0d9488' : '#ffffff',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {loc.name}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          {loc.address?.district || loc.code}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '1rem 1.75rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              backgroundColor: '#fafafa'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              {language === 'en' ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ backgroundColor: '#0f766e', fontSize: '0.85rem', gap: '0.4rem', padding: '0.55rem 1.4rem' }}
            >
              <Check size={16} />
              <span>{service ? (language === 'en' ? 'Save Changes' : 'Guardar Cambios') : (language === 'en' ? 'Create Service' : 'Registrar Servicio')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
