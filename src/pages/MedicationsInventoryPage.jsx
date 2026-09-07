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
  ArrowUpRight,
  Truck,
  User,
  FileText,
  Boxes,
  Calendar,
  Layers,
  Send,
  Stethoscope
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getMedications,
  saveMedication,
  deleteMedication,
  getStockIngresses,
  saveStockIngress,
  deleteStockIngress,
  getPatientDispensations,
  savePatientDispensation,
  deletePatientDispensation,
  resetMedicationsData
} from '../utils/medicationInventoryStorage';
import MedicationModal from '../components/medications/MedicationModal';
import StockIngressModal from '../components/medications/StockIngressModal';
import PatientDispenseModal from '../components/medications/PatientDispenseModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function MedicationsInventoryPage({ addToast }) {
  const { language, t } = useLanguage();

  // Active Tab: 'catalog' | 'ingresses' | 'dispensations'
  const [activeTab, setActiveTab] = useState('catalog');

  // Core States
  const [medications, setMedications] = useState(() => getMedications());
  const [ingresses, setIngresses] = useState(() => getStockIngresses());
  const [dispensations, setDispensations] = useState(() => getPatientDispensations());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState('all'); // 'all' | 'low_stock' | 'near_expiry'

  // Modals state
  const [medModal, setMedModal] = useState({ isOpen: false, medication: null });
  const [ingressModal, setIngressModal] = useState({ isOpen: false, ingress: null, preselectedMedId: null });
  const [dispenseModal, setDispenseModal] = useState({ isOpen: false, dispensation: null, preselectedMedId: null });

  // Universal Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    warningText: '',
    confirmText: '',
    isDanger: true,
    icon: 'trash',
    itemName: '',
    itemId: '',
    onConfirm: null
  });

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
      if (selectedCategory !== 'all' && med.category !== selectedCategory) {
        return false;
      }
      if (selectedStockFilter === 'low_stock' && med.stock > med.minStock) {
        return false;
      }
      if (selectedStockFilter === 'near_expiry') {
        if (!med.expiryDate) return false;
        const exp = new Date(med.expiryDate);
        if (exp > threeMonthsAhead) return false;
      }
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

  // Filtered Ingresses
  const filteredIngresses = useMemo(() => {
    if (!searchQuery.trim()) return ingresses;
    const q = searchQuery.toLowerCase().trim();
    return ingresses.filter(i =>
      (i.medicationName || '').toLowerCase().includes(q) ||
      (i.batchNumber || '').toLowerCase().includes(q) ||
      (i.supplier || '').toLowerCase().includes(q) ||
      (i.invoiceNumber || '').toLowerCase().includes(q) ||
      (i.receivedBy || '').toLowerCase().includes(q)
    );
  }, [ingresses, searchQuery]);

  // Filtered Dispensations
  const filteredDispensations = useMemo(() => {
    if (!searchQuery.trim()) return dispensations;
    const q = searchQuery.toLowerCase().trim();
    return dispensations.filter(d =>
      (d.patientName || '').toLowerCase().includes(q) ||
      (d.medicationName || '').toLowerCase().includes(q) ||
      (d.prescriptionFolio || '').toLowerCase().includes(q) ||
      (d.prescriberDoctor || '').toLowerCase().includes(q) ||
      (d.dispensedBy || '').toLowerCase().includes(q)
    );
  }, [dispensations, searchQuery]);

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
    const totalDispensationsCount = dispensations.length;
    const totalIngressesCount = ingresses.length;

    return { total, totalUnits, lowStockCount, nearExpiryCount, totalDispensationsCount, totalIngressesCount };
  }, [medications, dispensations, ingresses]);

  // ==========================================
  // HANDLERS: MEDICATIONS CATALOG
  // ==========================================

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

  const handleDeleteMedication = (med) => {
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Delete Medication' : 'Eliminar Medicamento del Catálogo',
      message: language === 'en'
        ? `Are you sure you want to remove "${med.brandName || med.genericName}" from the pharmacy catalog?`
        : `¿Está seguro de que desea eliminar "${med.brandName || med.genericName}" del catálogo de farmacia?`,
      warningText: language === 'en'
        ? `Current stock: ${med.stock} units. This medication will no longer be available for prescription or dispensation.`
        : `Existencia actual: ${med.stock} unidades. Este medicamento ya no estará disponible para recetas o dispensación.`,
      confirmText: language === 'en' ? 'Delete Medication' : 'Eliminar Medicamento',
      isDanger: true,
      icon: 'trash',
      itemName: `${med.genericName} (${med.brandName || med.strength})`,
      itemId: med.code || med.id,
      onConfirm: () => {
        const updated = deleteMedication(med.id);
        setMedications(updated);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast(
            'info',
            language === 'en' ? `Medication ${med.genericName} removed` : `Medicamento ${med.genericName} eliminado correctamente`,
            language === 'en' ? 'Medication Removed' : 'Medicamento Eliminado'
          );
        }
      }
    });
  };

  // ==========================================
  // HANDLERS: STOCK INGRESSES
  // ==========================================

  const handleSaveStockIngress = (ingressData) => {
    const result = saveStockIngress(ingressData);
    setIngresses(result.ingresses);
    setMedications(getMedications()); // Refresh medications stock
    if (addToast) {
      addToast(
        'success',
        language === 'en'
          ? `Stock ingress of ${ingressData.quantity} units registered. Stock updated.`
          : `Entrada de ${ingressData.quantity} unidades registrada con éxito. Inventario actualizado.`,
        language === 'en' ? 'Stock Ingress Registered' : 'Entrada a Almacén Registrada'
      );
    }
  };

  const handleDeleteStockIngress = (ingress) => {
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Cancel / Delete Stock Ingress' : 'Anular Entrada a Almacén',
      message: language === 'en'
        ? `Are you sure you want to cancel the ingress of ${ingress.quantity} units of "${ingress.medicationName}"?`
        : `¿Está seguro de que desea anular la entrada de ${ingress.quantity} unidades de "${ingress.medicationName}"?`,
      warningText: language === 'en'
        ? 'The received units will be deducted from current stock.'
        : 'Las unidades ingresadas serán descontadas del inventario actual.',
      confirmText: language === 'en' ? 'Cancel Ingress' : 'Anular Entrada',
      isDanger: true,
      icon: 'trash',
      itemName: `${ingress.medicationName} - Lote: ${ingress.batchNumber}`,
      itemId: ingress.invoiceNumber || ingress.id,
      onConfirm: () => {
        const updated = deleteStockIngress(ingress.id);
        setIngresses(updated);
        setMedications(getMedications());
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast(
            'info',
            language === 'en' ? 'Stock ingress cancelled and stock reverted.' : 'Entrada de almacén anulada e inventario revertido.',
            language === 'en' ? 'Ingress Cancelled' : 'Entrada Anulada'
          );
        }
      }
    });
  };

  // ==========================================
  // HANDLERS: PATIENT DISPENSATIONS
  // ==========================================

  const handleSavePatientDispensation = (dispenseData) => {
    const result = savePatientDispensation(dispenseData);
    setDispensations(result.dispensations);
    setMedications(getMedications()); // Refresh medications stock
    if (addToast) {
      addToast(
        'success',
        language === 'en'
          ? `${dispenseData.quantity} units dispensed to ${dispenseData.patientName}.`
          : `${dispenseData.quantity} unidades proporcionadas a ${dispenseData.patientName}. Inventario descontado.`,
        language === 'en' ? 'Medication Dispensed' : 'Medicamento Suministrado'
      );
    }
  };

  const handleDeletePatientDispensation = (dispensation) => {
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Cancel Patient Dispensation' : 'Anular Suministro a Paciente',
      message: language === 'en'
        ? `Are you sure you want to cancel the dispensation for "${dispensation.patientName}"?`
        : `¿Está seguro de que desea anular el suministro de medicamento para "${dispensation.patientName}"?`,
      warningText: language === 'en'
        ? `${dispensation.quantity} units will be restored to the pharmacy inventory.`
        : `Se reintegrarán ${dispensation.quantity} unidades al inventario de farmacia.`,
      confirmText: language === 'en' ? 'Cancel Dispensation' : 'Anular Suministro',
      isDanger: true,
      icon: 'trash',
      itemName: `${dispensation.medicationName} (${dispensation.patientName})`,
      itemId: dispensation.prescriptionFolio || dispensation.id,
      onConfirm: () => {
        const updated = deletePatientDispensation(dispensation.id);
        setDispensations(updated);
        setMedications(getMedications());
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast(
            'info',
            language === 'en' ? 'Dispensation cancelled and stock restored.' : 'Suministro anulado y unidades reintegradas al inventario.',
            language === 'en' ? 'Dispensation Cancelled' : 'Suministro Anulado'
          );
        }
      }
    });
  };

  // Reset Demo Data
  const handleReset = () => {
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Reset Pharmacy Data' : 'Restablecer Datos de Farmacia',
      message: language === 'en'
        ? 'Restore default medication catalog, stock ingresses and patient dispensations?'
        : '¿Desea restaurar el catálogo de fármacos, entradas de almacén y dispensaciones a los datos iniciales de demostración?',
      warningText: language === 'en'
        ? 'All customized medications and movements will be reset.'
        : 'Se restaurarán todos los registros modificados o creados recientemente.',
      confirmText: language === 'en' ? 'Reset to Default' : 'Restablecer Farmacia',
      isDanger: false,
      icon: 'reset',
      itemName: language === 'en' ? 'Complete Pharmacy Catalog & Logs' : 'Catálogo Completo y Movimientos de Farmacia',
      itemId: 'SEED-PHARMACY-DEFAULT',
      onConfirm: () => {
        const resetData = resetMedicationsData();
        setMedications(resetData.medications);
        setIngresses(resetData.ingresses);
        setDispensations(resetData.dispensations);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast(
            'success',
            language === 'en' ? 'Pharmacy data restored to default demonstration set.' : 'Datos de farmacia restaurados con éxito.',
            language === 'en' ? 'Pharmacy Reset' : 'Farmacia Restaurada'
          );
        }
      }
    });
  };

  return (
    <div style={{ padding: '1.75rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669'
              }}
            >
              <Pill size={24} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              {language === 'en' ? 'Pharmacy' : 'Farmacia'}
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
            {language === 'en'
              ? 'Catalog control, batch tracking, warehouse stock ingresses, and patient medication dispensations'
              : 'Catálogo clínico de fármacos, control de lotes y caducidades, entradas a almacén y suministro a pacientes'}
          </p>
        </div>

        {/* Action Buttons Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-outline"
            style={{ fontSize: '0.8125rem', gap: '0.35rem', color: '#64748b', borderColor: '#cbd5e1' }}
          >
            <RotateCcw size={14} />
            <span>{language === 'en' ? 'Reset Demo Data' : 'Restablecer Demo'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIngressModal({ isOpen: true, ingress: null, preselectedMedId: null })}
            className="btn btn-outline"
            style={{ borderColor: '#059669', color: '#059669', backgroundColor: '#f0fdf4', gap: '0.4rem', fontSize: '0.8125rem', fontWeight: 700 }}
          >
            <PackagePlus size={15} />
            <span>{language === 'en' ? '+ Stock Ingress' : '+ Entrada a Almacén'}</span>
          </button>

          <button
            type="button"
            onClick={() => setDispenseModal({ isOpen: true, dispensation: null, preselectedMedId: null })}
            className="btn btn-outline"
            style={{ borderColor: '#2563eb', color: '#2563eb', backgroundColor: '#eff6ff', gap: '0.4rem', fontSize: '0.8125rem', fontWeight: 700 }}
          >
            <Send size={15} />
            <span>{language === 'en' ? '+ Dispense to Patient' : '+ Suministrar a Paciente'}</span>
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
          onClick={() => { setActiveTab('catalog'); setSelectedStockFilter('all'); }}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
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
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 600 }}>
              {language === 'en' ? 'Medications in Catalog' : 'Fármacos en Catálogo'}
            </div>
          </div>
        </div>

        {/* Total Units Stock */}
        <div
          onClick={() => { setActiveTab('catalog'); setSelectedStockFilter('all'); }}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Boxes size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {stats.totalUnits.toLocaleString('es-MX')}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 600 }}>
              {language === 'en' ? 'Total Units in Stock' : 'Unidades Totales en Existencia'}
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => { setActiveTab('catalog'); setSelectedStockFilter('low_stock'); }}
          style={{
            backgroundColor: stats.lowStockCount > 0 ? '#fffbeb' : '#ffffff',
            borderRadius: '0.75rem',
            border: stats.lowStockCount > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: stats.lowStockCount > 0 ? '#fef3c7' : '#f8fafc',
              border: stats.lowStockCount > 0 ? '1px solid #fcd34d' : '1px solid #e2e8f0',
              color: stats.lowStockCount > 0 ? '#b45309' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stats.lowStockCount > 0 ? '#b45309' : '#0f172a', lineHeight: 1 }}>
              {stats.lowStockCount}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 600 }}>
              {language === 'en' ? 'Low Stock Warning' : 'Alerta Stock Bajo'}
            </div>
          </div>
        </div>

        {/* Patient Dispensations Count */}
        <div
          onClick={() => setActiveTab('dispensations')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.15rem 1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Send size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {stats.totalDispensationsCount}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 600 }}>
              {language === 'en' ? 'Dispensations Recorded' : 'Suministros a Pacientes'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          style={{
            padding: '0.75rem 1.25rem',
            fontSize: '0.9375rem',
            fontWeight: 700,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'catalog' ? '#0f766e' : '#64748b',
            borderBottom: activeTab === 'catalog' ? '3px solid #0f766e' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Layers size={18} />
          <span>{language === 'en' ? 'Medications & Stock' : 'Catálogo de Fármacos & Existencias'}</span>
          <span style={{ fontSize: '0.75rem', backgroundColor: activeTab === 'catalog' ? '#ccfbf1' : '#f1f5f9', color: activeTab === 'catalog' ? '#0f766e' : '#64748b', padding: '2px 7px', borderRadius: '9999px', fontWeight: 800 }}>
            {medications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ingresses')}
          style={{
            padding: '0.75rem 1.25rem',
            fontSize: '0.9375rem',
            fontWeight: 700,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'ingresses' ? '#0f766e' : '#64748b',
            borderBottom: activeTab === 'ingresses' ? '3px solid #0f766e' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <PackagePlus size={18} />
          <span>{language === 'en' ? 'Stock Ingresses (Purchases)' : 'Entradas de Almacén (Compras)'}</span>
          <span style={{ fontSize: '0.75rem', backgroundColor: activeTab === 'ingresses' ? '#ccfbf1' : '#f1f5f9', color: activeTab === 'ingresses' ? '#0f766e' : '#64748b', padding: '2px 7px', borderRadius: '9999px', fontWeight: 800 }}>
            {ingresses.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dispensations')}
          style={{
            padding: '0.75rem 1.25rem',
            fontSize: '0.9375rem',
            fontWeight: 700,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'dispensations' ? '#0f766e' : '#64748b',
            borderBottom: activeTab === 'dispensations' ? '3px solid #0f766e' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Send size={18} />
          <span>{language === 'en' ? 'Patient Dispensations' : 'Dispensación a Pacientes (Suministro)'}</span>
          <span style={{ fontSize: '0.75rem', backgroundColor: activeTab === 'dispensations' ? '#ccfbf1' : '#f1f5f9', color: activeTab === 'dispensations' ? '#0f766e' : '#64748b', padding: '2px 7px', borderRadius: '9999px', fontWeight: 800 }}>
            {dispensations.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'catalog'
                ? (language === 'en' ? 'Search medication, brand, ATC code, batch, location...' : 'Buscar fármaco, marca, código SSA, lote, ubicación...')
                : activeTab === 'ingresses'
                ? (language === 'en' ? 'Search by supplier, invoice, batch or medication...' : 'Buscar por proveedor, factura, lote o medicamento...')
                : (language === 'en' ? 'Search by patient, prescription folio, doctor or drug...' : 'Buscar por paciente, folio de receta, médico o fármaco...')
            }
            className="form-control"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>

        {activeTab === 'catalog' && (
          <>
            {/* Category Filter */}
            <div style={{ minWidth: '200px' }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-control"
                style={{ width: '100%' }}
              >
                <option value="all">{language === 'en' ? 'All Categories' : 'Todas las Categorías'}</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Stock / Expiry Filter */}
            <div style={{ minWidth: '180px' }}>
              <select
                value={selectedStockFilter}
                onChange={(e) => setSelectedStockFilter(e.target.value)}
                className="form-control"
                style={{ width: '100%' }}
              >
                <option value="all">{language === 'en' ? 'All Stock Status' : 'Todos los Estados'}</option>
                <option value="low_stock">{language === 'en' ? '⚠️ Low Stock Warning' : '⚠️ Stock Bajo (Reorden)'}</option>
                <option value="near_expiry">{language === 'en' ? '⏳ Near Expiry (< 3 mo)' : '⏳ Próximos a Vencer (< 3 m)'}</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CATALOG & INVENTORY TABLE */}
      {/* ========================================================= */}
      {activeTab === 'catalog' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'en' ? 'Medication / Formula' : 'Fármaco / Fórmula'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'en' ? 'Category & Route' : 'Categoría & Vía'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'en' ? 'Stock Level' : 'Existencias'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'en' ? 'Batch & Expiry' : 'Lote & Caducidad'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'en' ? 'Location / Cold Chain' : 'Ubicación / Temp.'}
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    {language === 'en' ? 'Actions' : 'Acciones'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMedications.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                      <Pill size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>
                        {language === 'en' ? 'No medications found matching the filters.' : 'No se encontraron medicamentos con los filtros seleccionados.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredMedications.map((med, idx) => {
                    const isLowStock = (med.stock || 0) <= (med.minStock || 10);
                    const isOutOfStock = (med.stock || 0) <= 0;

                    return (
                      <tr
                        key={med.id}
                        style={{
                          borderBottom: idx === filteredMedications.length - 1 ? 'none' : '1px solid #f1f5f9',
                          transition: 'background-color 0.12s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* 1. Medication & Presentation */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                backgroundColor: isOutOfStock ? '#fee2e2' : isLowStock ? '#fef3c7' : '#f0fdf4',
                                color: isOutOfStock ? '#ef4444' : isLowStock ? '#d97706' : '#16a34a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginTop: '2px'
                              }}
                            >
                              <Pill size={18} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a' }}>
                                {med.genericName}
                              </div>
                              <div style={{ fontSize: '0.8125rem', color: '#0f766e', fontWeight: 700 }}>
                                {med.brandName} • {med.strength}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                {med.presentation} [{med.dosageForm}]
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Category & Route */}
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
                            {med.category || 'General'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {language === 'en' ? 'Route:' : 'Vía:'} {med.route}
                          </div>
                          {med.requiresPrescription && (
                            <span style={{ fontSize: '0.6875rem', color: '#b45309', backgroundColor: '#fef3c7', padding: '1px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '3px', fontWeight: 700 }}>
                              {language === 'en' ? 'Rx Required' : 'Requiere Receta'}
                            </span>
                          )}
                        </td>

                        {/* 3. Stock Level */}
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                fontSize: '1.05rem',
                                fontWeight: 800,
                                color: isOutOfStock ? '#ef4444' : isLowStock ? '#d97706' : '#059669'
                              }}
                            >
                              {med.stock} {language === 'en' ? 'units' : 'unidades'}
                            </span>
                            {isLowStock && (
                              <span style={{ fontSize: '0.6875rem', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px' }}>
                                {isOutOfStock ? (language === 'en' ? 'Out of stock' : 'Agotado') : (language === 'en' ? 'Low stock' : 'Stock bajo')}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                            {language === 'en' ? 'Min:' : 'Mín:'} {med.minStock} | {language === 'en' ? 'Max:' : 'Máx:'} {med.maxStock}
                          </div>
                        </td>

                        {/* 4. Batch & Expiry */}
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
                            {med.batchNumber || 'N/A'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {language === 'en' ? 'Exp:' : 'Cad:'} {med.expiryDate || 'N/A'}
                          </div>
                        </td>

                        {/* 5. Location / Cold Chain */}
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 600 }}>
                            {med.storageLocation || 'Farmacia Central'}
                          </div>
                          {med.storageTemp && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                              <Thermometer size={12} color="#0284c7" />
                              <span>{med.storageTemp}</span>
                            </div>
                          )}
                        </td>

                        {/* 6. Action Buttons */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                            {/* Ingress button */}
                            <button
                              type="button"
                              onClick={() => setIngressModal({ isOpen: true, ingress: null, preselectedMedId: med.id })}
                              className="btn btn-sm"
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: '#f0fdf4',
                                color: '#16a34a',
                                border: '1px solid #bbf7d0',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                cursor: 'pointer'
                              }}
                              title={language === 'en' ? 'Add Stock Ingress' : 'Registrar Entrada de Stock'}
                            >
                              <PackagePlus size={13} />
                              <span>{language === 'en' ? '+ Ingress' : '+ Entrada'}</span>
                            </button>

                            {/* Dispense button */}
                            <button
                              type="button"
                              onClick={() => setDispenseModal({ isOpen: true, dispensation: null, preselectedMedId: med.id })}
                              className="btn btn-sm"
                              disabled={med.stock <= 0}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: med.stock <= 0 ? '#f1f5f9' : '#eff6ff',
                                color: med.stock <= 0 ? '#94a3b8' : '#2563eb',
                                border: med.stock <= 0 ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                cursor: med.stock <= 0 ? 'not-allowed' : 'pointer'
                              }}
                              title={language === 'en' ? 'Dispense to Patient' : 'Dispensar a Paciente'}
                            >
                              <Send size={13} />
                              <span>{language === 'en' ? 'Dispense' : 'Suministrar'}</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => setMedModal({ isOpen: true, medication: med })}
                              className="btn-icon"
                              style={{ padding: '6px', borderRadius: '6px', color: '#64748b', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title={language === 'en' ? 'Edit medication' : 'Editar medicamento'}
                            >
                              <Edit3 size={15} />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteMedication(med)}
                              className="btn-icon text-danger"
                              style={{ padding: '6px', borderRadius: '6px', color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title={language === 'en' ? 'Delete medication' : 'Eliminar medicamento'}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: STOCK INGRESSES TABLE (ENTRADAS DE ALMACÉN) */}
      {/* ========================================================= */}
      {activeTab === 'ingresses' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PackagePlus size={18} color="#059669" />
              <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a' }}>
                {language === 'en' ? 'Stock Reception & Purchase Log' : 'Registro de Entradas y Recepción de Lotes'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIngressModal({ isOpen: true, ingress: null, preselectedMedId: null })}
              className="btn btn-primary btn-sm"
              style={{ backgroundColor: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Plus size={14} />
              <span>{language === 'en' ? 'Register Ingress' : 'Registrar Entrada'}</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'en' ? 'Receipt Date' : 'Fecha Recepción'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'en' ? 'Medication & Lot' : 'Fármaco & Lote'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'en' ? 'Quantity & Cost' : 'Cantidad & Costo'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'en' ? 'Supplier & Invoice' : 'Proveedor & Factura'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'en' ? 'Received By / Location' : 'Receptor / Ubicación'}
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    {language === 'en' ? 'Actions' : 'Acciones'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredIngresses.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                      <PackagePlus size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>
                        {language === 'en' ? 'No stock ingresses registered yet.' : 'No hay entradas de almacén registradas.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredIngresses.map((ing, idx) => (
                    <tr
                      key={ing.id}
                      style={{
                        borderBottom: idx === filteredIngresses.length - 1 ? 'none' : '1px solid #f1f5f9',
                        transition: 'background-color 0.12s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.8125rem', color: '#0f172a', fontWeight: 700 }}>
                        {ing.receiptDate}
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                          {ing.medicationName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                          Lote: {ing.batchNumber} • Cad: {ing.expiryDate || 'N/A'}
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#059669' }}>
                          +{ing.quantity} {language === 'en' ? 'units' : 'unidades'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          ${Number(ing.totalCost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN (${ing.unitCost}/u)
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
                          {ing.supplier}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {ing.invoiceNumber || 'S/N'}
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 600 }}>
                          {ing.receivedBy || 'Farmacia Central'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {ing.storageLocation || 'Estante Principal'}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => setIngressModal({ isOpen: true, ingress: ing, preselectedMedId: ing.medicationId })}
                            className="btn-icon"
                            style={{ padding: '6px', borderRadius: '6px', color: '#64748b', border: 'none', background: 'transparent', cursor: 'pointer' }}
                            title={language === 'en' ? 'Edit ingress' : 'Editar entrada'}
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStockIngress(ing)}
                            className="btn-icon text-danger"
                            style={{ padding: '6px', borderRadius: '6px', color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}
                            title={language === 'en' ? 'Cancel ingress' : 'Anular entrada'}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PATIENT DISPENSATIONS TABLE */}
      {/* ========================================================= */}
      {activeTab === 'dispensations' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={18} color="#2563eb" />
              <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a' }}>
                {language === 'en' ? 'Patient Prescription Dispensation Log' : 'Registro de Suministro y Dispensación a Pacientes'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDispenseModal({ isOpen: true, dispensation: null, preselectedMedId: null })}
              className="btn btn-primary btn-sm"
              style={{ backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Plus size={14} />
              <span>{language === 'en' ? 'Dispense Medication' : 'Suministrar Medicamento'}</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'en' ? 'Date & Time' : 'Fecha & Hora'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'en' ? 'Patient Receptor' : 'Paciente Receptor'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'en' ? 'Medication & Dosage' : 'Fármaco & Posología'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'en' ? 'Prescription / Doctor' : 'Receta / Médico'}
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'en' ? 'Dispensed By / Status' : 'Despachado Por / Estado'}
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    {language === 'en' ? 'Actions' : 'Acciones'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDispensations.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                      <Send size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>
                        {language === 'en' ? 'No patient dispensations recorded yet.' : 'No hay dispensaciones registradas a pacientes.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredDispensations.map((disp, idx) => (
                    <tr
                      key={disp.id}
                      style={{
                        borderBottom: idx === filteredDispensations.length - 1 ? 'none' : '1px solid #f1f5f9',
                        transition: 'background-color 0.12s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.8125rem', color: '#0f172a', fontWeight: 700 }}>
                        <div>{disp.dispenseDate}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{disp.dispenseTime}</div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                          {disp.patientName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, marginTop: '2px' }}>
                          Exp: {disp.patientIdentifier || 'CLI-ACTUAL'}
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                            {disp.medicationName}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: '4px' }}>
                            {disp.quantity} {language === 'en' ? 'u' : 'unidades'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          {disp.dosageInstructions || 'Conforme a indicación médica'}
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
                          {disp.prescriberDoctor}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 600 }}>
                          {disp.prescriptionFolio}
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 600 }}>
                          {disp.dispensedBy || 'Farmacia Central'}
                        </div>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '3px' }}>
                          {language === 'en' ? '✓ Completed' : '✓ Entregado al Paciente'}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => setDispenseModal({ isOpen: true, dispensation: disp, preselectedMedId: disp.medicationId })}
                            className="btn-icon"
                            style={{ padding: '6px', borderRadius: '6px', color: '#64748b', border: 'none', background: 'transparent', cursor: 'pointer' }}
                            title={language === 'en' ? 'Edit dispensation' : 'Editar suministro'}
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeletePatientDispensation(disp)}
                            className="btn-icon text-danger"
                            style={{ padding: '6px', borderRadius: '6px', color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}
                            title={language === 'en' ? 'Cancel dispensation' : 'Anular suministro'}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* 1. Medication Catalog Modal */}
      <MedicationModal
        isOpen={medModal.isOpen}
        onClose={() => setMedModal({ isOpen: false, medication: null })}
        medicationToEdit={medModal.medication}
        onSaveMedication={handleSaveMedication}
      />

      {/* 2. Stock Ingress Modal */}
      <StockIngressModal
        isOpen={ingressModal.isOpen}
        onClose={() => setIngressModal({ isOpen: false, ingress: null, preselectedMedId: null })}
        ingressToEdit={ingressModal.ingress}
        onSave={handleSaveStockIngress}
        medications={medications}
        preselectedMedicationId={ingressModal.preselectedMedId}
      />

      {/* 3. Patient Dispensation Modal */}
      <PatientDispenseModal
        isOpen={dispenseModal.isOpen}
        onClose={() => setDispenseModal({ isOpen: false, dispensation: null, preselectedMedId: null })}
        dispensationToEdit={dispenseModal.dispensation}
        onSave={handleSavePatientDispensation}
        medications={medications}
        preselectedMedicationId={dispenseModal.preselectedMedId}
      />

      {/* 4. Universal Delete / Reset Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        warningText={confirmModal.warningText}
        confirmText={confirmModal.confirmText}
        isDanger={confirmModal.isDanger}
        icon={confirmModal.icon}
        itemName={confirmModal.itemName}
        itemId={confirmModal.itemId}
      />
    </div>
  );
}
