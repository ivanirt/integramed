import React, { useState } from 'react';
import {
  X,
  PackagePlus,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Check,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function StockMovementModal({
  isOpen,
  onClose,
  medication,
  onSaveMovement
}) {
  const { language, t } = useLanguage();
  const [movementType, setMovementType] = useState('in'); // 'in' | 'out' | 'adjustment'
  const [quantity, setQuantity] = useState(10);
  const [reason, setReason] = useState('');
  const [user, setUser] = useState('Farmacia Central / Administración');
  const [error, setError] = useState('');

  if (!isOpen || !medication) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0) {
      setError(language === 'en' ? 'Quantity must be greater than 0' : 'La cantidad debe ser mayor a 0');
      return;
    }

    onSaveMovement(medication.id, {
      type: movementType,
      quantity: Number(quantity),
      reason: reason || (movementType === 'in' ? 'Entrada / Compra' : movementType === 'out' ? 'Dispensación a paciente' : 'Ajuste físico de inventario'),
      user
    });
    onClose();
  };

  const calculatedStock = movementType === 'in'
    ? medication.stock + Number(quantity)
    : movementType === 'out'
    ? Math.max(0, medication.stock - Number(quantity))
    : Number(quantity);

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
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '520px',
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
              <PackagePlus size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {language === 'en' ? 'Stock Movement & Adjustment' : 'Movimiento y Ajuste de Inventario'}
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                {medication.genericName} ({medication.brandName})
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
              display: 'flex'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '0.75rem',
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

          {/* Current Stock Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.875rem 1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0'
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                {language === 'en' ? 'Current In-Stock Quantity:' : 'Existencia Actual en Almacén:'}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                {medication.stock} {language === 'en' ? 'units' : 'unidades'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                {language === 'en' ? 'Estimated After Move:' : 'Existencia Resultante:'}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                {calculatedStock} {language === 'en' ? 'units' : 'unidades'}
              </div>
            </div>
          </div>

          {/* Movement Type Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
              {language === 'en' ? 'Movement Type' : 'Tipo de Movimiento'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setMovementType('in')}
                style={{
                  padding: '0.65rem',
                  borderRadius: '0.5rem',
                  border: movementType === 'in' ? '2px solid #059669' : '1px solid #cbd5e1',
                  backgroundColor: movementType === 'in' ? '#ecfdf5' : '#ffffff',
                  color: movementType === 'in' ? '#047857' : '#475569',
                  fontWeight: movementType === 'in' ? 800 : 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <ArrowDownLeft size={16} />
                <span>{language === 'en' ? 'Entry (In)' : 'Entrada'}</span>
              </button>

              <button
                type="button"
                onClick={() => setMovementType('out')}
                style={{
                  padding: '0.65rem',
                  borderRadius: '0.5rem',
                  border: movementType === 'out' ? '2px solid #e11d48' : '1px solid #cbd5e1',
                  backgroundColor: movementType === 'out' ? '#fff1f2' : '#ffffff',
                  color: movementType === 'out' ? '#be123c' : '#475569',
                  fontWeight: movementType === 'out' ? 800 : 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <ArrowUpRight size={16} />
                <span>{language === 'en' ? 'Exit (Out)' : 'Salida'}</span>
              </button>

              <button
                type="button"
                onClick={() => setMovementType('adjustment')}
                style={{
                  padding: '0.65rem',
                  borderRadius: '0.5rem',
                  border: movementType === 'adjustment' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  backgroundColor: movementType === 'adjustment' ? '#f0f9ff' : '#ffffff',
                  color: movementType === 'adjustment' ? '#0369a1' : '#475569',
                  fontWeight: movementType === 'adjustment' ? 800 : 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <RefreshCw size={15} />
                <span>{language === 'en' ? 'Set Total' : 'Fijar Total'}</span>
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              {movementType === 'adjustment'
                ? (language === 'en' ? 'Exact New Total Count' : 'Cantidad Total Exacta en Físico')
                : (language === 'en' ? 'Units to Add / Deduct' : 'Unidades a Ingresar / Descontar')}
            </label>
            <input
              type="number"
              min="1"
              className="form-input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          {/* Reason / Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              {language === 'en' ? 'Reason / Reference / Invoice' : 'Motivo / Referencia / Factura'}
            </label>
            <input
              type="text"
              className="form-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Factura #F-9481 / Merma por caducidad / Receta #REC-102"
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
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
              <span>{language === 'en' ? 'Apply Movement' : 'Aplicar Movimiento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
