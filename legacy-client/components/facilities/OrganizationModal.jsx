import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  Globe,
  FileText,
  User,
  ShieldCheck,
  Check,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function OrganizationModal({
  isOpen,
  onClose,
  organization, // null for create, object for edit
  onSave
}) {
  const { language, t } = useLanguage();
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    alias: '',
    type: 'prov',
    typeName: 'Red Hospitalaria y Clínicas de Especialidad',
    taxId: '',
    license: '',
    director: '',
    phone: '',
    email: '',
    website: '',
    status: 'active',
    logoBg: '#0f766e',
    logoText: '#ffffff',
    foundedYear: 2020
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (organization) {
        setFormData({ ...organization });
      } else {
        setFormData({
          id: `org-${Date.now()}`,
          name: '',
          alias: '',
          type: 'prov',
          typeName: language === 'en' ? 'Healthcare provider' : 'Prestador de servicios médicos',
          taxId: '',
          license: '',
          director: '',
          phone: '',
          email: '',
          website: '',
          status: 'active',
          logoBg: '#0f766e',
          logoText: '#ffffff',
          address: {
            line: '',
            district: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'México'
          }
        });
      }
    }
  }, [isOpen, organization]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError(language === 'en' ? 'Organization Legal Name is required' : 'La Razón Social o Nombre Legal es requerido');
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
          maxWidth: '620px',
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
              <Building2 size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {organization
                  ? (language === 'en' ? 'Edit organization' : 'Editar organización')
                  : (language === 'en' ? 'New organization' : 'Nueva organización')}
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                {language === 'en' ? 'FHIR Organization — legal entity and main address' : 'FHIR Organization — entidad legal y domicilio principal'}
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

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              {language === 'en' ? 'Legal Organization Name *' : 'Razón Social / Nombre Legal *'}
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Clínica Yeshua"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Commercial Alias / Brand' : 'Nombre Comercial / Marca'}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.alias}
                onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                placeholder="Ej. IntegraMed Salud"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Tax ID / RFC' : 'RFC / Identificador Fiscal'}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value.toUpperCase() })}
                placeholder="IME190824AB3"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Sanitary License / COFEPRIS' : 'Licencia Sanitaria / COFEPRIS'}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.license}
                onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                placeholder="COFEPRIS 21-3300-201-094"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Medical Director / CEO' : 'Director(a) Médico / Representante'}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.director}
                onChange={(e) => setFormData({ ...formData, director: e.target.value })}
                placeholder="Dr. Jesús Robledo Morales"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Central Phone' : 'Teléfono Central'}
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="tel"
                  className="form-input"
                  style={{ paddingLeft: '2.2rem' }}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+52 55 5234 8100"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Institutional Email' : 'Correo Institucional'}
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.2rem' }}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="direccion@integramed.com"
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              {language === 'en' ? 'Street and building' : 'Calle y edificio'}
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.address?.line || ''}
              onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), line: e.target.value } })}
              placeholder="Av. México 46, piso 2"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Neighborhood' : 'Colonia / fraccionamiento'}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.address?.district || ''}
                onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), district: e.target.value } })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'City' : 'Ciudad'}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.address?.city || ''}
                onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), city: e.target.value } })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'State' : 'Estado'}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.address?.state || ''}
                onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), state: e.target.value } })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Postal code' : 'C.P.'}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.address?.postalCode || ''}
                onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), postalCode: e.target.value } })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {language === 'en' ? 'Country' : 'País'}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.address?.country || ''}
                onChange={(e) => setFormData({ ...formData, address: { ...(formData.address || {}), country: e.target.value } })}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
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
              <span>{language === 'en' ? 'Save Organization' : 'Guardar Organización'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
