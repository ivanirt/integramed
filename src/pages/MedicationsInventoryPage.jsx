import React, { useState, useMemo } from 'react';
import {
  Pill,
  Plus,
  Search,
  Package,
  AlertTriangle,
  Clock,
  Edit3,
  Trash2,
  CheckCircle2,
  PackagePlus,
  RefreshCw,
  RotateCcw,
  Thermometer,
  ShieldCheck,
  Check,
  AlertCircle,
  Filter,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getMedications,
  saveMedication,
  deleteMedication,
  adjustMedicationStock,
  resetMedicationsData
} from '../utils/medicationInventoryStorage';
import MedicationModal from '../components/medications/MedicationModal';
import StockMovementModal from '../components/medications/StockMovementModal';

export default function MedicationsInventoryPage({ addToast }) {
  const { language, t } = useLanguage();

  const [medications, setMedications] = useState(() => getMedications());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState('all'); // 'all' | 'low_stock' | 'near_expiry'

  // Modals state
  const [medModal, setMedModal] = useState({ isOpen: false, medication: null });
  const [stockModal, setStockModal] = useState({ isOpen: false, medication: null });

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(medications.map(m => m.category).filter(Boolean));
    return Array.from(set);
  }, [medications]);

  // Filtered medications
  const filteredMedications = useMemo(() => {
    const today = new Date();
    const threeMonthsAhead = new Date();
    threeMonthsAhead.setMonth(today.getMonth() + 3);

    return medications.filter(med => {
      // Category filter
      if (selectedCategory !== 'all' && med.category !== selectedCategory) {
        return false;
      }

      // Stock filter
      if (selectedStockFilter === 'low_stock' && med.stock > med.minStock) {
        return false;
      }
      if (selectedStockFilter === 'near_expiry') {
        if (!med.expiryDate) return false;
        const exp = new Date(med.expiryDate);
        if (exp > threeMonthsAhead) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const generic = (med.genericName || '').toLowerCase();
        const brand = (med.brandName || '').toLowerCase();
        const code = (med.code || '').toLowerCase();
        const batch = (med.batchNumber || '').toLowerCase();
        const cat = (med.category || '').toLowerCase();
        const loc = (med.storageLocation || '').toLowerCase();

        return (
          generic.includes(q) ||
          brand.includes(q) ||
          code.includes(q) ||
          batch.includes(q) ||
          cat.includes(q) ||
          loc.includes(q)
        );
      }
      return true;
    });
  }, [medications, selectedCategory, selectedStockFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const today = new Date();
    const threeMonthsAhead = new Date();
    threeMonthsAhead.setMonth(today.getMonth() + 3);

    const total = medications.length;
    const totalUnits = medications.reduce((acc, m) => acc + (m.stock || 0), 0);
    const lowStockCount = medications.filter(m => m.stock <= m.minStock).length;
    const nearExpiryCount = medications.filter(m => {
      if (!m.expiryDate) return false;
      const exp = new Date(m.expiryDate);
      return exp <= threeMonthsAhead;
    }).length;

    return { total, totalUnits, lowStockCount, nearExpiryCount };
  }, [medications]);

  // Save medication handler
  const handleSaveMedication = (medData) => {
    const updated = saveMedication(medData);
    setMedications(updated);
    if (addToast) {
      addToast(
        'success',
        language === 'en'
          ? `Medication ${medData.genericName} saved successfully`
          : `Medicamento ${medData.genericName} guardado en el catálogo`,
        language === 'en' ? 'Medication Catalog Updated' : 'Catálogo de Farmacia Actualizado'
      );
    }
  };

  // Stock movement handler
  const handleStockMovement = (medId, movementData) => {
    const result = adjustMedicationStock(medId, movementData);
    if (result) {
      setMedications(result.updatedList);
      if (addToast) {
        addToast(
          'success',
          language === 'en'
            ? `Stock updated for ${result.med.genericName}. New total: ${result.med.stock} units`
            : `Inventario actualizado para ${result.med.genericName}. Nueva existencia: ${result.med.stock} unidades`,
          language === 'en' ? 'Stock Adjusted' : 'Inventario Ajustado'
        );
      }
    }
  };

  // Delete medication handler
  const handleDeleteMedication = (med) => {
    if (window.confirm(language === 'en' ? `Delete medication ${med.genericName}?` : `¿Eliminar el medicamento ${med.genericName} del inventario?`)) {
      const updated = deleteMedication(med.id);
      setMedications(updated);
      if (addToast) addToast('info', language === 'en' ? 'Medication removed' : 'Medicamento eliminado');
    }
  };

  // Reset handler
  const handleReset = () => {
    if (window.confirm(language === 'en' ? 'Reset pharmacy inventory to default demo items?' : '¿Restablecer el inventario de medicamentos a los valores iniciales?')) {
      const defaultMeds = resetMedicationsData();
      setMedications(defaultMeds);
      if (addToast) addToast('success', language === 'en' ? 'Inventory reset' : 'Inventario restaurado');
    }
  };

  return (
    <div style={{ padding: '1.75rem', maxWidth: '1440px', margin: '0 auto' }}>
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
              <Pill size={22} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              {language === 'en' ? 'Pharmacy & Medication Inventory Management' : 'Administración de Medicamentos e Inventario'}
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
            {language === 'en'
              ? 'Catalog control, batch tracking, cold chain storage conditions, and real-time pharmacy stock movements'
              : 'Control de catálogo de fármacos, lotes, caducidades, cadena de frío y movimientos de entradas/salidas de farmacia'}
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
            onClick={() => setMedModal({ isOpen: true, medication: null })}
            className="btn btn-primary"
            style={{ backgroundColor: '#0f766e', boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)', gap: '0.4rem' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{language === 'en' ? 'New Medication' : 'Nuevo Medicamento'}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Total Medications */}
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
            <Pill size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {language === 'en' ? 'Medication Catalog' : 'Fármacos en Catálogo'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.total}{' '}
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>
                ({stats.totalUnits} {language === 'en' ? 'units' : 'unid.'})
              </span>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
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
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#e11d48',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {language === 'en' ? 'Low Stock Alerts' : 'Alertas Stock Bajo'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stats.lowStockCount > 0 ? '#e11d48' : '#0f172a', lineHeight: 1.2 }}>
              {stats.lowStockCount}{' '}
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                {language === 'en' ? 'require reorder' : 'por reabastecer'}
              </span>
            </div>
          </div>
        </div>

        {/* Expiry Warning */}
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
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {language === 'en' ? 'Near Expiry (<90d)' : 'Próximos a Caducar'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stats.nearExpiryCount > 0 ? '#d97706' : '#0f172a', lineHeight: 1.2 }}>
              {stats.nearExpiryCount}{' '}
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                {language === 'en' ? 'lots to rotate' : 'lotes en rotación'}
              </span>
            </div>
          </div>
        </div>

        {/* Total Stock Value */}
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
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {language === 'en' ? 'Pharmacy Valuation' : 'Valor de Inventario'}
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              ${medications.reduce((acc, m) => acc + ((m.stock || 0) * (m.unitPrice || 0)), 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'en' ? 'Search medication, brand, lot, code...' : 'Buscar fármaco, marca, lote, código SSA...'}
              style={{
                paddingLeft: '2.4rem',
                height: '38px',
                fontSize: '0.8125rem',
                backgroundColor: '#f8fafc',
                borderRadius: '0.5rem'
              }}
            />
          </div>

          {/* Stock Condition Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Filter size={15} color="#64748b" />
            <select
              className="form-input"
              style={{ height: '38px', width: 'auto', fontSize: '0.8125rem' }}
              value={selectedStockFilter}
              onChange={(e) => setSelectedStockFilter(e.target.value)}
            >
              <option value="all">{language === 'en' ? 'All Stock Levels' : 'Todos los Niveles de Stock'}</option>
              <option value="low_stock">⚠️ {language === 'en' ? 'Low Stock Alerts Only' : 'Solo Stock Bajo / Crítico'}</option>
              <option value="near_expiry">⏱️ {language === 'en' ? 'Near Expiry Lots' : 'Solo Lotes por Vencer'}</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '0.875rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginRight: '0.25rem' }}>
            {language === 'en' ? 'Category:' : 'Categoría:'}
          </span>

          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: selectedCategory === 'all' ? 800 : 500,
              border: selectedCategory === 'all' ? '1.5px solid #0f766e' : '1px solid #e2e8f0',
              backgroundColor: selectedCategory === 'all' ? '#ecfdf5' : '#ffffff',
              color: selectedCategory === 'all' ? '#065f46' : '#64748b',
              cursor: 'pointer'
            }}
          >
            {language === 'en' ? 'All Categories' : 'Todas'} ({medications.length})
          </button>

          {categories.map(cat => {
            const count = medications.filter(m => m.category === cat).length;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 800 : 500,
                  border: isSelected ? '1.5px solid #0f766e' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                  color: isSelected ? '#065f46' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                <span>{cat}</span>
                <span style={{ opacity: 0.75, fontSize: '0.7rem', marginLeft: '0.25rem' }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Medication Cards / Stock Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.25rem' }}>
        {filteredMedications.map(med => {
          const isLowStock = med.stock <= med.minStock;
          const isNearExpiry = med.expiryDate && new Date(med.expiryDate) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

          return (
            <div
              key={med.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '1rem',
                border: isLowStock ? '1.5px solid #fecaca' : isNearExpiry ? '1.5px solid #fde68a' : '1px solid #e2e8f0',
                boxShadow: '0 2px 5px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflow: 'hidden'
              }}
            >
              {/* Card Main Header & Attributes */}
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {med.category}
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0.15rem 0 0', lineHeight: 1.25 }}>
                      {med.genericName}
                    </h3>
                    {med.brandName && (
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
                        {med.brandName} • {med.strength}
                      </div>
                    )}
                  </div>

                  {/* Stock Status Badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        backgroundColor: isLowStock ? '#fee2e2' : '#ecfdf5',
                        color: isLowStock ? '#b91c1c' : '#047857',
                        border: `1px solid ${isLowStock ? '#fca5a5' : '#a7f3d0'}`
                      }}
                    >
                      {isLowStock ? '⚠️ ' + (language === 'en' ? 'Low Stock' : 'Stock Bajo') : '✓ ' + (language === 'en' ? 'In Stock' : 'Disponible')}
                    </span>

                    {isNearExpiry && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '9999px',
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          border: '1px solid #fde68a'
                        }}
                      >
                        ⏱️ {language === 'en' ? 'Near Expiry' : 'Por Vencer'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Presentation & Code */}
                <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.75rem' }}>
                  <span>{med.presentation}</span> • <span>{med.route}</span>
                  {med.code && <span style={{ display: 'block', color: '#94a3b8', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', marginTop: '0.15rem' }}>{med.code}</span>}
                </div>

                {/* Stock Level Bar */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '0.625rem',
                    padding: '0.75rem 1rem',
                    border: '1px solid #e2e8f0',
                    marginBottom: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                      {language === 'en' ? 'Stock in Pharmacy:' : 'Existencias en Farmacia:'}
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: isLowStock ? '#b91c1c' : '#0f172a' }}>
                      {med.stock} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>/ mín {med.minStock}</span>
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, ((med.stock || 0) / (med.maxStock || 200)) * 100)}%`,
                        backgroundColor: isLowStock ? '#ef4444' : '#10b981',
                        transition: 'all 0.2s ease'
                      }}
                    />
                  </div>
                </div>

                {/* Lot, Storage, Price Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#475569',
                    backgroundColor: '#fafafa',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #f1f5f9'
                  }}
                >
                  <div>
                    <span style={{ color: '#94a3b8' }}>Lote:</span> <strong style={{ fontFamily: 'var(--font-mono)' }}>{med.batchNumber || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Caducidad:</span> <strong>{med.expiryDate || 'N/A'}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#94a3b8' }}>Almacén:</span> <span>{med.storageLocation} ({med.storageTemp})</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>P. Público:</span> <strong style={{ color: '#059669' }}>${med.unitPrice?.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Control:</span> <span style={{ fontSize: '0.7rem' }}>{med.controlFraction?.split(' ')[0]} {med.controlFraction?.split(' ')[1]}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid #f1f5f9',
                  padding: '0.75rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}
              >
                {/* Adjust Stock Button */}
                <button
                  type="button"
                  onClick={() => setStockModal({ isOpen: true, medication: med })}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', gap: '0.35rem', color: '#0f766e', borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' }}
                >
                  <PackagePlus size={14} />
                  <span>{language === 'en' ? 'Stock In/Out' : 'Entrada / Salida'}</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => setMedModal({ isOpen: true, medication: med })}
                    className="btn btn-primary btn-sm"
                    style={{ backgroundColor: '#0f766e', fontSize: '0.75rem', gap: '0.35rem' }}
                  >
                    <Edit3 size={13} />
                    <span>{language === 'en' ? 'Edit' : 'Editar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteMedication(med)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '0.35rem',
                      display: 'flex'
                    }}
                    title={language === 'en' ? 'Delete medication' : 'Eliminar medicamento'}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Medication Create/Edit Modal */}
      <MedicationModal
        isOpen={medModal.isOpen}
        onClose={() => setMedModal({ isOpen: false, medication: null })}
        medication={medModal.medication}
        onSave={handleSaveMedication}
      />

      {/* Stock Movement Modal */}
      <StockMovementModal
        isOpen={stockModal.isOpen}
        onClose={() => setStockModal({ isOpen: false, medication: null })}
        medication={stockModal.medication}
        onSaveMovement={handleStockMovement}
      />
    </div>
  );
}
