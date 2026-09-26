import React, { useEffect, useState } from 'react';
import { X, MapPin, Check, AlertCircle, Plus } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  AREA_TYPES,
  areaTypeLabel,
  getFacilityServicesCatalog,
  saveFacilityServiceCatalogItem
} from '../../utils/facilityStorage';
import { getStaffList, getStaffFullName } from '../../utils/staffStorage';

export default function AreaModal({
  isOpen,
  onClose,
  area,
  organization,
  onSave
}) {
  const { language } = useLanguage();
  const staff = getStaffList();
  const [servicesCatalog, setServicesCatalog] = useState(() => getFacilityServicesCatalog());
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    areaType: 'consultation',
    status: 'active',
    services: [],
    practitionerIds: []
  });
  const [newService, setNewService] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setNewService('');
    setServicesCatalog(getFacilityServicesCatalog());
    if (area) {
      setFormData({
        id: area.id,
        name: area.name || '',
        areaType: area.areaType || 'consultation',
        status: area.status || 'active',
        services: Array.isArray(area.services) ? [...area.services] : [],
        practitionerIds: Array.isArray(area.practitionerIds) ? [...area.practitionerIds] : []
      });
      return;
    }
    setFormData({
      id: `loc-${Date.now()}`,
      name: '',
      areaType: 'consultation',
      status: 'active',
      services: [],
      practitionerIds: []
    });
  }, [isOpen, area]);

  if (!isOpen) return null;

  const toggleService = (name) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(name)
        ? prev.services.filter((item) => item !== name)
        : [...prev.services, name]
    }));
  };

  const addService = () => {
    const name = newService.trim();
    if (!name) return;
    saveFacilityServiceCatalogItem(name);
    setServicesCatalog(getFacilityServicesCatalog());
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(name) ? prev.services : [...prev.services, name]
    }));
    setNewService('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      setError(language === 'en' ? 'Area name is required' : 'El nombre del área es requerido');
      return;
    }
    onSave({
      ...area,
      ...formData,
      organizationId: organization?.id,
      kind: 'area',
      typeName: areaTypeLabel(formData.areaType, language),
      address: organization?.address
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '1.25rem'
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflow: 'auto',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div
          style={{
            padding: '1.15rem 1.35rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#ccfbf1',
                color: '#0f766e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MapPin size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {area
                  ? (language === 'en' ? 'Edit area' : 'Editar área')
                  : (language === 'en' ? 'New area' : 'Nueva área')}
              </h2>
              <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                {organization?.name}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.7rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.8125rem', display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
              {language === 'en' ? 'Area name *' : 'Nombre del área *'}
            </span>
            <input
              className="form-input"
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              placeholder={language === 'en' ? 'Consultation room 1' : 'Consultorio 1'}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <label>
              <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                {language === 'en' ? 'Location type' : 'Tipo de ubicación'}
              </span>
              <select
                className="form-input"
                value={formData.areaType}
                onChange={(event) => setFormData({ ...formData, areaType: event.target.value })}
              >
                {AREA_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {language === 'en' ? type.labelEn : type.labelEs}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                {language === 'en' ? 'Status' : 'Estado'}
              </span>
              <select
                className="form-input"
                value={formData.status}
                onChange={(event) => setFormData({ ...formData, status: event.target.value })}
              >
                <option value="active">{language === 'en' ? 'Active' : 'Activa'}</option>
                <option value="inactive">{language === 'en' ? 'Inactive' : 'Inactiva'}</option>
              </select>
            </label>
          </div>

          <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.85rem' }}>
            <legend style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0 0.35rem' }}>
              {language === 'en' ? 'Services' : 'Servicios'}
            </legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflow: 'auto' }}>
              {servicesCatalog.map((name) => (
                <label key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#0f172a' }}>
                  <input type="checkbox" checked={formData.services.includes(name)} onChange={() => toggleService(name)} />
                  {name}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.7rem' }}>
              <input
                className="form-input"
                value={newService}
                onChange={(event) => setNewService(event.target.value)}
                placeholder={language === 'en' ? 'Add service' : 'Añadir servicio'}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={addService}>
                <Plus size={14} />
              </button>
            </div>
          </fieldset>

          <label>
            <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
              {language === 'en' ? 'Assigned staff' : 'Personal asignado'}
            </span>
            <select
              className="form-input"
              multiple
              value={formData.practitionerIds}
              onChange={(event) => {
                const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                setFormData({ ...formData, practitionerIds: values });
              }}
              style={{ minHeight: '110px' }}
            >
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {getStaffFullName(member)}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {language === 'en' ? 'Cancel' : 'Cancelar'}
            </button>
            <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#0f766e' }}>
              <Check size={16} />
              {language === 'en' ? 'Save area' : 'Guardar área'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
