import React, { useState } from 'react';
import {
  X,
  Layers,
  Plus,
  Edit3,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  Stethoscope,
  Activity,
  Building,
  Bed,
  HeartPulse,
  FlaskConical,
  Pill,
  ShieldCheck,
  Thermometer,
  Wrench,
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  getFacilityResourceTypes,
  saveFacilityResourceType,
  deleteFacilityResourceType,
  resetFacilityResourceTypes,
  getFacilityServicesCatalog,
  saveFacilityServiceCatalogItem,
  updateFacilityServiceCatalogItem,
  deleteFacilityServiceCatalogItem,
  resetFacilityServicesCatalog
} from '../../utils/facilityStorage';
import DeleteConfirmModal from '../DeleteConfirmModal';

const AVAILABLE_ICONS = [
  { id: 'Stethoscope', label: 'Estetoscopio (Consultorios)', component: Stethoscope },
  { id: 'Activity', label: 'Actividad (Cabinas / Terapia)', component: Activity },
  { id: 'Building', label: 'Edificio (Quirófanos / Salas)', component: Building },
  { id: 'Bed', label: 'Cama (Observación / Hospital)', component: Bed },
  { id: 'HeartPulse', label: 'Pulso (Urgencias / Triage)', component: HeartPulse },
  { id: 'FlaskConical', label: 'Matraz (Laboratorio)', component: FlaskConical },
  { id: 'Pill', label: 'Píldora (Farmacia)', component: Pill },
  { id: 'ShieldCheck', label: 'Escudo (Seguridad / Esterilización)', component: ShieldCheck },
  { id: 'Thermometer', label: 'Termómetro (Signos Vitales)', component: Thermometer },
  { id: 'Wrench', label: 'Herramienta (Mantenimiento)', component: Wrench }
];

const PRESET_COLORS = [
  { id: 'green', color: '#15803d', bgColor: '#f0fdf4', borderColor: '#bbf7d0', label: 'Verde Médico' },
  { id: 'teal', color: '#0f766e', bgColor: '#f0fdfa', borderColor: '#99f6e4', label: 'Teal Integra' },
  { id: 'sky', color: '#0284c7', bgColor: '#e0f2fe', borderColor: '#bae6fd', label: 'Azul Clínico' },
  { id: 'purple', color: '#7c3aed', bgColor: '#ede9fe', borderColor: '#ddd6fe', label: 'Púrpura Quirúrgico' },
  { id: 'amber', color: '#d97706', bgColor: '#fef3c7', borderColor: '#fde68a', label: 'Ámbar Observación' },
  { id: 'rose', color: '#e11d48', bgColor: '#ffe4e6', borderColor: '#fecdd3', label: 'Rosa Urgencias' },
  { id: 'indigo', color: '#4f46e5', bgColor: '#e0e7ff', borderColor: '#c7d2fe', label: 'Índigo Diagnóstico' }
];

export function getResourceIconComponent(iconName) {
  switch (iconName) {
    case 'Stethoscope': return Stethoscope;
    case 'Activity': return Activity;
    case 'Building': return Building;
    case 'Bed': return Bed;
    case 'HeartPulse': return HeartPulse;
    case 'FlaskConical': return FlaskConical;
    case 'Pill': return Pill;
    case 'ShieldCheck': return ShieldCheck;
    case 'Thermometer': return Thermometer;
    case 'Wrench': return Wrench;
    default: return Building;
  }
}

export default function FacilityCatalogManagerModal({
  isOpen,
  onClose,
  onCatalogChanged,
  addToast
}) {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('resources'); // 'resources' | 'services'

  // Resource Types State
  const [resourceTypes, setResourceTypes] = useState(() => getFacilityResourceTypes());
  const [editingResource, setEditingResource] = useState(null);
  const [resourceForm, setResourceForm] = useState({
    id: '',
    nameEs: '',
    nameEn: '',
    defaultUnit: 'unidades',
    icon: 'Stethoscope',
    colorPreset: 'green',
    color: '#15803d',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    descriptionEs: '',
    descriptionEn: ''
  });
  const [isAddingResource, setIsAddingResource] = useState(false);

  // Services Catalog State
  const [servicesCatalog, setServicesCatalog] = useState(() => getFacilityServicesCatalog());
  const [newServiceName, setNewServiceName] = useState('');
  const [editingServiceName, setEditingServiceName] = useState(null);
  const [editedServiceValue, setEditedServiceValue] = useState('');

  // Delete Confirm Modal State
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    warningText: '',
    onConfirm: null
  });

  if (!isOpen) return null;

  // Handler for Color Preset Change
  const handleColorPresetChange = (presetId) => {
    const preset = PRESET_COLORS.find(p => p.id === presetId) || PRESET_COLORS[0];
    setResourceForm(prev => ({
      ...prev,
      colorPreset: presetId,
      color: preset.color,
      bgColor: preset.bgColor,
      borderColor: preset.borderColor
    }));
  };

  // Open Create Resource Form
  const handleOpenCreateResource = () => {
    setEditingResource(null);
    setResourceForm({
      id: `resource_${Date.now()}`,
      nameEs: '',
      nameEn: '',
      defaultUnit: 'salas',
      icon: 'Building',
      colorPreset: 'teal',
      color: '#0f766e',
      bgColor: '#f0fdfa',
      borderColor: '#99f6e4',
      descriptionEs: '',
      descriptionEn: ''
    });
    setIsAddingResource(true);
  };

  // Open Edit Resource Form
  const handleOpenEditResource = (item) => {
    setEditingResource(item);
    const matchedPreset = PRESET_COLORS.find(p => p.color === item.color) || PRESET_COLORS[0];
    setResourceForm({
      id: item.id,
      nameEs: item.nameEs || '',
      nameEn: item.nameEn || item.nameEs || '',
      defaultUnit: item.defaultUnit || 'unidades',
      icon: item.icon || 'Building',
      colorPreset: matchedPreset.id,
      color: item.color || matchedPreset.color,
      bgColor: item.bgColor || matchedPreset.bgColor,
      borderColor: item.borderColor || matchedPreset.borderColor,
      descriptionEs: item.descriptionEs || '',
      descriptionEn: item.descriptionEn || ''
    });
    setIsAddingResource(true);
  };

  // Save Resource Type
  const handleSaveResourceForm = (e) => {
    e.preventDefault();
    if (!resourceForm.nameEs.trim()) {
      if (addToast) addToast('error', 'El nombre en español es requerido', 'Error de Validación');
      return;
    }

    const payload = {
      id: resourceForm.id || `res_${Date.now()}`,
      nameEs: resourceForm.nameEs.trim(),
      nameEn: resourceForm.nameEn?.trim() || resourceForm.nameEs.trim(),
      defaultUnit: resourceForm.defaultUnit?.trim() || 'unidades',
      icon: resourceForm.icon || 'Building',
      color: resourceForm.color || '#0f766e',
      bgColor: resourceForm.bgColor || '#f0fdfa',
      borderColor: resourceForm.borderColor || '#99f6e4',
      descriptionEs: resourceForm.descriptionEs?.trim() || '',
      descriptionEn: resourceForm.descriptionEn?.trim() || ''
    };

    const updated = saveFacilityResourceType(payload);
    setResourceTypes(updated);
    setIsAddingResource(false);
    setEditingResource(null);
    if (onCatalogChanged) onCatalogChanged();
    if (addToast) {
      addToast(
        'success',
        language === 'en'
          ? `Resource type "${payload.nameEn}" saved`
          : `Tipo de recurso "${payload.nameEs}" guardado correctamente`,
        language === 'en' ? 'Catalog Updated' : 'Catálogo Actualizado'
      );
    }
  };

  // Delete Resource Type
  const handleDeleteResource = (item) => {
    setDeleteConfirm({
      isOpen: true,
      title: language === 'en' ? 'Delete Resource Type' : 'Eliminar Tipo de Recurso',
      message: language === 'en'
        ? `Are you sure you want to remove "${item.nameEn || item.nameEs}" from the global physical resources catalog?`
        : `¿Estás seguro de que deseas eliminar "${item.nameEs}" del catálogo global de recursos físicos?`,
      warningText: language === 'en'
        ? 'Locations using this resource will retain their historical numbers unless reconfigured.'
        : 'Los planteles mantendrán sus registros históricos pero este recurso ya no se listará como estándar.',
      onConfirm: () => {
        const updated = deleteFacilityResourceType(item.id);
        setResourceTypes(updated);
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        if (onCatalogChanged) onCatalogChanged();
        if (addToast) {
          addToast(
            'info',
            language === 'en' ? `Resource type removed` : `Tipo de recurso eliminado del catálogo`,
            language === 'en' ? 'Removed' : 'Eliminado'
          );
        }
      }
    });
  };

  // Reset Resource Types
  const handleResetResources = () => {
    setDeleteConfirm({
      isOpen: true,
      title: language === 'en' ? 'Reset Resources Catalog' : 'Restablecer Catálogo de Recursos',
      message: language === 'en'
        ? 'Do you want to reset physical resource types back to default (Consulting Rooms, Therapy Booths, Theaters, Recovery Beds)?'
        : '¿Deseas restablecer el catálogo de recursos físicos a los 4 tipos estándar (Consultorios, Cabinas, Quirófanos, Camas)?',
      warningText: language === 'en' ? 'Custom added resource types will be removed.' : 'Los recursos personalizados se descartarán.',
      onConfirm: () => {
        const updated = resetFacilityResourceTypes();
        setResourceTypes(updated);
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        if (onCatalogChanged) onCatalogChanged();
        if (addToast) addToast('info', 'Catálogo de recursos físicos restablecido', 'Restablecido');
      }
    });
  };

  // Add Service to Catalog
  const handleAddServiceToCatalog = (e) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    const updated = saveFacilityServiceCatalogItem(newServiceName.trim());
    setServicesCatalog(updated);
    setNewServiceName('');
    if (onCatalogChanged) onCatalogChanged();
    if (addToast) {
      addToast(
        'success',
        language === 'en' ? `Service added to catalog` : `Servicio agregado al catálogo de sedes`,
        language === 'en' ? 'Service Added' : 'Servicio Registrado'
      );
    }
  };

  // Save Edit Service
  const handleSaveEditService = (oldName) => {
    if (!editedServiceValue.trim() || editedServiceValue.trim() === oldName) {
      setEditingServiceName(null);
      return;
    }
    const updated = updateFacilityServiceCatalogItem(oldName, editedServiceValue.trim());
    setServicesCatalog(updated);
    setEditingServiceName(null);
    if (onCatalogChanged) onCatalogChanged();
    if (addToast) {
      addToast(
        'success',
        language === 'en' ? `Service updated` : `Servicio actualizado en catálogo y planteles`,
        language === 'en' ? 'Updated' : 'Actualizado'
      );
    }
  };

  // Delete Service from Catalog
  const handleDeleteService = (serviceName) => {
    setDeleteConfirm({
      isOpen: true,
      title: language === 'en' ? 'Delete Service' : 'Eliminar Servicio del Catálogo',
      message: language === 'en'
        ? `Are you sure you want to remove "${serviceName}" from available planteles services catalog?`
        : `¿Estás seguro de que deseas eliminar "${serviceName}" del catálogo de servicios de planteles?`,
      warningText: language === 'en' ? 'This service will no longer be offered as an option for facilities.' : 'Este servicio dejará de ofrecerse como opción estándar para las sedes.',
      onConfirm: () => {
        const updated = deleteFacilityServiceCatalogItem(serviceName);
        setServicesCatalog(updated);
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        if (onCatalogChanged) onCatalogChanged();
        if (addToast) {
          addToast(
            'info',
            language === 'en' ? `Service removed from catalog` : `Servicio eliminado del catálogo`,
            language === 'en' ? 'Removed' : 'Eliminado'
          );
        }
      }
    });
  };

  // Reset Services Catalog
  const handleResetServices = () => {
    setDeleteConfirm({
      isOpen: true,
      title: language === 'en' ? 'Reset Services Catalog' : 'Restablecer Catálogo de Servicios',
      message: language === 'en'
        ? 'Do you want to reset facility services catalog to standard preset?'
        : '¿Deseas restablecer el catálogo de servicios de planteles a los valores predeterminados?',
      warningText: language === 'en' ? 'Custom added services will be removed.' : 'Los servicios personalizados se descartarán.',
      onConfirm: () => {
        const updated = resetFacilityServicesCatalog();
        setServicesCatalog(updated);
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        if (onCatalogChanged) onCatalogChanged();
        if (addToast) addToast('info', 'Catálogo de servicios restablecido', 'Restablecido');
      }
    });
  };

  return (
    <>
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
          zIndex: 1060,
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
            maxWidth: '860px',
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
                <Layers size={22} strokeWidth={2.5} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {language === 'en' ? 'Manage Planteles Services & Resources Catalog' : 'Catálogo de Recursos Físicos y Servicios de Planteles'}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.2rem 0 0' }}>
                  {language === 'en'
                    ? 'Configure physical units (rooms, booths, theaters, beds) and available clinical services dynamically.'
                    : 'Personaliza y amplía los tipos de espacios (consultorios, cabinas, quirófanos, camas) y servicios clínicos de cada sede.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '0.35rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', padding: '0 1.75rem' }}>
            <button
              type="button"
              onClick={() => { setActiveTab('resources'); setIsAddingResource(false); }}
              style={{
                padding: '0.875rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'resources' ? '#0f766e' : '#64748b',
                borderBottom: activeTab === 'resources' ? '3px solid #0f766e' : '3px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Building size={16} />
              <span>{language === 'en' ? 'Physical Resource Types' : 'Recursos Físicos & Espacios'} ({resourceTypes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('services'); setEditingServiceName(null); }}
              style={{
                padding: '0.875rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'services' ? '#0f766e' : '#64748b',
                borderBottom: activeTab === 'services' ? '3px solid #0f766e' : '3px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Sparkles size={16} />
              <span>{language === 'en' ? 'Clinical & Facility Services' : 'Catálogo de Servicios de Sedes'} ({servicesCatalog.length})</span>
            </button>
          </div>

          {/* Modal Content */}
          <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* TAB 1: RECURSOS FÍSICOS & ESPACIOS (Consultorios, Cabinas, Quirófanos, Camas, etc.) */}
            {activeTab === 'resources' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                      {language === 'en' ? 'Registered Physical Resource Categories' : 'Tipos de Espacios y Unidades de Atención Registradas'}
                    </span>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0' }}>
                      {language === 'en'
                        ? 'These units can be tracked in each location with their specific counts (e.g. Consultorios, Cabinas, Quirófanos, Camas).'
                        : 'Permite configurar el inventario de consultorios, cabinas, quirófanos, camas o agregar nuevos tipos como salas de choque, sillones de quimio, etc.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleResetResources}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', gap: '0.35rem' }}
                      title="Restablecer a valores estándar"
                    >
                      <RotateCcw size={13} />
                      <span>{language === 'en' ? 'Reset' : 'Restablecer'}</span>
                    </button>

                    {!isAddingResource && (
                      <button
                        type="button"
                        onClick={handleOpenCreateResource}
                        className="btn btn-primary btn-sm"
                        style={{ backgroundColor: '#0f766e', fontSize: '0.75rem', gap: '0.35rem' }}
                      >
                        <Plus size={14} />
                        <span>{language === 'en' ? 'New Resource Type' : '+ Nuevo Tipo de Recurso'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Form to Add / Edit Resource Type */}
                {isAddingResource && (
                  <form
                    onSubmit={handleSaveResourceForm}
                    style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.75rem',
                      border: '1.5px solid #0f766e',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      animation: 'slideDown 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Building size={16} />
                        {editingResource
                          ? (language === 'en' ? 'Edit Resource Type' : 'Editar Tipo de Recurso')
                          : (language === 'en' ? 'Add New Physical Resource Type' : 'Registrar Nuevo Tipo de Recurso / Espacio')}
                      </span>

                      <button
                        type="button"
                        onClick={() => { setIsAddingResource(false); setEditingResource(null); }}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label className="form-label">{language === 'en' ? 'Name in Spanish *' : 'Nombre en Español *'}</label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          value={resourceForm.nameEs}
                          onChange={(e) => setResourceForm({ ...resourceForm, nameEs: e.target.value })}
                          placeholder="Ej. Sillones de Quimioterapia / Infusión"
                        />
                      </div>

                      <div>
                        <label className="form-label">{language === 'en' ? 'Name in English' : 'Nombre en Inglés'}</label>
                        <input
                          type="text"
                          className="form-input"
                          value={resourceForm.nameEn}
                          onChange={(e) => setResourceForm({ ...resourceForm, nameEn: e.target.value })}
                          placeholder="Ej. Chemo / Infusion Chairs"
                        />
                      </div>

                      <div>
                        <label className="form-label">{language === 'en' ? 'Unit Label (plural)' : 'Unidad de Conteo (Plural)'}</label>
                        <input
                          type="text"
                          className="form-input"
                          value={resourceForm.defaultUnit}
                          onChange={(e) => setResourceForm({ ...resourceForm, defaultUnit: e.target.value })}
                          placeholder="Ej. sillones, salas, camas"
                        />
                      </div>

                      <div>
                        <label className="form-label">{language === 'en' ? 'Representative Icon' : 'Ícono Representativo'}</label>
                        <select
                          className="form-input"
                          value={resourceForm.icon}
                          onChange={(e) => setResourceForm({ ...resourceForm, icon: e.target.value })}
                        >
                          {AVAILABLE_ICONS.map(ic => (
                            <option key={ic.id} value={ic.id}>{ic.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Color Presets */}
                    <div>
                      <label className="form-label">{language === 'en' ? 'Badge Color Theme' : 'Color de Distintivo e Insignia'}</label>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {PRESET_COLORS.map(preset => {
                          const isSelected = resourceForm.colorPreset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleColorPresetChange(preset.id)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '0.5rem',
                                border: isSelected ? `2px solid ${preset.color}` : '1px solid #cbd5e1',
                                backgroundColor: preset.bgColor,
                                color: preset.color,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: preset.color }} />
                              <span>{preset.label}</span>
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => { setIsAddingResource(false); setEditingResource(null); }}
                        className="btn btn-secondary btn-sm"
                      >
                        {language === 'en' ? 'Cancel' : 'Cancelar'}
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        style={{ backgroundColor: '#0f766e', gap: '0.35rem' }}
                      >
                        <Check size={14} />
                        <span>{editingResource ? (language === 'en' ? 'Save Changes' : 'Guardar Cambios') : (language === 'en' ? 'Add Resource Type' : 'Registrar Tipo')}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Resource Types Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem' }}>
                  {resourceTypes.map(item => {
                    const IconComp = getResourceIconComponent(item.icon);
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: '1rem',
                          borderRadius: '0.75rem',
                          border: `1px solid ${item.borderColor || '#e2e8f0'}`,
                          backgroundColor: item.bgColor || '#f8fafc',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              backgroundColor: '#ffffff',
                              border: `1px solid ${item.borderColor || '#cbd5e1'}`,
                              color: item.color || '#0f766e',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <IconComp size={20} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                              {language === 'en' ? item.nameEn || item.nameEs : item.nameEs}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                              Unidad: <strong>{item.defaultUnit}</strong> • ID: <code>{item.id}</code>
                            </div>
                            {item.descriptionEs && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                                {language === 'en' ? item.descriptionEn || item.descriptionEs : item.descriptionEs}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', borderTop: `1px solid ${item.borderColor || '#e2e8f0'}`, paddingTop: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditResource(item)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0f766e',
                              cursor: 'pointer',
                              padding: '3px 6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              borderRadius: '4px'
                            }}
                          >
                            <Edit3 size={13} />
                            <span>{language === 'en' ? 'Edit' : 'Editar'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteResource(item)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '3px 6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              borderRadius: '4px'
                            }}
                          >
                            <Trash2 size={13} />
                            <span>{language === 'en' ? 'Delete' : 'Eliminar'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: CATÁLOGO DE SERVICIOS CLÍNICOS & DE INSTALACIONES */}
            {activeTab === 'services' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                      {language === 'en' ? 'General Services Catalog for Planteles' : 'Catálogo General de Servicios de Sedes y Hospitales'}
                    </span>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0' }}>
                      {language === 'en'
                        ? 'Services in this catalog can be enabled or disabled for each facility individually.'
                        : 'Los servicios de este catálogo pueden ser activados o desactivados en cada plantel según su oferta clínica.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetServices}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', gap: '0.35rem' }}
                    title="Restablecer servicios por defecto"
                  >
                    <RotateCcw size={13} />
                    <span>{language === 'en' ? 'Reset Catalog' : 'Restablecer Servicios'}</span>
                  </button>
                </div>

                {/* Form to Add New Service */}
                <form
                  onSubmit={handleAddServiceToCatalog}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    padding: '1rem',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Sparkles size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#0f766e' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2.2rem', fontSize: '0.8125rem' }}
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      placeholder={language === 'en' ? 'Add new service (e.g. Tomografía Axial Computarizada TAC, Fisioterapia Acuática)...' : 'Registrar nuevo servicio (ej. Tomografía Computarizada TAC, Fisioterapia Acuática, Curaciones Mayores)...'}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ backgroundColor: '#0f766e', fontSize: '0.8125rem', padding: '0.5rem 1rem', gap: '0.35rem', flexShrink: 0 }}
                  >
                    <Plus size={15} />
                    <span>{language === 'en' ? 'Add Service' : 'Agregar Servicio'}</span>
                  </button>
                </form>

                {/* Services Catalog List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '0.625rem' }}>
                  {servicesCatalog.map((serviceName, idx) => {
                    const isEditing = editingServiceName === serviceName;

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '0.625rem 0.875rem',
                          borderRadius: '0.5rem',
                          border: isEditing ? '1.5px solid #0f766e' : '1px solid #e2e8f0',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}
                      >
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%' }}>
                            <input
                              type="text"
                              className="form-input"
                              style={{ fontSize: '0.75rem', padding: '4px 8px', height: '30px' }}
                              value={editedServiceValue}
                              onChange={(e) => setEditedServiceValue(e.target.value)}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditService(serviceName)}
                              style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', padding: '4px' }}
                              title="Guardar"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingServiceName(null)}
                              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                              title="Cancelar"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                              <CheckCircle2 size={14} color="#0f766e" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={serviceName}>
                                {serviceName}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => { setEditingServiceName(serviceName); setEditedServiceValue(serviceName); }}
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '3px', borderRadius: '4px' }}
                                title="Editar nombre de servicio"
                              >
                                <Edit3 size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteService(serviceName)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '3px', borderRadius: '4px' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                                title="Eliminar servicio del catálogo"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div
            style={{
              padding: '1rem 1.75rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              backgroundColor: '#fafafa'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary"
              style={{ backgroundColor: '#0f766e', padding: '0.5rem 1.5rem' }}
            >
              <span>{language === 'en' ? 'Close & Apply' : 'Listo / Cerrar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <DeleteConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
          onConfirm={deleteConfirm.onConfirm}
          title={deleteConfirm.title}
          message={deleteConfirm.message}
          warningText={deleteConfirm.warningText}
          confirmText={language === 'en' ? 'Delete' : 'Eliminar'}
        />
      )}
    </>
  );
}
