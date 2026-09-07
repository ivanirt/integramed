import React, { useState, useEffect } from 'react';
import {
  X,
  PackagePlus,
  Calendar,
  DollarSign,
  Truck,
  FileText,
  User,
  MapPin,
  Tag,
  AlertCircle,
  CheckCircle2,
  Boxes
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function StockIngressModal({
  isOpen,
  onClose,
  onSave,
  ingressToEdit = null,
  medications = [],
  preselectedMedicationId = null
}) {
  const { language, t } = useLanguage();

  const [formData, setFormData] = useState({
    id: '',
    medicationId: '',
    medicationName: '',
    batchNumber: '',
    quantity: 50,
    unitCost: 0,
    totalCost: 0,
    supplier: '',
    invoiceNumber: '',
    receiptDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    storageLocation: '',
    receivedBy: 'Lic. Edith Alvarez',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (ingressToEdit) {
      setFormData({
        ...ingressToEdit,
        quantity: ingressToEdit.quantity || 1,
        unitCost: ingressToEdit.unitCost || 0,
        totalCost: ingressToEdit.totalCost || (ingressToEdit.quantity * ingressToEdit.unitCost)
      });
    } else {
      const defaultMed = preselectedMedicationId
        ? medications.find(m => m.id === preselectedMedicationId)
        : medications[0];

      setFormData({
        id: '',
        medicationId: defaultMed ? defaultMed.id : '',
        medicationName: defaultMed ? `${defaultMed.genericName} (${defaultMed.brandName || defaultMed.strength})` : '',
        batchNumber: `LOTE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        quantity: 50,
        unitCost: defaultMed ? (defaultMed.costPrice || 50) : 50,
        totalCost: defaultMed ? (defaultMed.costPrice || 50) * 50 : 2500,
        supplier: defaultMed ? (defaultMed.supplier || 'Distribuidora Farmacéutica Nacional') : 'Distribuidora Farmacéutica Nacional',
        invoiceNumber: `FAC-${Math.floor(10000 + Math.random() * 90000)}`,
        receiptDate: new Date().toISOString().split('T')[0],
        expiryDate: defaultMed?.expiryDate || '',
        storageLocation: defaultMed?.storageLocation || 'Estante Principal / Farmacia',
        receivedBy: 'Lic. Edith Alvarez',
        notes: ''
      });
    }
    setErrors({});
  }, [ingressToEdit, preselectedMedicationId, medications, isOpen]);

  if (!isOpen) return null;

  const handleMedicationChange = (medId) => {
    const found = medications.find(m => m.id === medId);
    if (found) {
      const unitCost = found.costPrice || 0;
      const qty = Number(formData.quantity) || 1;
      setFormData(prev => ({
        ...prev,
        medicationId: found.id,
        medicationName: `${found.genericName} (${found.brandName || found.strength})`,
        unitCost,
        totalCost: unitCost * qty,
        supplier: found.supplier || prev.supplier,
        storageLocation: found.storageLocation || prev.storageLocation,
        expiryDate: found.expiryDate || prev.expiryDate
      }));
    }
  };

  const handleQuantityChange = (val) => {
    const qty = Number(val);
    const unitCost = Number(formData.unitCost) || 0;
    setFormData(prev => ({
      ...prev,
      quantity: qty,
      totalCost: qty * unitCost
    }));
  };

  const handleUnitCostChange = (val) => {
    const cost = Number(val);
    const qty = Number(formData.quantity) || 0;
    setFormData(prev => ({
      ...prev,
      unitCost: cost,
      totalCost: cost * qty
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.medicationId) {
      newErrors.medicationId = language === 'en' ? 'Select a medication' : 'Selecciona un medicamento';
    }
    if (!formData.batchNumber?.trim()) {
      newErrors.batchNumber = language === 'en' ? 'Batch number is required' : 'El número de lote es obligatorio';
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      newErrors.quantity = language === 'en' ? 'Quantity must be greater than 0' : 'La cantidad debe ser mayor a 0';
    }
    if (!formData.expiryDate) {
      newErrors.expiryDate = language === 'en' ? 'Expiry date is required' : 'La fecha de caducidad es requerida';
    }
    if (!formData.supplier?.trim()) {
      newErrors.supplier = language === 'en' ? 'Supplier name is required' : 'El proveedor es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      ...formData,
      quantity: Number(formData.quantity),
      unitCost: Number(formData.unitCost),
      totalCost: Number(formData.totalCost)
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
          borderRadius: '1.25rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '720px',
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
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc'
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669'
              }}
            >
              <PackagePlus size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {ingressToEdit
                  ? (language === 'en' ? 'Edit Stock Ingress' : 'Editar Entrada a Almacén')
                  : (language === 'en' ? 'Register Stock Ingress / Purchase' : 'Registrar Entrada de Medicamentos a Almacén')}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                {language === 'en'
                  ? 'Add received units, batch number, cold chain status, and supplier invoice details'
                  : 'Ingresa fármacos recibidos, número de lote, fecha de vencimiento y factura del proveedor'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            style={{
              padding: '6px',
              borderRadius: '8px',
              color: '#94a3b8',
              backgroundColor: '#f1f5f9',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Medication Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
              {language === 'en' ? 'Medication from Catalog *' : 'Medicamento del Catálogo *'}
            </label>
            <select
              value={formData.medicationId}
              onChange={(e) => handleMedicationChange(e.target.value)}
              className="form-control"
              style={{ width: '100%', borderColor: errors.medicationId ? '#ef4444' : '#cbd5e1' }}
            >
              <option value="">{language === 'en' ? '-- Select Medication --' : '-- Seleccionar Medicamento --'}</option>
              {medications.map(m => (
                <option key={m.id} value={m.id}>
                  {m.genericName} {m.brandName ? `(${m.brandName})` : ''} - {m.strength} [{m.presentation}] (Stock: {m.stock})
                </option>
              ))}
            </select>
            {errors.medicationId && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>{errors.medicationId}</span>}
          </div>

          {/* 2-Column: Batch & Quantity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                <Tag size={14} color="#059669" />
                <span>{language === 'en' ? 'Batch / Lot Number *' : 'Número de Lote *'}</span>
              </label>
              <input
                type="text"
                value={formData.batchNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
                placeholder="ej. LOTE-PAR-2408"
                className="form-control"
                style={{ width: '100%', borderColor: errors.batchNumber ? '#ef4444' : '#cbd5e1' }}
              />
              {errors.batchNumber && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>{errors.batchNumber}</span>}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                <Boxes size={14} color="#059669" />
                <span>{language === 'en' ? 'Quantity to Ingress (Units) *' : 'Cantidad Recibida (Unidades) *'}</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="form-control"
                style={{ width: '100%', borderColor: errors.quantity ? '#ef4444' : '#cbd5e1' }}
              />
              {errors.quantity && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>{errors.quantity}</span>}
            </div>
          </div>

          {/* 2-Column: Expiry Date & Receipt Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                <Calendar size={14} color="#059669" />
                <span>{language === 'en' ? 'Expiry Date *' : 'Fecha de Caducidad / Vencimiento *'}</span>
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                className="form-control"
                style={{ width: '100%', borderColor: errors.expiryDate ? '#ef4444' : '#cbd5e1' }}
              />
              {errors.expiryDate && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>{errors.expiryDate}</span>}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                <Calendar size={14} color="#64748b" />
                <span>{language === 'en' ? 'Reception Date' : 'Fecha de Recepción en Farmacia'}</span>
              </label>
              <input
                type="date"
                value={formData.receiptDate}
                onChange={(e) => setFormData(prev => ({ ...prev, receiptDate: e.target.value }))}
                className="form-control"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* 2-Column: Unit Cost & Total Cost */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                <DollarSign size={14} color="#059669" />
                <span>{language === 'en' ? 'Unit Purchase Cost (MXN)' : 'Costo Unitario de Compra (MXN)'}</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.unitCost}
                onChange={(e) => handleUnitCostChange(e.target.value)}
                className="form-control"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                {language === 'en' ? 'Total Ingress Cost' : 'Costo Total de Entrada'}
              </label>
              <div
                style={{
                  height: '38px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 0.85rem',
                  fontSize: '0.9375rem',
                  fontWeight: 800,
                  color: '#059669'
                }}
              >
                ${Number(formData.totalCost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
              </div>
            </div>
          </div>

          {/* 2-Column: Supplier & Invoice */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                <Truck size={14} color="#059669" />
                <span>{language === 'en' ? 'Supplier / Lab *' : 'Proveedor / Distribuidor *'}</span>
              </label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                placeholder="ej. Sanofi Aventis México"
                className="form-control"
                style={{ width: '100%', borderColor: errors.supplier ? '#ef4444' : '#cbd5e1' }}
              />
              {errors.supplier && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>{errors.supplier}</span>}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                <FileText size={14} color="#64748b" />
                <span>{language === 'en' ? 'Invoice / Delivery Note' : 'No. Factura o Remisión'}</span>
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                placeholder="ej. FAC-2026-8819"
                className="form-control"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* 2-Column: Storage Location & Receiver */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                <MapPin size={14} color="#059669" />
                <span>{language === 'en' ? 'Storage Location / Shelf' : 'Ubicación Física en Farmacia'}</span>
              </label>
              <input
                type="text"
                value={formData.storageLocation}
                onChange={(e) => setFormData(prev => ({ ...prev, storageLocation: e.target.value }))}
                placeholder="ej. Estante A-01 / Refrigerador 1"
                className="form-control"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                <User size={14} color="#64748b" />
                <span>{language === 'en' ? 'Received By (Staff)' : 'Personal Receptor'}</span>
              </label>
              <input
                type="text"
                value={formData.receivedBy}
                onChange={(e) => setFormData(prev => ({ ...prev, receivedBy: e.target.value }))}
                className="form-control"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
              {language === 'en' ? 'Observations & Quality Control Notes' : 'Observaciones y Control de Calidad'}
            </label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={language === 'en' ? 'e.g. Cold chain verified at 4°C, seal intact...' : 'ej. Sellos intactos, empaque termo-protegido verificado a 4°C...'}
              className="form-control"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.75rem',
              paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{ borderColor: '#cbd5e1', color: '#64748b' }}
            >
              {language === 'en' ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                backgroundColor: '#059669',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 10px rgba(5, 150, 105, 0.25)'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{ingressToEdit ? (language === 'en' ? 'Save Changes' : 'Guardar Cambios') : (language === 'en' ? 'Ingress to Stock' : 'Ingresar al Inventario')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
