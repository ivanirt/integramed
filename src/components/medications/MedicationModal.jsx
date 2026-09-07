import React, { useState, useEffect } from 'react';
import {
  X,
  Pill,
  Check,
  AlertCircle,
  Package,
  Calendar,
  Layers,
  Thermometer,
  ShieldCheck,
  DollarSign,
  Tag
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function MedicationModal({
  isOpen,
  onClose,
  medication, // null for create, object for edit
  onSave
}) {
  const { language, t } = useLanguage();
  const [formData, setFormData] = useState({
    id: '',
    brandName: '',
    genericName: '',
    code: '',
    category: 'Analgésicos y Antipiréticos',
    dosageForm: 'Tabletas',
    strength: '500 mg',
    presentation: 'Caja con 20 tabletas',
    route: 'Oral',
    stock: 100,
    minStock: 25,
    maxStock: 500,
    reorderPoint: 40,
    batchNumber: 'LOTE-2026-01',
    expiryDate: '2027-12-31',
    costPrice: 50.00,
    unitPrice: 120.00,
    controlFraction: 'Fracción IV (Venta con receta)',
    requiresPrescription: true,
    storageTemp: '15°C - 30°C (Ambiente seco)',
    storageLocation: 'Estante A-01',
    supplier: 'Laboratorios Pisa S.A. de C.V.',
    movements: []
  });

  const [error, setError] = useState('');

  const categories = [
    'Analgésicos y Antipiréticos',
    'Antiinflamatorios y Analgésicos AINEs',
    'Antibióticos Sistémicos',
    'Antihipertensivos & Cardiovascular',
    'Endocrinología & Diabetes',
    'Gastroenterología & Antiulcerosos',
    'Neumología & Broncodilatadores',
    'Neurología & Psiquiatría',
    'Antihistamínicos & Alergia',
    'Soluciones y Electrólitos IV',
    'Material de Curación & Apósitos'
  ];

  const routes = ['Oral', 'Intravenosa', 'Intramuscular', 'Subcutánea', 'Tópica', 'Inhalatoria', 'Oftálmica', 'Ótica'];
  const dosageForms = ['Tabletas', 'Cápsulas', 'Comprimidos', 'Jarabe / Suspensión', 'Solución Inyectable en Ampolleta', 'Frasco Ámpula', 'Aerosol Inhalador', 'Crema / Pomada', 'Gotas Oftálmicas'];

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (medication) {
        setFormData({ ...medication });
      } else {
        setFormData({
          id: `med-${Date.now()}`,
          brandName: '',
          genericName: '',
          code: `SSA-${Math.floor(Math.random() * 899 + 100)}.000.${Math.floor(Math.random() * 8999 + 1000)}.00`,
          category: 'Analgésicos y Antipiréticos',
          dosageForm: 'Tabletas',
          strength: '500 mg',
          presentation: 'Caja con 20 tabletas',
          route: 'Oral',
          stock: 100,
          minStock: 30,
          maxStock: 500,
          reorderPoint: 50,
          batchNumber: `LOTE-${Math.floor(Math.random() * 8999 + 1000)}`,
          expiryDate: '2027-12-31',
          costPrice: 60.00,
          unitPrice: 140.00,
          controlFraction: 'Fracción IV (Venta con receta)',
          requiresPrescription: true,
          storageTemp: '15°C - 30°C (Ambiente seco)',
          storageLocation: 'Estante A-01',
          supplier: 'Laboratorios Clínicos S.A.',
          movements: []
        });
      }
    }
  }, [isOpen, medication]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.genericName.trim()) {
      setError(language === 'en' ? 'Generic Name (Active Ingredient) is required' : 'El Principio Activo (Genérico) es requerido');
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
              <Pill size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {medication
                  ? `${language === 'en' ? 'Edit Medication:' : 'Editar Medicamento:'} ${formData.genericName}`
                  : (language === 'en' ? 'New Medication in Catalog' : 'Registrar Nuevo Medicamento en Catálogo')}
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                {language === 'en' ? 'FHIR Medication resource with stock control and storage parameters' : 'Recurso FHIR Medication con control de lote, stock mínimo y temperatura'}
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
          <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
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

            {/* Names & Codes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Generic Name (Active Ingredient) *' : 'Principio Activo (Genérico) *'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.genericName}
                  onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                  placeholder="Ej. Paracetamol / Amoxicilina"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Commercial / Brand Name' : 'Nombre Comercial / Marca'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  placeholder="Ej. Tempra Forte / Augmentin"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Therapeutic Category' : 'Categoría Terapéutica'}
                </label>
                <select
                  className="form-input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Dosage Form' : 'Forma Farmacéutica'}
                </label>
                <select
                  className="form-input"
                  value={formData.dosageForm}
                  onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                >
                  {dosageForms.map(form => (
                    <option key={form} value={form}>{form}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Route of Admin' : 'Vía de Administración'}
                </label>
                <select
                  className="form-input"
                  value={formData.route}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                >
                  {routes.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Concentration / Strength' : 'Concentración'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.strength}
                  onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                  placeholder="500 mg / 100 UI"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Commercial Presentation' : 'Presentación'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.presentation}
                  onChange={(e) => setFormData({ ...formData, presentation: e.target.value })}
                  placeholder="Caja con 20 tabletas"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Code (SSA / ATC)' : 'Clave Cuadro Básico / ATC'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="SSA-010.000.0104.00"
                />
              </div>
            </div>

            {/* Inventory & Batch Section */}
            <div style={{ backgroundColor: '#f0fdf4', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#166534', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Package size={16} color="#15803d" />
                <span>{language === 'en' ? 'Stock, Lot & Expiry Control' : 'Control de Stock, Lote y Caducidad'}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#15803d', marginBottom: '0.25rem' }}>
                    {language === 'en' ? 'Current Stock (Units)' : 'Stock Actual (Unidades)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#15803d', marginBottom: '0.25rem' }}>
                    {language === 'en' ? 'Minimum Stock (Alert)' : 'Stock Mínimo (Alerta)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#15803d', marginBottom: '0.25rem' }}>
                    {language === 'en' ? 'Batch / Lot Number' : 'Número de Lote'}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    placeholder="LOTE-2026-01"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#15803d', marginBottom: '0.25rem' }}>
                    {language === 'en' ? 'Expiry Date' : 'Fecha de Caducidad'}
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Storage & Regulatory Control */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Storage Temperature / Conditions' : 'Temperatura de Almacenamiento'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Thermometer size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2.2rem' }}
                    value={formData.storageTemp}
                    onChange={(e) => setFormData({ ...formData, storageTemp: e.target.value })}
                    placeholder="15°C - 30°C o Cadena de Frío 2°C - 8°C"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Physical Storage Location' : 'Ubicación en Farmacia / Almacén'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.storageLocation}
                  onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                  placeholder="Estante A-01 / Gaveta 2"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Regulatory Fraction (COFEPRIS)' : 'Clasificación Sanitaria (Fracción)'}
                </label>
                <select
                  className="form-input"
                  value={formData.controlFraction}
                  onChange={(e) => setFormData({ ...formData, controlFraction: e.target.value })}
                >
                  <option value="Fracción V (Libre acceso)">Fracción V (Venta Libre / OTC)</option>
                  <option value="Fracción IV (Venta con receta)">Fracción IV (Receta Médica)</option>
                  <option value="Fracción IV (Antibiótico con receta médica retenida)">Fracción IV (Antibiótico con Receta Retenida)</option>
                  <option value="Fracción II-III (Psicotrópico controlado)">Fracción II-III (Psicotrópico Controlado)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Unit Cost ($)' : 'Costo Unitario ($)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'en' ? 'Public Price ($)' : 'Precio Venta ($)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                />
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
              justifyContent: 'space-between',
              backgroundColor: '#fafafa'
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              ID: {formData.id}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                <span>{language === 'en' ? 'Save Medication' : 'Guardar Medicamento'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
