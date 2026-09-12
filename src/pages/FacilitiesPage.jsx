import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  ArrowLeft,
  Pencil,
  Trash2,
  Users,
  Stethoscope
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getOrganizations,
  saveOrganization,
  deleteOrganization,
  getLocations,
  persistLocation,
  deleteLocation,
  loadFacilitiesFromFhir,
  areasForOrganization,
  siteForOrganization,
  formatFacilityAddress,
  areaTypeLabel
} from '../utils/facilityStorage';
import { getStaffList, getStaffFullName, loadStaffFromFhir } from '../utils/staffStorage';
import { ensureClinicaYeshua } from '../utils/clinicaYeshuaBootstrap';
import OrganizationModal from '../components/facilities/OrganizationModal';
import AreaModal from '../components/facilities/AreaModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function FacilitiesPage({ addToast, embedded = false }) {
  const { language } = useLanguage();
  const [organizations, setOrganizations] = useState(() => getOrganizations());
  const [locations, setLocations] = useState(() => getLocations());
  const [staff, setStaff] = useState(() => getStaffList());
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [orgModal, setOrgModal] = useState({ isOpen: false, organization: null });
  const [areaModal, setAreaModal] = useState({ isOpen: false, area: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId) || null;
  const site = selectedOrg ? siteForOrganization(selectedOrg.id, locations) : null;
  const areas = selectedOrg ? areasForOrganization(selectedOrg.id, locations, organizations) : [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([loadFacilitiesFromFhir(), loadStaffFromFhir().catch(() => [])]);
      const bootstrapped = await ensureClinicaYeshua();
      if (cancelled) return;
      setOrganizations(bootstrapped.organizations);
      setLocations(bootstrapped.locations);
      setStaff(bootstrapped.staff);
    })();
    return () => { cancelled = true; };
  }, []);

  const staffName = (id) => {
    const member = staff.find((item) => item.id === id);
    return member ? getStaffFullName(member) : '';
  };

  const orgCards = useMemo(() => {
    const seen = new Set();
    return organizations.filter((org) => {
      if (!org?.id || seen.has(org.id)) return false;
      seen.add(org.id);
      return true;
    }).map((org) => ({
      org,
      orgAreas: areasForOrganization(org.id, locations, organizations),
      orgSite: siteForOrganization(org.id, locations)
    }));
  }, [organizations, locations]);

  const handleSaveOrg = (orgData) => {
    const updated = saveOrganization(orgData);
    setOrganizations(updated);
    if (addToast) {
      addToast('success', language === 'en' ? 'Organization saved' : 'Organización guardada', orgData.name);
    }
  };

  const handleSaveArea = async (areaData) => {
    const list = await persistLocation({
      ...areaData,
      organizationId: selectedOrg?.id,
      kind: 'area',
      address: selectedOrg?.address || site?.address,
      partOfId: site?.id,
      partOfFhirId: site?.fhirId,
      partOfName: site?.name
    });
    setLocations(list);
    if (addToast) {
      addToast('success', language === 'en' ? 'Area saved' : 'Área guardada', areaData.name);
    }
  };

  const askDelete = ({ title, message, onConfirm }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      warningText: language === 'en' ? 'This removes the FHIR record.' : 'Esto elimina el registro FHIR.',
      confirmText: language === 'en' ? 'Delete' : 'Eliminar',
      variant: 'danger',
      icon: 'trash',
      onConfirm: () => {
        onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div style={{ padding: embedded ? '0' : '1.75rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.35rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
            {language === 'en' ? 'Administration' : 'Administración'}
          </p>
          <h1 style={{ margin: '0.2rem 0 0', fontSize: '1.55rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            {selectedOrg
              ? (language === 'en' ? 'Areas' : 'Áreas')
              : (language === 'en' ? 'Organizations' : 'Organizaciones')}
          </h1>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: '#64748b', maxWidth: '42rem' }}>
            {selectedOrg
              ? (language === 'en'
                ? 'Rooms and service areas of this organization, with assigned staff.'
                : 'Consultorios y áreas de servicio de esta organización, con el personal asignado.')
              : (language === 'en'
                ? 'Create the organization first, then open its areas — same flow as Clinic, with a clearer workspace.'
                : 'Primero la organización, luego sus áreas: el mismo flujo que Clinic, con un espacio de trabajo más claro.')}
          </p>
        </div>
        {!selectedOrg ? (
          <button type="button" className="btn btn-primary" style={{ backgroundColor: '#0f766e' }} onClick={() => setOrgModal({ isOpen: true, organization: null })}>
            <Plus size={16} />
            {language === 'en' ? 'New organization' : 'Nueva organización'}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" style={{ backgroundColor: '#0f766e' }} onClick={() => setAreaModal({ isOpen: true, area: null })}>
            <Plus size={16} />
            {language === 'en' ? 'New area' : 'Nueva área'}
          </button>
        )}
      </div>

      {!selectedOrg && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {orgCards.length === 0 && (
            <div style={{ backgroundColor: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '1rem', padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              {language === 'en' ? 'Create an organization first.' : 'Crea una organización primero.'}
            </div>
          )}
          {orgCards.map(({ org, orgAreas, orgSite }) => (
            <article
              key={org.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '1rem',
                padding: '1.2rem 1.35rem',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '1rem',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: org.logoBg || '#0f766e', color: org.logoText || '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{org.name}</h2>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#0f766e', fontWeight: 600 }}>
                      {org.alias && org.alias !== org.name ? `${org.alias} · ` : ''}{org.typeName || (language === 'en' ? 'Healthcare provider' : 'Prestador de servicios')}
                    </p>
                  </div>
                </div>
                <p style={{ margin: '0.7rem 0 0', fontSize: '0.8125rem', color: '#334155', display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                  <MapPin size={14} color="#0d9488" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{formatFacilityAddress(org.address || orgSite?.address) || (language === 'en' ? 'No address yet' : 'Sin domicilio')}</span>
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4', borderRadius: '9999px', padding: '0.2rem 0.55rem' }}>
                    {orgAreas.length} {language === 'en' ? 'areas' : 'áreas'}
                  </span>
                  {org.director && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9999px', padding: '0.2rem 0.55rem' }}>
                      {org.director}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <button type="button" className="btn btn-primary btn-sm" style={{ backgroundColor: '#0f766e' }} onClick={() => setSelectedOrgId(org.id)}>
                  {language === 'en' ? 'Open areas' : 'Ver áreas'}
                </button>
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" aria-label="Edit" onClick={() => setOrgModal({ isOpen: true, organization: org })}>
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    aria-label="Delete"
                    onClick={() => askDelete({
                      title: language === 'en' ? 'Delete organization' : 'Eliminar organización',
                      message: org.name,
                      onConfirm: () => {
                        setOrganizations(deleteOrganization(org.id));
                        areasForOrganization(org.id, getLocations()).forEach((loc) => deleteLocation(loc.id));
                        const siteLoc = siteForOrganization(org.id, getLocations());
                        if (siteLoc) deleteLocation(siteLoc.id);
                        setLocations(getLocations());
                      }
                    })}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedOrg && (
        <div>
          <button
            type="button"
            onClick={() => setSelectedOrgId(null)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#0f766e',
              fontWeight: 700,
              fontSize: '0.8125rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
              marginBottom: '0.85rem',
              padding: 0
            }}
          >
            <ArrowLeft size={15} />
            {language === 'en' ? 'Back to organizations' : 'Volver a organizaciones'}
          </button>

          <div
            style={{
              backgroundColor: '#f0fdfa',
              border: '1px solid #99f6e4',
              borderRadius: '1rem',
              padding: '1rem 1.2rem',
              marginBottom: '1rem'
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0f766e' }}>
              {language === 'en' ? 'Organization' : 'Organización'}
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>{selectedOrg.name}</div>
            <div style={{ fontSize: '0.8125rem', color: '#334155', marginTop: '0.25rem' }}>
              {formatFacilityAddress(selectedOrg.address || site?.address)}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1rem', overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1.4fr 1fr auto', gap: '0.75rem', padding: '0.7rem 1.1rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b' }}>
              <span>{language === 'en' ? 'Area' : 'Área'}</span>
              <span>{language === 'en' ? 'Type' : 'Tipo'}</span>
              <span>{language === 'en' ? 'Services' : 'Servicios'}</span>
              <span>{language === 'en' ? 'Staff' : 'Personal'}</span>
              <span />
            </div>
            {areas.length === 0 && (
              <div style={{ padding: '1.75rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                {language === 'en' ? 'No areas yet. Add consultation rooms, therapy, or procedure rooms.' : 'Aún no hay áreas. Añade consultorios, terapia o salas de procedimiento.'}
              </div>
            )}
            {areas.map((area) => (
              <div
                key={area.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 0.8fr 1.4fr 1fr auto',
                  gap: '0.75rem',
                  padding: '0.95rem 1.1rem',
                  borderBottom: '1px solid #f1f5f9',
                  alignItems: 'start'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>{area.name}</div>
                  <div style={{ fontSize: '0.72rem', color: area.status === 'active' ? '#047857' : '#b45309', fontWeight: 600 }}>
                    {area.status === 'active' ? (language === 'en' ? 'Active' : 'Activa') : (language === 'en' ? 'Inactive' : 'Inactiva')}
                  </div>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#334155' }}>{areaTypeLabel(area.areaType, language) || area.typeName}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {(area.services || []).map((service) => (
                    <span key={service} style={{ fontSize: '0.7rem', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '9999px', padding: '0.15rem 0.45rem', fontWeight: 600 }}>
                      {service}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#0f172a' }}>
                  {(area.practitionerIds || []).map(staffName).filter(Boolean).join(', ') || '—'}
                </div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAreaModal({ isOpen: true, area })}>
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => askDelete({
                      title: language === 'en' ? 'Delete area' : 'Eliminar área',
                      message: area.name,
                      onConfirm: () => setLocations(deleteLocation(area.id))
                    })}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', color: '#64748b', fontSize: '0.78rem', alignItems: 'center' }}>
            <Stethoscope size={14} />
            <span>{areas.reduce((acc, area) => acc + (area.services || []).length, 0)} {language === 'en' ? 'service links' : 'servicios vinculados'}</span>
            <Users size={14} />
            <span>{staff.filter((member) => member.organizationId === selectedOrg.id).length} {language === 'en' ? 'staff in this organization' : 'colaboradores en esta organización'}</span>
          </div>
        </div>
      )}

      <OrganizationModal
        isOpen={orgModal.isOpen}
        organization={orgModal.organization}
        onClose={() => setOrgModal({ isOpen: false, organization: null })}
        onSave={handleSaveOrg}
      />
      <AreaModal
        isOpen={areaModal.isOpen}
        area={areaModal.area}
        organization={selectedOrg}
        onClose={() => setAreaModal({ isOpen: false, area: null })}
        onSave={handleSaveArea}
      />
      <DeleteConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        warningText={confirmModal.warningText}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        icon={confirmModal.icon}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  );
}
