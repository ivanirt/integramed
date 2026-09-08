import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Building,
  Phone,
  Mail,
  Clock,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Sparkles,
  Stethoscope,
  Activity,
  Bed,
  HeartPulse
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  getFacilityResourceTypes,
  getFacilityServicesCatalog,
  saveFacilityServiceCatalogItem
} from '../../utils/facilityStorage';
import { getResourceIconComponent } from './FacilityCatalogManagerModal';

export default function LocationModal({
  isOpen,
  onClose,
  location, // null for create, object for edit
  organizations = [],
  onSave
}) {
  const { language, t } = useLanguage();

  const [resourceTypes, setResourceTypes] = useState(() => getFacilityResourceTypes());
  const [servicesCatalog, setServicesCatalog] = useState(() => getFacilityServicesCatalog());

  const [formData, setFormData] = useState({
    id: '',
    organizationId: '',
    code: '',
    name: '',
    description: '',
    type: 'clinic',
    typeName: 'Clínica Ambulatoria',
    status: 'active',
    phone: '',
    email: '',
    operatingHours: 'Lunes a Sábado: 08:00 - 20:00',
    address: {
      line: '',
      district: '',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '',
      country: 'México'
    },
    capacity: {
      consultingRooms: 6,
      therapyBooths: 2,
      operatingTheaters: 0,
      recoveryBeds: 2
    },
    services: [],
    rooms: []
  });

  const [newService, setNewService] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomSpecialty, setNewRoomSpecialty] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setNewService('');
      setNewRoomName('');
      setNewRoomSpecialty('');

      // Refresh dynamic catalogs
      const freshResourceTypes = getFacilityResourceTypes();
      const freshServicesCatalog = getFacilityServicesCatalog();
      setResourceTypes(freshResourceTypes);
      setServicesCatalog(freshServicesCatalog);

      if (location) {
        setFormData({
          ...location,
          address: location.address ? { ...location.address } : {
            line: '',
            district: '',
            city: 'Ciudad de México',
            state: 'CDMX',
            postalCode: '',
            country: 'México'
          },
          capacity: location.capacity ? { ...location.capacity } : {
            consultingRooms: 6,
            therapyBooths: 2,
            operatingTheaters: 0,
            recoveryBeds: 2
          },
          services: Array.isArray(location.services) ? [...location.services] : [],
          rooms: Array.isArray(location.rooms) ? [...location.rooms] : []
        });
      } else {
        const defaultOrgId = organizations[0]?.id || 'org-integramed-central';
        
        // Build initial capacity from current resource types
        const initialCapacity = {};
        freshResourceTypes.forEach(rt => {
          if (rt.id === 'consultingRooms') initialCapacity[rt.id] = 8;
          else if (rt.id === 'therapyBooths') initialCapacity[rt.id] = 3;
          else if (rt.id === 'operatingTheaters') initialCapacity[rt.id] = 1;
          else if (rt.id === 'recoveryBeds') initialCapacity[rt.id] = 4;
          else initialCapacity[rt.id] = 0;
        });

        setFormData({
          id: `loc-${Date.now()}`,
          organizationId: defaultOrgId,
          code: `PLANTEL-${Math.floor(Math.random() * 89 + 10)}`,
          name: '',
          description: '',
          type: 'clinic',
          typeName: 'Clínica Ambulatoria y Consultorios',
          status: 'active',
          phone: '+52 55 5234 8100',
          email: 'contacto@integramed.com',
          operatingHours: 'Lunes a Viernes: 08:00 - 20:00 | Sábado: 08:00 - 15:00',
          address: {
            line: 'Av. Insurgentes Sur 1602, Piso 3',
            district: 'Crédito Constructor / Del Valle',
            city: 'Ciudad de México',
            state: 'CDMX',
            postalCode: '03940',
            country: 'México'
          },
          capacity: initialCapacity,
          services: [
            'Consulta de Especialidades',
            'Laboratorio Clínico FHIR R4',
            'Farmacia Intrahospitalaria',
            'Acceso 100% Accesible (Rampas/Elevador)'
          ],
          rooms: [
            { id: `r-${Date.now()}-1`, name: 'Consultorio 101', specialty: 'Medicina General' },
            { id: `r-${Date.now()}-2`, name: 'Consultorio 102', specialty: 'Fisioterapia' }
          ]
        });
      }
    }
  }, [isOpen, location, organizations]);

  if (!isOpen) return null;

  const handleToggleService = (service) => {
    setFormData(prev => {
      const exists = prev.services.includes(service);
      return {
        ...prev,
        services: exists ? prev.services.filter(s => s !== service) : [...prev.services, service]
      };
    });
  };

  const handleAddCustomService = () => {
    if (!newService.trim()) return;
    const clean = newService.trim();
    if (!formData.services.includes(clean)) {
      setFormData(prev => ({
        ...prev,
        services: [...prev.services, clean]
      }));
    }
    // Also add to global catalog
    const updatedCatalog = saveFacilityServiceCatalogItem(clean);
    setServicesCatalog(updatedCatalog);
    setNewService('');
  };

  const handleAddRoom = () => {
    if (!newRoomName.trim()) return;
    const room = {
      id: `r-${Date.now()}`,
      name: newRoomName.trim(),
      specialty: newRoomSpecialty.trim() || 'Consulta General'
    };
    setFormData(prev => ({
      ...prev,
      rooms: [...prev.rooms, room]
    }));
    setNewRoomName('');
    setNewRoomSpecialty('');
  };

  const handleRemoveRoom = (roomId) => {
    setFormData(prev => ({
      ...prev,
      rooms: prev.rooms.filter(r => r.id !== roomId)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError(language === 'en' ? 'Facility name is required' : 'El nombre del plantel o sede es requerido');
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
          maxWidth: '820px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MapPin size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {location
                  ? `${language === 'en' ? 'Edit Facility (FHIR Location):' : 'Editar Plantel / Sede (FHIR Location):'} ${formData.name}`
                  : (language === 'en' ? 'New Healthcare Facility / Location' : 'Nuevo Plantel / Sede Clínica')}
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                {language === 'en' ? 'Configure physical location, consulting capacity, operating hours, and medical units' : 'Configura ubicación física, consultorios, áreas de atención y servicios clínicos'}
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
              borderRadius: '0.375rem',
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body Scrollable */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {error && (
              <div
                style={{
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
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* General Data & Organization Parent */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Facility / Plantel Name *' : 'Nombre del Plantel / Sede *'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Plantel Santa Fe — Sede Médica Principal"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Plantel Code' : 'Código de Sede'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="PLANTEL-SF-01"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Parent Organization' : 'Organización Matriz'}
                </label>
                <select
                  className="form-input"
                  value={formData.organizationId}
                  onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                >
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Facility Type' : 'Tipo de Establecimiento'}
                </label>
                <select
                  className="form-input"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="hospital">{language === 'en' ? 'Hospital / Ambulatory Center' : 'Hospital Ambulatorio'}</option>
                  <option value="clinic">{language === 'en' ? 'Medical Specialty Clinic' : 'Clínica de Especialidades'}</option>
                  <option value="rehab_center">{language === 'en' ? 'Rehabilitation Center' : 'Centro de Fisioterapia'}</option>
                  <option value="lab_center">{language === 'en' ? 'Laboratory & Diagnostics Center' : 'Centro de Diagnóstico & Lab'}</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Operational Status' : 'Estado Operativo'}
                </label>
                <select
                  className="form-input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">{language === 'en' ? 'Active / Open' : 'Activo / Operando'}</option>
                  <option value="suspended">{language === 'en' ? 'Suspended' : 'Suspendido'}</option>
                  <option value="maintenance">{language === 'en' ? 'In Maintenance' : 'En Mantenimiento'}</option>
                </select>
              </div>
            </div>

            {/* Address */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={16} color="#059669" />
                <span>{language === 'en' ? 'Physical Address & Location' : 'Dirección Física y Ubicación'}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    {language === 'en' ? 'Street, Number, Building & Floor' : 'Calle, Número, Edificio y Piso'}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.address?.line || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, line: e.target.value }
                    })}
                    placeholder="Av. Vasco de Quiroga 3800, Torre B, Piso 4"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      {language === 'en' ? 'Colonia / District' : 'Colonia / Delegación'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.address?.district || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, district: e.target.value }
                      })}
                      placeholder="Santa Fe / Zedec"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      {language === 'en' ? 'City' : 'Ciudad'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.address?.city || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value }
                      })}
                      placeholder="Ciudad de México"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      {language === 'en' ? 'State' : 'Estado'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.address?.state || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value }
                      })}
                      placeholder="CDMX"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      {language === 'en' ? 'Postal Code' : 'Código Postal'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.address?.postalCode || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, postalCode: e.target.value }
                      })}
                      placeholder="05348"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Operating Hours and Contact */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Operating Schedule' : 'Horarios de Operación'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Clock size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2.2rem' }}
                    value={formData.operatingHours}
                    onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                    placeholder="Lun a Sáb: 07:00 - 21:00"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Direct Plantel Phone' : 'Teléfono Directo'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="tel"
                    className="form-input"
                    style={{ paddingLeft: '2.2rem' }}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+52 55 5234 8101"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Plantel Email' : 'Correo de Atención'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '2.2rem' }}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="santafe@integramed.com"
                  />
                </div>
              </div>
            </div>

            {/* Capacity Numbers (Dynamic Resource Types: Consultorios, Cabinas, Quirófanos, Camas, etc.) */}
            <div style={{ backgroundColor: '#f0fdf4', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Building size={16} />
                  <span>{language === 'en' ? 'Clinical Capacity & Infrastructure Units' : 'Capacidad Instalada y Unidades de Atención'}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>
                  {resourceTypes.length} {language === 'en' ? 'resource types' : 'tipos de recursos'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {resourceTypes.map(rt => {
                  const IconComp = getResourceIconComponent(rt.icon);
                  const currentCount = formData.capacity?.[rt.id] !== undefined ? formData.capacity[rt.id] : 0;

                  return (
                    <div
                      key={rt.id}
                      style={{
                        backgroundColor: '#ffffff',
                        padding: '0.75rem 0.875rem',
                        borderRadius: '0.5rem',
                        border: `1px solid ${rt.borderColor || '#cbd5e1'}`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            backgroundColor: rt.bgColor || '#f0fdf4',
                            color: rt.color || '#15803d',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <IconComp size={14} />
                        </div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rt.nameEs}>
                          {language === 'en' ? rt.nameEn || rt.nameEs : rt.nameEs}
                        </label>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <input
                          type="number"
                          min="0"
                          className="form-input"
                          style={{ fontSize: '0.875rem', fontWeight: 700, height: '34px', color: rt.color || '#15803d' }}
                          value={currentCount}
                          onChange={(e) => setFormData({
                            ...formData,
                            capacity: {
                              ...formData.capacity,
                              [rt.id]: parseInt(e.target.value, 10) || 0
                            }
                          })}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                          {rt.defaultUnit || 'unid.'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Medical Services Available (Dynamic Services Catalog) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={15} color="#0f766e" />
                  <span>{language === 'en' ? 'Clinical & Diagnostic Services Available' : 'Servicios Clínicos y Diagnósticos Disponibles'}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#0f766e', fontWeight: 700 }}>
                  {formData.services?.length || 0} {language === 'en' ? 'active in this facility' : 'activos en este plantel'}
                </span>
              </div>

              {/* Quick Add Custom Service input */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.8125rem' }}
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomService(); } }}
                  placeholder={language === 'en' ? 'Add new service to this plantel and catalog...' : 'Escribir nuevo servicio para agregar al plantel y al catálogo...'}
                />
                <button
                  type="button"
                  onClick={handleAddCustomService}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0, gap: '0.35rem', color: '#0f766e' }}
                >
                  <Plus size={14} />
                  <span>{language === 'en' ? 'Add Service' : 'Agregar Servicio'}</span>
                </button>
              </div>

              {/* Services Checkbox Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                {servicesCatalog.map(service => {
                  const isChecked = formData.services.includes(service);
                  return (
                    <div
                      key={service}
                      onClick={() => handleToggleService(service)}
                      style={{
                        padding: '0.45rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: isChecked ? '1.5px solid #059669' : '1px solid #e2e8f0',
                        backgroundColor: isChecked ? '#ecfdf5' : '#ffffff',
                        color: isChecked ? '#065f46' : '#475569',
                        fontSize: '0.75rem',
                        fontWeight: isChecked ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={service}>
                        {service}
                      </span>
                      {isChecked ? <CheckCircle2 size={14} color="#059669" flexShrink={0} /> : <span style={{ width: '14px', height: '14px', borderRadius: '4px', border: '1px solid #cbd5e1', display: 'inline-block', flexShrink: 0 }} />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rooms Management */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
                  {language === 'en' ? 'Assigned Rooms & Cubicles' : 'Consultorios y Cubículos Registrados'} ({formData.rooms?.length || 0})
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  className="form-input"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Ej. Consultorio 105"
                  style={{ flex: 1 }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={newRoomSpecialty}
                  onChange={(e) => setNewRoomSpecialty(e.target.value)}
                  placeholder="Ej. Cardiología / Traumatología"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddRoom}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0, gap: '0.35rem' }}
                >
                  <Plus size={14} />
                  <span>{language === 'en' ? 'Add Room' : 'Agregar'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {formData.rooms?.map(room => (
                  <div
                    key={room.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.35rem 0.65rem',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{room.name}</span>
                    <span style={{ color: '#64748b' }}>({room.specialty})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRoom(room.id)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
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
            >
              {language === 'en' ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ backgroundColor: '#0f766e' }}
            >
              <Check size={16} />
              <span>{language === 'en' ? 'Save Facility / Location' : 'Guardar Plantel / Sede'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
