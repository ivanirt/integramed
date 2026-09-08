import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  Activity,
  UserCheck,
  Pill,
  Clock,
  ShieldCheck,
  Thermometer,
  Stethoscope,
  Plus,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Droplet
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export default function NurseHomeDashboard({ addToast }) {
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const { currentUser } = useAuth();

  // Triage & Nursing queue
  const [triageQueue, setTriageQueue] = useState([
    {
      id: 'triage-1',
      patientName: 'Elena Gómez Morales',
      age: 42,
      gender: 'F',
      timeWaiting: '8 min',
      triageLevel: 'Nivel 3 - Urgencia Menor',
      triageColor: '#d97706',
      triageBg: '#fef3c7',
      chiefComplaint: 'Cefalea intensa con náuseas y presión arterial elevada.',
      vitalsRecorded: false
    },
    {
      id: 'triage-2',
      patientName: 'Luis Hernández Soto',
      age: 29,
      gender: 'M',
      timeWaiting: '14 min',
      triageLevel: 'Nivel 4 - No Urgente',
      triageColor: '#0284c7',
      triageBg: '#e0f2fe',
      chiefComplaint: 'Curación post-quirúrgica de herida en extremidad inferior.',
      vitalsRecorded: true,
      lastVitals: 'PA 120/75 • FC 70 • SpO2 99%'
    },
    {
      id: 'triage-3',
      patientName: 'María Fernanda Ruiz',
      age: 65,
      gender: 'F',
      timeWaiting: '3 min',
      triageLevel: 'Nivel 2 - Urgencia Calificada',
      triageColor: '#e11d48',
      triageBg: '#fff1f2',
      chiefComplaint: 'Dificultad respiratoria leve y antecedente de EPOC.',
      vitalsRecorded: false
    }
  ]);

  const [medAdministrations, setMedAdministrations] = useState([
    { id: 'adm-1', patient: 'Elena Gómez', med: 'Ketorolaco 30mg IV', time: '10:00 AM', room: 'Cama 02 - Observación', status: 'pending' },
    { id: 'adm-2', patient: 'Carlos Mendoza', med: 'Solución Fisiológica 0.9% 500ml', time: '10:30 AM', room: 'Sillón Infusión 1', status: 'pending' },
    { id: 'adm-3', patient: 'Luis Hernández', med: 'Curación con apósito estéril', time: '11:00 AM', room: 'Cubículo Curaciones', status: 'completed' }
  ]);

  const handleAdministerMed = (id) => {
    setMedAdministrations(prev => prev.map(m => m.id === id ? { ...m, status: 'completed' } : m));
    if (addToast) {
      addToast('success', 'Medicamento registrado como administrado correctamente', 'Enfermería');
    }
  };

  const name = currentUser?.givenName ? `${currentUser.givenName} ${currentUser.familyName || ''}`.trim() : 'Carmen Saldaña';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Estación de Enfermería • Enf. {name}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 500 }}>
            Supervisión de Triage, Somatometría, Administración de Fármacos y Procedimientos Clínicos
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/consulta')}
          className="btn btn-primary"
          style={{ backgroundColor: '#e11d48', gap: '0.4rem', fontSize: '0.8125rem' }}
        >
          <Activity size={15} />
          <span>Registrar Somatometría</span>
        </button>
      </div>

      {/* 4 Nursing KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HeartPulse size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Pacientes en Triage</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>4</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Thermometer size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Signos por registrar</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>6</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pill size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Fármacos por aplicar</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>8</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Curaciones del Turno</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>3</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Triage Queue (Left) + Administrations (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)', gap: '1.5rem' }}>
        {/* Left: Triage & Vitals Queue */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Cola de Triage y Signos Vitales
            </h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#ffe4e6', color: '#e11d48', padding: '2px 8px', borderRadius: '9999px' }}>
              3 en espera
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {triageQueue.map((item) => (
              <div key={item.id} style={{ backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{item.patientName}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 7px', borderRadius: '9999px', backgroundColor: item.triageBg, color: item.triageColor }}>
                      {item.triageLevel}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    {item.gender} • {item.age} años • Esperando {item.timeWaiting}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '4px' }}>
                    {item.chiefComplaint}
                  </div>
                  {item.lastVitals && (
                    <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, marginTop: '3px' }}>
                      ✓ {item.lastVitals}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/consulta')}
                  className="btn btn-primary btn-sm"
                  style={{ backgroundColor: '#0f766e', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                >
                  {item.vitalsRecorded ? 'Actualizar Signos' : 'Tomar Signos'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Administrations of shift */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            Medicamentos por Administrar
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {medAdministrations.map((med) => (
              <div key={med.id} style={{ padding: '0.75rem', backgroundColor: med.status === 'completed' ? '#f8fafc' : '#ffffff', borderRadius: '0.625rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: med.status === 'completed' ? '#94a3b8' : '#0f172a', textDecoration: med.status === 'completed' ? 'line-through' : 'none' }}>
                    {med.med}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {med.patient} • {med.room} ({med.time})
                  </div>
                </div>

                {med.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() => handleAdministerMed(med.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', color: '#059669', borderColor: '#a7f3d0' }}
                  >
                    <Check size={12} />
                    <span>Aplicar</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
