import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pill,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Clock,
  Send
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getMedications, loadMedicationsFromFhir } from '../../utils/medicationInventoryStorage';
import { getClinicMedicationRequests } from '../../services/fhirApi';

export default function PharmacistHomeDashboard({ addToast }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { currentUser } = useAuth();

  const [inventory, setInventory] = useState(() => getMedications());
  const [prescriptionsQueue, setPrescriptionsQueue] = useState([]);

  useEffect(() => {
    loadMedicationsFromFhir().then(setInventory).catch(() => {});
    getClinicMedicationRequests()
      .then((requests) => {
        setPrescriptionsQueue((requests || []).map((req) => ({
          id: req.id,
          patientName: req.subject?.display || '',
          doctor: req.requester?.display || '',
          medications: [
            req.medicationCodeableConcept?.text
            || req.medicationCodeableConcept?.coding?.[0]?.display
            || req.medicationReference?.display
            || ''
          ].filter(Boolean),
          status: req.status === 'completed' || req.status === 'cancelled' ? 'dispensed' : 'pending',
          urgency: req.priority === 'urgent' || req.priority === 'stat' ? 'Prioritaria' : 'Normal',
          time: (req.authoredOn || '').slice(11, 16)
        })));
      })
      .catch(() => setPrescriptionsQueue([]));
  }, []);

  const handleDispense = (id) => {
    setPrescriptionsQueue(prev => prev.map(p => p.id === id ? { ...p, status: 'dispensed' } : p));
    if (addToast) {
      addToast('success', 'Receta surtida y descontada del inventario de farmacia', 'Farmacia');
    }
  };

  const lowStockCount = inventory.filter(m => (m.stock ?? m.currentStock ?? 0) <= (m.minStock || 10)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Farmacia Hospitalaria & Dispensario
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 500 }}>
            Dispensación de recetas digitales, control de lotes y existencias de medicamentos
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/recetas')}
          className="btn btn-primary"
          style={{ backgroundColor: '#059669', gap: '0.35rem', fontSize: '0.8125rem' }}
        >
          <FileText size={15} />
          <span>Ver Recetas FHIR</span>
        </button>
      </div>

      {/* 4 Pharmacy KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Recetas por surtir</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>6</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pill size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Despachados hoy</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>42</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Stock bajo / Reorden</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>{lowStockCount}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Lotes próximos a vencer</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>2</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)', gap: '1.5rem' }}>
        {/* Left: Dispensing queue */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
            Cola de Dispensación de Recetas
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {prescriptionsQueue.map((rx) => (
              <div key={rx.id} style={{ backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{rx.patientName}</span>
                    <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: '9999px', backgroundColor: rx.urgency === 'Prioritaria' ? '#fff1f2' : '#f1f5f9', color: rx.urgency === 'Prioritaria' ? '#e11d48' : '#475569', fontWeight: 700 }}>
                      {rx.urgency}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Médico: {rx.doctor} • Emitida: {rx.time}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600, marginTop: '4px' }}>
                    {rx.medications.join(' • ')}
                  </div>
                </div>

                <div>
                  {rx.status !== 'dispensed' ? (
                    <button
                      type="button"
                      onClick={() => handleDispense(rx.id)}
                      className="btn btn-primary btn-sm"
                      style={{ backgroundColor: '#059669', fontSize: '0.75rem' }}
                    >
                      <CheckCircle2 size={13} />
                      <span>Surtir Receta</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={15} />
                      <span>Surtida</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Quick Inventory link */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            Alertas de Inventario
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#fff1f2', borderRadius: '0.5rem', border: '1px solid #fecdd3', fontSize: '0.78rem', color: '#9f1239' }}>
              ⚠️ <strong>Salbutamol 100mcg:</strong> Quedan 8 frascos en stock (Mínimo: 15).
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#fff1f2', borderRadius: '0.5rem', border: '1px solid #fecdd3', fontSize: '0.78rem', color: '#9f1239' }}>
              ⚠️ <strong>Losartán 50mg:</strong> Quedan 12 cajas en stock (Mínimo: 20).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
