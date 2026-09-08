import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  Search,
  Phone,
  Mail,
  Clock,
  Edit3,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Building,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  RotateCcw,
  Check,
  Bed,
  Stethoscope,
  Filter
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getOrganizations,
  saveOrganization,
  deleteOrganization,
  getLocations,
  saveLocation,
  deleteLocation,
  resetFacilitiesData,
  getFacilityResourceTypes,
  getFacilityServicesCatalog,
  loadFacilitiesFromFhir
} from '../utils/facilityStorage';
import OrganizationModal from '../components/facilities/OrganizationModal';
import LocationModal from '../components/facilities/LocationModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import FacilityCatalogManagerModal, { getResourceIconComponent } from '../components/facilities/FacilityCatalogManagerModal';

export default function FacilitiesPage({ addToast, embedded = false }) {
  const { language, t } = useLanguage();

  const [organizations, setOrganizations] = useState(() => getOrganizations());
  const [locations, setLocations] = useState(() => getLocations());
  const [resourceTypes, setResourceTypes] = useState(() => getFacilityResourceTypes());

  const [activeTab, setActiveTab] = useState('locations'); // 'locations' | 'organizations'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');

  // Modals state
  const [orgModal, setOrgModal] = useState({ isOpen: false, organization: null });
  const [locModal, setLocModal] = useState({ isOpen: false, location: null });
  const [catalogModal, setCatalogModal] = useState({ isOpen: false });

  useEffect(() => {
    loadFacilitiesFromFhir()
      .then((data) => {
        setOrganizations(data.organizations);
        setLocations(data.locations);
        setResourceTypes(data.resourceTypes);
      })
      .catch(() => {});
  }, []);

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      if (selectedOrgFilter !== 'all' && loc.organizationId !== selectedOrgFilter) {
        return false;
      }
      if (selectedTypeFilter !== 'all' && loc.type !== selectedTypeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (loc.name || '').toLowerCase();
        const code = (loc.code || '').toLowerCase();
        const city = (loc.address?.city || '').toLowerCase();
        const district = (loc.address?.district || '').toLowerCase();
        const services = (loc.services || []).join(' ').toLowerCase();

        return name.includes(q) || code.includes(q) || city.includes(q) || district.includes(q) || services.includes(q);
      }
      return true;
    });
  }, [locations, selectedOrgFilter, selectedTypeFilter, searchQuery]);

  // Statistics (Dynamically calculated for all resource types)
  const stats = useMemo(() => {
    const totalLocations = locations.length;
    const activeLocations = locations.filter(l => l.status === 'active').length;
    
    // Dynamic totals per registered resource type
    const resourceTotals = {};
    resourceTypes.forEach(rt => {
      resourceTotals[rt.id] = locations.reduce((acc, l) => acc + (Number(l.capacity?.[rt.id]) || 0), 0);
    });

    return {
      totalLocations,
      activeLocations,
      totalOrgs: organizations.length,
      resourceTotals,
      totalConsultingRooms: resourceTotals.consultingRooms || 0,
      totalTherapyBooths: resourceTotals.therapyBooths || 0,
      totalTheaters: resourceTotals.operatingTheaters || 0,
      totalBeds: resourceTotals.recoveryBeds || 0
    };
  }, [locations, organizations, resourceTypes]);

  // Handle Save Organization
  const handleSaveOrg = (orgData) => {
    const updated = saveOrganization(orgData);
    setOrganizations(updated);
    if (addToast) {
      addToast(
        'success',
        language === 'en' ? `Organization ${orgData.name} saved` : `Organización ${orgData.name} guardada exitosamente`,
        language === 'en' ? 'Organization Saved' : 'Organización Guardada'
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

  // Handle Delete Organization
  const handleDeleteOrg = (org) => {
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Delete Organization' : 'Eliminar Organización',
      message: language === 'en'
        ? `Are you sure you want to delete "${org.name}"?`
        : `¿Estás seguro de que deseas eliminar la organización "${org.name}"?`,
      warningText: language === 'en'
        ? 'Locations linked to this organization may need reassignment.'
        : 'Los planteles o sedes vinculadas a esta organización requerirán reasignación.',
      confirmText: language === 'en' ? 'Delete Organization' : 'Eliminar Organización',
      variant: 'danger',
      icon: 'trash',
      onConfirm: () => {
        const updated = deleteOrganization(org.id);
        setOrganizations(updated);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast(
            'info',
            language === 'en' ? `Organization "${org.name}" deleted` : `Organización "${org.name}" eliminada`,
            language === 'en' ? 'Deleted' : 'Eliminado'
          );
        }
      }
    });
  };

  // Handle Save Location
  const handleSaveLoc = (locData) => {
    const updated = saveLocation(locData);
    setLocations(updated);
    if (addToast) {
      addToast(
        'success',
        language === 'en' ? `Plantel ${locData.name} saved` : `Plantel ${locData.name} guardado exitosamente`,
        language === 'en' ? 'Facility Saved' : 'Plantel Guardado'
      );
    }
  };

  // Handle Delete Location
  const handleDeleteLoc = (loc) => {
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Delete Location' : 'Eliminar Plantel o Sede',
      message: language === 'en'
        ? `Are you sure you want to delete location "${loc.name}"?`
        : `¿Estás seguro de que deseas eliminar el plantel "${loc.name}"?`,
      warningText: language === 'en'
        ? 'Doctors and clinical services linked to this location will lose this campus association.'
        : 'El personal médico y servicios clínicos asignados a esta sede perderán dicha vinculación.',
      confirmText: language === 'en' ? 'Delete Location' : 'Eliminar Plantel',
      variant: 'danger',
      icon: 'trash',
      onConfirm: () => {
        const updated = deleteLocation(loc.id);
        setLocations(updated);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast(
            'info',
            language === 'en' ? `Location "${loc.name}" removed` : `Plantel "${loc.name}" eliminado`,
            language === 'en' ? 'Deleted' : 'Eliminado'
          );
        }
      }
    });
  };

  // Reset to default
  const handleReset = () => {
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Reset Facilities & Locations' : 'Restablecer Planteles y Sedes',
      message: language === 'en'
        ? 'Reset all organization and campus locations back to default demo setup?'
        : '¿Restablecer las organizaciones y planteles a los valores iniciales de prueba?',
      warningText: language === 'en'
        ? 'All newly added campus locations and customized departments will be restored.'
        : 'Se restaurarán todos los planteles y departamentos personalizados.',
      confirmText: language === 'en' ? 'Reset to Default' : 'Restablecer Planteles',
      variant: 'warning',
      icon: 'reset',
      onConfirm: () => {
        const { organizations: newOrgs, locations: newLocs } = resetFacilitiesData();
        setOrganizations(newOrgs);
        setLocations(newLocs);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast(
            'success',
            language === 'en' ? 'Facilities restored to initial demo records' : 'Planteles y sedes restaurados con éxito',
            language === 'en' ? 'Reset Complete' : 'Restablecimiento Completo'
          );
        }
      }
    });
  };

  return (
    <div style={{ padding: embedded ? '0' : '1.75rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
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
              <Building2 size={22} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              {language === 'en' ? 'Healthcare Facilities & Locations' : 'Administración de Planteles y Sedes'}
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
            {language === 'en'
              ? 'Manage hospital branches, outpatient specialty clinics, consulting room capacity, and FHIR Organizations'
              : 'Gestión de planteles, sedes hospitalarias, consultorios, áreas de atención y organizaciones jurídicas FHIR'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.8125rem', gap: '0.35rem' }}
          >
            <RotateCcw size={14} />
            <span>{language === 'en' ? 'Reset Demo Data' : 'Restablecer Demo'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCatalogModal({ isOpen: true })}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.8125rem', gap: '0.4rem', borderColor: '#0f766e', color: '#0f766e', backgroundColor: '#f0fdfa' }}
          >
            <Layers size={15} />
            <span>{language === 'en' ? 'Manage Resources & Services' : 'Catálogo de Recursos & Servicios'}</span>
          </button>

          <button
            type="button"
            onClick={() => setOrgModal({ isOpen: true, organization: null })}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.8125rem', gap: '0.35rem', borderColor: '#cbd5e1' }}
          >
            <Building2 size={15} />
            <span>{language === 'en' ? '+ New Organization' : '+ Nueva Organización'}</span>
          </button>

          <button
            type="button"
            onClick={() => setLocModal({ isOpen: true, location: null })}
            className="btn btn-primary"
            style={{ backgroundColor: '#0f766e', boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)', gap: '0.4rem' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{language === 'en' ? 'New Plantel / Facility' : 'Nuevo Plantel / Sede'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Tiles (Dynamic for All Registered Resource Types) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Total Locations */}
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
            <MapPin size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {language === 'en' ? 'Planteles & Locations' : 'Planteles & Sedes'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.totalLocations}{' '}
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>
                ({stats.activeLocations} {language === 'en' ? 'active' : 'operando'})
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Tiles for each registered resource type */}
        {resourceTypes.map(rt => {
          const IconComp = getResourceIconComponent(rt.icon);
          const totalCount = stats.resourceTotals?.[rt.id] || 0;

          return (
            <div
              key={rt.id}
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
                  backgroundColor: rt.bgColor || '#f0fdf4',
                  border: `1px solid ${rt.borderColor || '#bbf7d0'}`,
                  color: rt.color || '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <IconComp size={22} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rt.nameEs}>
                  {language === 'en' ? rt.nameEn || rt.nameEs : rt.nameEs}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  {totalCount}{' '}
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    {rt.defaultUnit || 'unid.'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Tabs (Locations vs Organizations) */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('locations')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '0.625rem',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'locations' ? 800 : 500,
            border: 'none',
            backgroundColor: activeTab === 'locations' ? '#ecfdf5' : 'transparent',
            color: activeTab === 'locations' ? '#065f46' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <MapPin size={18} />
          <span>{language === 'en' ? 'Planteles & Clinical Locations' : 'Planteles y Sedes Clínicas'} ({locations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('organizations')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '0.625rem',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'organizations' ? 800 : 500,
            border: 'none',
            backgroundColor: activeTab === 'organizations' ? '#ecfdf5' : 'transparent',
            color: activeTab === 'organizations' ? '#065f46' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Building2 size={18} />
          <span>{language === 'en' ? 'FHIR Organizations' : 'Organizaciones Matrices'} ({organizations.length})</span>
        </button>
      </div>

      {/* TAB 1: LOCATIONS & PLANTELES */}
      {activeTab === 'locations' && (
        <div>
          {/* Filters Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            {/* Search */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'en' ? 'Search by plantel name, code, district...' : 'Buscar por nombre de plantel, código, zona...'}
                style={{
                  paddingLeft: '2.4rem',
                  height: '38px',
                  fontSize: '0.8125rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem'
                }}
              />
            </div>

            {/* Dropdown Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Building2 size={15} color="#64748b" />
                <select
                  className="form-input"
                  style={{ height: '38px', width: 'auto', fontSize: '0.8125rem' }}
                  value={selectedOrgFilter}
                  onChange={(e) => setSelectedOrgFilter(e.target.value)}
                >
                  <option value="all">{language === 'en' ? 'All Organizations' : 'Todas las Organizaciones'}</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.alias || org.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Filter size={15} color="#64748b" />
                <select
                  className="form-input"
                  style={{ height: '38px', width: 'auto', fontSize: '0.8125rem' }}
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                >
                  <option value="all">{language === 'en' ? 'All Facility Types' : 'Todos los Tipos'}</option>
                  <option value="hospital">{language === 'en' ? 'Hospital' : 'Hospital Ambulatorio'}</option>
                  <option value="clinic">{language === 'en' ? 'Specialty Clinic' : 'Clínica de Especialidades'}</option>
                  <option value="rehab_center">{language === 'en' ? 'Rehab Center' : 'Centro de Fisioterapia'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Locations Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1.5rem' }}>
            {filteredLocations.map(loc => {
              const parentOrg = organizations.find(o => o.id === loc.organizationId);

              return (
                <div
                  key={loc.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '1rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 5px rgba(15, 23, 42, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    overflow: 'hidden'
                  }}
                >
                  {/* Card Header */}
                  <div style={{ padding: '1.25rem 1.5rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              backgroundColor: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                              fontFamily: 'var(--font-mono)'
                            }}
                          >
                            {loc.code}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {parentOrg?.alias || parentOrg?.name}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, margin: 0 }}>
                          {loc.name}
                        </h3>
                      </div>

                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          backgroundColor: loc.status === 'active' ? '#ecfdf5' : '#fef3c7',
                          color: loc.status === 'active' ? '#047857' : '#b45309',
                          border: `1px solid ${loc.status === 'active' ? '#a7f3d0' : '#fde68a'}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          flexShrink: 0
                        }}
                      >
                        <CheckCircle2 size={11} />
                        {loc.status === 'active' ? (language === 'en' ? 'Active' : 'Operando') : (language === 'en' ? 'Maintenance' : 'Mantenimiento')}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.875rem' }}>
                      {loc.description}
                    </p>

                    {/* Address Box */}
                    <div
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '0.625rem',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.8125rem',
                        color: '#334155',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        marginBottom: '0.875rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                        <MapPin size={14} color="#059669" flexShrink={0} />
                        <span>{loc.address?.line}, {loc.address?.district}, {loc.address?.city}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={12} color="#94a3b8" />
                          <span>{loc.operatingHours}</span>
                        </div>
                        {loc.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Phone size={12} color="#94a3b8" />
                            <span>{loc.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Capacity Overview (Dynamic for all resource types) */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(auto-fit, minmax(70px, 1fr))`,
                        gap: '0.4rem',
                        padding: '0.625rem',
                        backgroundColor: '#f0fdf4',
                        borderRadius: '0.5rem',
                        border: '1px solid #bbf7d0',
                        textAlign: 'center',
                        marginBottom: '0.875rem'
                      }}
                    >
                      {resourceTypes.map(rt => {
                        const count = loc.capacity?.[rt.id] !== undefined ? loc.capacity[rt.id] : 0;
                        return (
                          <div key={rt.id} style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.63rem', color: rt.color || '#166534', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rt.nameEs}>
                              {language === 'en' ? rt.nameEn || rt.nameEs : rt.nameEs}
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: rt.color || '#15803d' }}>
                              {count}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Services Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {loc.services?.map((serv, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.2rem 0.5rem',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            color: '#475569',
                            fontWeight: 500
                          }}
                        >
                          ✓ {serv}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div
                    style={{
                      backgroundColor: '#fafafa',
                      borderTop: '1px solid #f1f5f9',
                      padding: '0.75rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {loc.rooms?.length || 0} {language === 'en' ? 'rooms configured' : 'cubículos configurados'}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setLocModal({ isOpen: true, location: loc })}
                        className="btn btn-primary btn-sm"
                        style={{ backgroundColor: '#0f766e', fontSize: '0.75rem', gap: '0.35rem' }}
                      >
                        <Edit3 size={13} />
                        <span>{language === 'en' ? 'Edit Plantel' : 'Editar Sede'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteLoc(loc)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '0.35rem',
                          display: 'flex',
                          borderRadius: '0.375rem'
                        }}
                        title={language === 'en' ? 'Delete location' : 'Eliminar plantel'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ORGANIZATIONS */}
      {activeTab === 'organizations' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '1.5rem' }}>
          {organizations.map(org => {
            const orgLocations = locations.filter(l => l.organizationId === org.id);

            return (
              <div
                key={org.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          backgroundColor: org.logoBg || '#0f766e',
                          color: org.logoText || '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.2rem',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }}
                      >
                        <Building2 size={24} />
                      </div>

                      <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.25 }}>
                          {org.name}
                        </h3>
                        <div style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 700, marginTop: '0.2rem' }}>
                          {org.alias} • {org.typeName}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        backgroundColor: '#ecfdf5',
                        color: '#047857',
                        border: '1px solid #a7f3d0'
                      }}
                    >
                      FHIR Organization
                    </span>
                  </div>

                  {/* Credentials & Director */}
                  <div
                    style={{
                      padding: '0.875rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.625rem',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      fontSize: '0.8125rem',
                      color: '#334155'
                    }}
                  >
                    <div><strong>RFC / Tax ID:</strong> <code style={{ fontFamily: 'var(--font-mono)' }}>{org.taxId}</code></div>
                    <div><strong>Licencia Sanitaria:</strong> {org.license}</div>
                    <div><strong>Director Médico:</strong> {org.director}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem', fontSize: '0.75rem', color: '#64748b' }}>
                      <span>📞 {org.phone}</span>
                      <span>✉️ {org.email}</span>
                    </div>
                  </div>

                  {/* Connected Locations List */}
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                      {language === 'en' ? 'Associated Planteles / Branches:' : 'Planteles y Sedes Asociadas:'} ({orgLocations.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {orgLocations.map(l => (
                        <div
                          key={l.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.4rem 0.65rem',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '0.5rem',
                            fontSize: '0.75rem'
                          }}
                        >
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{l.name}</span>
                          <span style={{ color: '#64748b' }}>{l.code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Edit */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.875rem' }}>
                  <button
                    type="button"
                    onClick={() => setOrgModal({ isOpen: true, organization: org })}
                    className="btn btn-primary btn-sm"
                    style={{ backgroundColor: '#0f766e', fontSize: '0.75rem', gap: '0.35rem' }}
                  >
                    <Edit3 size={13} />
                    <span>{language === 'en' ? 'Edit Organization' : 'Editar Organización'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteOrg(org)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.35rem' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Organization Modal */}
      <OrganizationModal
        isOpen={orgModal.isOpen}
        onClose={() => setOrgModal({ isOpen: false, organization: null })}
        organization={orgModal.organization}
        onSave={handleSaveOrg}
      />

      {/* Location Modal */}
      <LocationModal
        isOpen={locModal.isOpen}
        onClose={() => {
          setLocModal({ isOpen: false, location: null });
          setLocations(getLocations());
        }}
        location={locModal.location}
        organizations={organizations}
        onSave={handleSaveLoc}
      />

      {/* Facility Catalog Manager Modal (Resources & Services CRUD) */}
      {catalogModal.isOpen && (
        <FacilityCatalogManagerModal
          isOpen={catalogModal.isOpen}
          onClose={() => {
            setCatalogModal({ isOpen: false });
            setResourceTypes(getFacilityResourceTypes());
            setLocations(getLocations());
          }}
          onCatalogChanged={() => {
            setResourceTypes(getFacilityResourceTypes());
            setLocations(getLocations());
          }}
          addToast={addToast}
        />
      )}

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
