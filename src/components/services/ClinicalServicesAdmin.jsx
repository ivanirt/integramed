import React, { useState, useMemo } from 'react';
import {
  Stethoscope,
  Radio,
  FlaskConical,
  Activity,
  Sparkles,
  AlertCircle,
  Clock,
  Plus,
  Search,
  Filter,
  Check,
  Edit3,
  Trash2,
  RotateCcw,
  Building2,
  DollarSign,
  FileText,
  Layers,
  CheckCircle2,
  XCircle,
  Wrench,
  ChevronRight
} from 'lucide-react';
import {
  SERVICE_CATEGORIES,
  getClinicalServices,
  saveClinicalService,
  deleteClinicalService,
  toggleClinicalServiceStatus,
  resetClinicalServicesToDefault
} from '../../utils/clinicalServicesStorage';
import { getLocations } from '../../utils/facilityStorage';
import ClinicalServiceModal from './ClinicalServiceModal';
import DeleteConfirmModal from '../DeleteConfirmModal';
import { useLanguage } from '../../i18n/LanguageContext';

export default function ClinicalServicesAdmin({ addToast }) {
  const { language, t } = useLanguage();

  const [services, setServices] = useState(() => getClinicalServices());
  const [locations] = useState(() => getLocations());

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  // Modal
  const [modalState, setModalState] = useState({ isOpen: false, service: null });

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter(serv => {
      if (selectedCategory !== 'all' && serv.category !== selectedCategory) {
        return false;
      }
      if (statusFilter !== 'all' && serv.status !== statusFilter) {
        return false;
      }
      if (locationFilter !== 'all' && !serv.availableLocations?.includes(locationFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameEs = (serv.nameEs || '').toLowerCase();
        const nameEn = (serv.nameEn || '').toLowerCase();
        const code = (serv.code || '').toLowerCase();
        const dept = (serv.department || '').toLowerCase();
        const prep = (serv.preparationInstructionsEs || '').toLowerCase();
        return nameEs.includes(q) || nameEn.includes(q) || code.includes(q) || dept.includes(q) || prep.includes(q);
      }
      return true;
    });
  }, [services, selectedCategory, statusFilter, locationFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = services.length;
    const available = services.filter(s => s.status === 'available').length;
    const consults = services.filter(s => s.category === 'consulta_especialidad').length;
    const diagnostics = services.filter(s => s.category === 'laboratorio_clinico' || s.category === 'imagenologia_diagnostico').length;
    const therapies = services.filter(s => s.category === 'terapia_rehabilitacion' || s.category === 'procedimientos_menores').length;

    return { total, available, consults, diagnostics, therapies };
  }, [services]);

  // Actions
  const handleSaveService = (serviceData) => {
    const updated = saveClinicalService(serviceData);
    setServices(updated);
    if (addToast) {
      const name = language === 'en' ? serviceData.nameEn : serviceData.nameEs;
      addToast(
        'success',
        language === 'en' ? `Service "${name}" saved` : `Servicio "${name}" guardado exitosamente`,
        language === 'en' ? 'Service Saved' : 'Servicio Guardado'
      );
    }
  };

  const handleToggleStatus = (serv) => {
    const updated = toggleClinicalServiceStatus(serv.id);
    setServices(updated);
    const newStatus = serv.status === 'available' ? 'no disponible' : 'disponible';
    if (addToast) {
      addToast(
        'info',
        language === 'en' ? `Service status updated to ${serv.status === 'available' ? 'unavailable' : 'available'}` : `Estado de ${serv.nameEs} cambiado a ${newStatus}`,
        language === 'en' ? 'Status Updated' : 'Disponibilidad Actualizada'
      );
    }
  };

  // Universal Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    warningText: '',
    confirmText: '',
    variant: 'danger',
    icon: 'trash',
    onConfirm: null
  });

  const handleDeleteService = (serv) => {
    const name = language === 'en' ? serv.nameEn : serv.nameEs;
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Delete Clinical Service' : 'Eliminar Servicio Clínico',
      message: language === 'en'
        ? `Are you sure you want to delete "${name}" from available services catalog?`
        : `¿Estás seguro de que deseas eliminar "${name}" del catálogo de servicios clínicos?`,
      warningText: language === 'en'
        ? 'This service will no longer be available for appointment scheduling or diagnostic orders.'
        : 'Este servicio ya no podrá ser agendado ni solicitado en órdenes de laboratorio/imagen.',
      confirmText: language === 'en' ? 'Delete Service' : 'Eliminar Servicio',
      variant: 'danger',
      icon: 'trash',
      onConfirm: () => {
        const updated = deleteClinicalService(serv.id);
        setServices(updated);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast(
            'info',
            language === 'en' ? `Service "${name}" removed` : `Servicio "${name}" eliminado del catálogo`,
            language === 'en' ? 'Service Removed' : 'Servicio Eliminado'
          );
        }
      }
    });
  };

  const handleResetCatalog = () => {
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Reset Clinical Services Catalog' : 'Restablecer Catálogo de Servicios',
      message: language === 'en'
        ? 'Restore all default clinical, diagnostic, laboratory, and therapy services?'
        : '¿Restablecer el catálogo completo de consultas, imagenología, laboratorios y terapias a los valores predeterminados?',
      warningText: language === 'en'
        ? 'Any newly registered services and custom fees will be reset to default demo catalog.'
        : 'Se restaurarán todas las tarifas personalizadas y servicios nuevos creados recientemente.',
      confirmText: language === 'en' ? 'Reset Catalog' : 'Restablecer Catálogo',
      variant: 'warning',
      icon: 'reset',
      onConfirm: () => {
        const resetList = resetClinicalServicesToDefault();
        setServices(resetList);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast(
            'success',
            language === 'en' ? 'Default services catalog restored' : 'Catálogo de servicios restablecido exitosamente',
            language === 'en' ? 'Catalog Reset' : 'Catálogo Restablecido'
          );
        }
      }
    });
  };

  const renderCategoryIcon = (catId, size = 18) => {
    switch (catId) {
      case 'consulta_especialidad':
        return <Stethoscope size={size} />;
      case 'imagenologia_diagnostico':
        return <Radio size={size} />;
      case 'laboratorio_clinico':
        return <FlaskConical size={size} />;
      case 'terapia_rehabilitacion':
        return <Activity size={size} />;
      case 'procedimientos_menores':
        return <Sparkles size={size} />;
      case 'urgencias_triage':
        return <AlertCircle size={size} />;
      default:
        return <Stethoscope size={size} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header with Title and Global Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669'
              }}
            >
              <Stethoscope size={22} strokeWidth={2.5} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              {language === 'en' ? 'Clinical & Diagnostic Services Catalog' : 'Administración de Servicios Clínicos y Diagnósticos Disponibles'}
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
            {language === 'en'
              ? 'Manage clinical consultations, diagnostic imaging, lab tests, physiotherapy procedures, pricing, preparation notes, and campus availability'
              : 'Gestión integral de consultas especializadas, estudios de imagenología, laboratorio clínico, terapia física, preparación, tarifas y sedes habilitadas'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleResetCatalog}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.8125rem', gap: '0.35rem' }}
          >
            <RotateCcw size={14} />
            <span>{language === 'en' ? 'Reset Demo Catalog' : 'Restablecer Demo'}</span>
          </button>

          <button
            type="button"
            onClick={() => setModalState({ isOpen: true, service: null })}
            className="btn btn-primary"
            style={{ backgroundColor: '#0f766e', boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)', gap: '0.4rem' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{language === 'en' ? 'New Clinical Service' : 'Nuevo Servicio Clínico'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {language === 'en' ? 'Total Services' : 'Catálogo Total'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.total}{' '}
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669' }}>
                ({stats.available} {language === 'en' ? 'active' : 'disponibles'})
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#e0f2fe',
              border: '1px solid #bae6fd',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Stethoscope size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {language === 'en' ? 'Consultations' : 'Consultas Especializadas'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.consults}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#ede9fe',
              border: '1px solid #ddd6fe',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FlaskConical size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {language === 'en' ? 'Diagnostics & Labs' : 'Diagnóstico & Laboratorio'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.diagnostics}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {language === 'en' ? 'Therapies & Rehab' : 'Terapias & Procedimientos'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.therapies}
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.85rem',
            borderRadius: '9999px',
            fontSize: '0.8125rem',
            fontWeight: selectedCategory === 'all' ? 700 : 500,
            border: selectedCategory === 'all' ? '1px solid #0f766e' : '1px solid #e2e8f0',
            backgroundColor: selectedCategory === 'all' ? '#0f766e' : '#ffffff',
            color: selectedCategory === 'all' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <span>{language === 'en' ? 'All Services' : 'Todos los Servicios'}</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              backgroundColor: selectedCategory === 'all' ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
              color: selectedCategory === 'all' ? '#ffffff' : '#64748b'
            }}
          >
            {services.length}
          </span>
        </button>

        {Object.values(SERVICE_CATEGORIES).map(cat => {
          const isSelected = selectedCategory === cat.id;
          const count = services.filter(s => s.category === cat.id).length;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.8125rem',
                fontWeight: isSelected ? 700 : 500,
                border: isSelected ? `1px solid ${cat.color}` : '1px solid #e2e8f0',
                backgroundColor: isSelected ? cat.color : '#ffffff',
                color: isSelected ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {renderCategoryIcon(cat.id, 14)}
              <span>{language === 'en' ? cat.labelEn : cat.labelEs}</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#64748b'
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Secondary Filters Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          padding: '0.875rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}
      >
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.3rem', fontSize: '0.8125rem', height: '38px', borderRadius: '0.5rem' }}
            placeholder={language === 'en' ? 'Search by service name, CPT code, dept...' : 'Buscar por nombre, código CPT/LOINC, depto...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
              {language === 'en' ? 'Status:' : 'Estado:'}
            </span>
            <select
              className="form-input"
              style={{ fontSize: '0.8125rem', height: '38px', padding: '0 0.5rem', minWidth: '130px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{language === 'en' ? 'All Status' : 'Todos los Estados'}</option>
              <option value="available">{language === 'en' ? 'Available Only' : 'Solo Disponibles'}</option>
              <option value="temporarily_unavailable">{language === 'en' ? 'Unavailable' : 'No Disponibles'}</option>
              <option value="maintenance">{language === 'en' ? 'In Maintenance' : 'En Mantenimiento'}</option>
            </select>
          </div>

          {/* Location Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
              {language === 'en' ? 'Plantel:' : 'Plantel:'}
            </span>
            <select
              className="form-input"
              style={{ fontSize: '0.8125rem', height: '38px', padding: '0 0.5rem', minWidth: '160px' }}
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="all">{language === 'en' ? 'All Planteles' : 'Todas las Sedes'}</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Services Table / Cards List */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
        {filteredServices.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
            <Stethoscope size={38} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', margin: 0 }}>
              {language === 'en' ? 'No clinical services found' : 'No se encontraron servicios clínicos con los filtros aplicados'}
            </h4>
            <p style={{ fontSize: '0.8125rem', margin: '0.35rem 0 0' }}>
              {language === 'en' ? 'Try adjusting your search criteria or register a new service.' : 'Intenta ajustar los filtros de búsqueda o registra un nuevo servicio clínico.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569' }}>
                    {language === 'en' ? 'Service / Study & Code' : 'Servicio / Estudio & Código'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569' }}>
                    {language === 'en' ? 'Category & Dept' : 'Categoría & Depto'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569' }}>
                    {language === 'en' ? 'Duration & Price' : 'Duración & Precio'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569' }}>
                    {language === 'en' ? 'Patient Preparation & Delivery' : 'Preparación & Entrega'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569' }}>
                    {language === 'en' ? 'Available Planteles' : 'Sedes Habilitadas'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569', textAlign: 'center' }}>
                    {language === 'en' ? 'Status' : 'Disponibilidad'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>
                    {language === 'en' ? 'Actions' : 'Acciones'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map(serv => {
                  const cat = SERVICE_CATEGORIES[serv.category] || SERVICE_CATEGORIES.consulta_especialidad;
                  const isAvailable = serv.status === 'available';

                  return (
                    <tr
                      key={serv.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.12s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Service Name & Code */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              backgroundColor: cat.bgColor,
                              color: cat.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px'
                            }}
                          >
                            {renderCategoryIcon(serv.category, 16)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.875rem' }}>
                              {language === 'en' ? serv.nameEn || serv.nameEs : serv.nameEs}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                              <span
                                style={{
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.6875rem',
                                  fontWeight: 700,
                                  backgroundColor: '#f1f5f9',
                                  color: '#0f766e',
                                  border: '1px solid #e2e8f0',
                                  fontFamily: 'monospace'
                                }}
                              >
                                {serv.code}
                              </span>
                              {serv.requiresAppointment ? (
                                <span style={{ fontSize: '0.6875rem', color: '#0369a1', fontWeight: 600 }}>
                                  • {language === 'en' ? 'By appointment' : 'Cita previa'}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.6875rem', color: '#059669', fontWeight: 600 }}>
                                  • {language === 'en' ? 'Walk-in' : 'Atención directa'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Department */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            backgroundColor: cat.bgColor,
                            color: cat.color
                          }}
                        >
                          {language === 'en' ? cat.labelEn : cat.labelEs}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 500 }}>
                          {serv.department}
                        </div>
                      </td>

                      {/* Duration & Price */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0f172a', fontWeight: 700 }}>
                          <Clock size={13} color="#0f766e" />
                          <span>{serv.durationMinutes} min</span>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#059669', fontWeight: 800, marginTop: '0.2rem' }}>
                          ${serv.price?.toLocaleString()} MXN
                        </div>
                      </td>

                      {/* Preparation & Turnaround Time */}
                      <td style={{ padding: '0.85rem 1rem', maxWidth: '240px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#334155', fontWeight: 600 }}>
                          {language === 'en'
                            ? serv.preparationInstructionsEn || serv.preparationInstructionsEs || 'No special preparation'
                            : serv.preparationInstructionsEs || 'Sin preparación previa'}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.2rem' }}>
                          ⏱️ {language === 'en' ? serv.turnaroundTimeEn || serv.turnaroundTimeEs : serv.turnaroundTimeEs}
                        </div>
                      </td>

                      {/* Available Locations */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {serv.availableLocations?.map(locId => {
                            const loc = locations.find(l => l.id === locId);
                            return (
                              <span
                                key={locId}
                                style={{
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.6875rem',
                                  backgroundColor: '#f8fafc',
                                  color: '#334155',
                                  border: '1px solid #e2e8f0',
                                  fontWeight: 500
                                }}
                              >
                                {loc?.name?.replace('Plantel ', '').replace('Hospital ', '').replace('Centro ', '') || locId}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(serv)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: isAvailable ? '#ecfdf5' : '#fff1f2',
                            color: isAvailable ? '#047857' : '#be123c',
                            transition: 'all 0.15s ease'
                          }}
                          title={language === 'en' ? 'Click to toggle availability' : 'Clic para alternar disponibilidad'}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isAvailable ? '#10b981' : '#ef4444' }} />
                          <span>{isAvailable ? (language === 'en' ? 'Available' : 'Disponible') : (language === 'en' ? 'Unavailable' : 'No Disponible')}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => setModalState({ isOpen: true, service: serv })}
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              backgroundColor: '#ffffff',
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.12s ease'
                            }}
                            title={language === 'en' ? 'Edit service' : 'Editar servicio'}
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteService(serv)}
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '6px',
                              border: '1px solid #fee2e2',
                              backgroundColor: '#fff1f2',
                              color: '#e11d48',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.12s ease'
                            }}
                            title={language === 'en' ? 'Delete service' : 'Eliminar servicio'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Create / Edit Service */}
      <ClinicalServiceModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, service: null })}
        service={modalState.service}
        onSave={handleSaveService}
      />

      {/* Universal Confirm Modal for Delete and Reset Actions */}
      <DeleteConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        warningText={confirmModal.warningText}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        icon={confirmModal.icon}
      />
    </div>
  );
}
