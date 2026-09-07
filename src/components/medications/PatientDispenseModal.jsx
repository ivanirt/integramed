import React, { useState, useEffect } from 'react';
import {
  X,
  Pill,
  User,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getPatients } from '../../services/fhirApi';
import { getPatientFullName, calculateAge, getPatientIdentifier } from '../../utils/fhirHelper';

export default function PatientDispenseModal({
  isOpen,
  onClose,
  onSave,
  dispensationToEdit = null,
  medications = [],
  preselectedMedicationId = null
}) {
  const { language, t } = useLanguage();

  const [patients, setPatients] = useState([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    patientId: '',
    patientName: '',
    patientIdentifier: '',
    medicationId: '',
    medicationName: '',
    quantity: 1,
    dosageInstructions: '',
    prescriberDoctor: 'Dra. María Elena Rostro',
    prescriptionFolio: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    dispenseDate: new Date().toISOString().split('T')[0],
    dispenseTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'completed',
    dispensedBy: 'Enf. Lluvia Robledo',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  // Load patients list from FHIR
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingPatients(true);
    getPatients()
      .then(res => {
        if (!isMounted) return;
        setPatients(res.patients || []);
      })
      .catch(err => {
        console.warn('Error fetching patients for dispense modal', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPatients(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Initialize or edit
  useEffect(() => {
    if (dispensationToEdit) {
      setFormData({
        ...dispensationToEdit,
        quantity: dispensationToEdit.quantity || 1
      });
    } else {
      const defaultMed = preselectedMedicationId
        ? medications.find(m => m.id === preselectedMedicationId)
        : medications[0];

      setFormData({
        id: '',
        patientId: '',
        patientName: '',
        patientIdentifier: '',
        medicationId: defaultMed ? defaultMed.id : '',
        medicationName: defaultMed ? `${defaultMed.genericName} (${defaultMed.brandName || defaultMed.strength})` : '',
        quantity: 1,
        dosageInstructions: '1 tableta / dosis cada 12 horas por 7 días',
        prescriberDoctor: 'Dra. María Elena Rostro',
        prescriptionFolio: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        dispenseDate: new Date().toISOString().split('T')[0],
        dispenseTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'completed',
        dispensedBy: 'Enf. Lluvia Robledo',
        notes: ''
      });
    }
    setErrors({});
  }, [dispensationToEdit, preselectedMedicationId, medications, isOpen]);

  if (!isOpen) return null;

  const selectedMed = medications.find(m => m.id === formData.medicationId);
  const currentStock = selectedMed?.stock ?? 0;

  const handlePatientChange = (patientId) => {
    const p = patients.find(pat => pat.id === patientId);
    if (p) {
      setFormData(prev => ({
        ...prev,
        patientId: p.id,
        patientName: getPatientFullName(p),
        patientIdentifier: getPatientIdentifier(p) || p.id
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        patientId: '',
        patientName: '',
        patientIdentifier: ''
      }));
    }
  };

  const handleMedicationChange = (medId) => {
    const found = medications.find(m => m.id === medId);
    if (found) {
      setFormData(prev => ({
        ...prev,
        medicationId: found.id,
        medicationName: `${found.genericName} (${found.brandName || found.strength})`
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.patientId && !formData.patientName?.trim()) {
      newErrors.patientId = language === 'en' ? 'Select a patient' : 'Selecciona un paciente receptor';
    }
    if (!formData.medicationId) {
      newErrors.medicationId = language === 'en' ? 'Select a medication' : 'Selecciona un medicamento a dispensar';
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      newErrors.quantity = language === 'en' ? 'Quantity must be at least 1' : 'La cantidad debe ser al menos 1';
    } else if (Number(formData.quantity) > currentStock && !dispensationToEdit) {
      newErrors.quantity = language === 'en'
        ? `Insufficient stock (${currentStock} available)`
        : `Existencias insuficientes (${currentStock} disponibles)`;
    }
    if (!formData.prescriberDoctor?.trim()) {
      newErrors.prescriberDoctor = language === 'en' ? 'Prescribing doctor is required' : 'El médico prescriptor es requerido';
    }
    if (!formData.prescriptionFolio?.trim()) {
      newErrors.prescriptionFolio = language === 'en' ? 'Prescription folio is required' : 'El folio de receta es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      ...formData,
      quantity: Number(formData.quantity)
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
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}
            >
              <Pill size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {dispensationToEdit
                  ? (language === 'en' ? 'Edit Patient Dispensation' : 'Editar Suministro a Paciente')
                  : (language === 'en' ? 'Dispense Medication to Patient' : 'Dispensar / Proporcionar Medicamento a Paciente')}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                {language === 'en'
                  ? 'Record clinical prescription dispensation, patient verification, and real-time inventory deduction'
                  : 'Registra la entrega de fármacos a pacientes, receta médica y descuento automático de inventario'}
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
          {/* Patient Selection */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
              <User size={14} color="#2563eb" />
              <span>{language === 'en' ? 'Patient (Clinical Record) *' : 'Paciente Receptor (Expediente Clínico) *'}</span>
            </label>
            <select
              value={formData.patientId}
              onChange={(e) => handlePatientChange(e.target.value)}
              className="form-control"
              style={{ width: '100%', borderColor: errors.patientId ? '#ef4444' : '#cbd5e1' }}
            >
              <option value="">{isLoadingPatients ? (language === 'en' ? 'Loading patients...' : 'Cargando pacientes...') : (language === 'en' ? '-- Select Patient --' : '-- Seleccionar Paciente --')}</option>
              {patients.map(p => {
                const name = getPatientFullName(p);
                const age = calculateAge(p.birthDate);
                const id = getPatientIdentifier(p);
                return (
                  <option key={p.id} value={p.id}>
                    {name} ({age} {language === 'en' ? 'yrs' : 'años'}) - ID: {id}
                  </option>
                );
              })}
            </select>
            {errors.patientId && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>{errors.patientId}</span>}
          </div>

          {/* Medication Selection & Stock Badge */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                {language === 'en' ? 'Medication to Provide *' : 'Medicamento a Proporcionar *'}
              </label>
              {selectedMed && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: currentStock > selectedMed.minStock ? '#ecfdf5' : currentStock > 0 ? '#fef3c7' : '#fee2e2',
                    color: currentStock > selectedMed.minStock ? '#047857' : currentStock > 0 ? '#b45309' : '#b91c1c'
                  }}
                >
                  {language === 'en' ? 'Available Stock:' : 'Existencias Disponibles:'} {currentStock} {language === 'en' ? 'units' : 'unidades'}
                </span>
              )}
            </div>
            <select
              value={formData.medicationId}
              onChange={(e) => handleMedicationChange(e.target.value)}
              className="form-control"
              style={{ width: '100%', borderColor: errors.medicationId ? '#ef4444' : '#cbd5e1' }}
            >
              <option value="">{language === 'en' ? '-- Select Medication --' : '-- Seleccionar Medicamento --'}</option>
              {medications.map(m => (
                <option key={m.id} value={m.id} disabled={m.stock <= 0}>
                  {m.genericName} {m.brandName ? `(${m.brandName})` : ''} - {m.strength} [{m.presentation}] ({language === 'en' ? 'Stock' : 'Existencias'}: {m.stock}) {m.stock <= 0 ? (language === 'en' ? '[OUT OF STOCK]' : '[AGOTADO]') : ''}
                </option>
              ))}
            </select>
            {errors.medicationId && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>{errors.medicationId}</span>}
          </div>

          {/* 2-Column: Quantity & Prescription Folio */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                {language === 'en' ? 'Quantity to Dispense (Units) *' : 'Cantidad a Entregar (Unidades) *'}
              </label>
              <input
                type="number"
                min="1"
                max={currentStock || 100}
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                className="form-control"
                style={{ width: '100%', borderColor: errors.quantity ? '#ef4444' : '#cbd5e1' }}
              />
              {errors.quantity && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>{errors.quantity}</span>}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                <FileText size={14} color="#2563eb" />
                <span>{language === 'en' ? 'Prescription / Encounter Folio *' : 'Folio de Receta / Consulta *'}</span>
              </label>
              <input
                type="text"
                value={formData.prescriptionFolio}
                onChange={(e) => setFormData(prev => ({ ...prev, prescriptionFolio: e.target.value }))}
                placeholder="ej. REC-2026-0942"
                className="form-control"
                style={{ width: '100%', borderColor: errors.prescriptionFolio ? '#ef4444' : '#cbd5e1' }}
              />
              {errors.prescriptionFolio && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>{errors.prescriptionFolio}</span>}
            </div>
          </div>

          {/* Dosage Instructions */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
              {language === 'en' ? 'Dosage & Clinical Instructions' : 'Posología e Indicaciones Clínicas al Paciente'}
            </label>
            <input
              type="text"
              value={formData.dosageInstructions}
              onChange={(e) => setFormData(prev => ({ ...prev, dosageInstructions: e.target.value }))}
              placeholder="ej. Tomar 1 tableta cada 8 horas con alimentos por 7 días"
              className="form-control"
              style={{ width: '100%' }}
            />
          </div>

          {/* 2-Column: Prescribing Doctor & Dispenser Staff */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                <Stethoscope size={14} color="#2563eb" />
                <span>{language === 'en' ? 'Prescribing Doctor *' : 'Médico Prescriptor *'}</span>
              </label>
              <input
                type="text"
                value={formData.prescriberDoctor}
                onChange={(e) => setFormData(prev => ({ ...prev, prescriberDoctor: e.target.value }))}
                placeholder="ej. Dra. María Elena Rostro"
                className="form-control"
                style={{ width: '100%', borderColor: errors.prescriberDoctor ? '#ef4444' : '#cbd5e1' }}
              />
              {errors.prescriberDoctor && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>{errors.prescriberDoctor}</span>}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                <User size={14} color="#64748b" />
                <span>{language === 'en' ? 'Dispensed By (Pharmacy Staff)' : 'Entregado Por (Farmacia / Enfermería)'}</span>
              </label>
              <input
                type="text"
                value={formData.dispensedBy}
                onChange={(e) => setFormData(prev => ({ ...prev, dispensedBy: e.target.value }))}
                className="form-control"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* 2-Column: Date & Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                <Calendar size={14} color="#64748b" />
                <span>{language === 'en' ? 'Dispense Date' : 'Fecha de Entrega'}</span>
              </label>
              <input
                type="date"
                value={formData.dispenseDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dispenseDate: e.target.value }))}
                className="form-control"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                <Clock size={14} color="#64748b" />
                <span>{language === 'en' ? 'Dispense Time' : 'Hora'}</span>
              </label>
              <input
                type="time"
                value={formData.dispenseTime}
                onChange={(e) => setFormData(prev => ({ ...prev, dispenseTime: e.target.value }))}
                className="form-control"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Notes / Special Instructions */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
              {language === 'en' ? 'Observations & Warnings' : 'Observaciones, Advertencias o Sellos de Control'}
            </label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={language === 'en' ? 'e.g. Original prescription retained, patient educated on side effects...' : 'ej. Receta original sellada y archivada, se explicaron posibles reacciones adversas...'}
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
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{dispensationToEdit ? (language === 'en' ? 'Save Changes' : 'Guardar Cambios') : (language === 'en' ? 'Confirm Dispensation' : 'Confirmar Entrega a Paciente')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
