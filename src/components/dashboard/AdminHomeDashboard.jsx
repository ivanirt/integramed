import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Calendar,
  Activity,
  ShieldCheck,
  Settings,
  Bed,
  MapPin,
  TrendingUp,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getOrganizations, getLocations, getFacilityResourceTypes } from '../../utils/facilityStorage';

export default function AdminHomeDashboard({ onOpenScheduleModal, addToast }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { staffList } = useAuth();

  const organizations = getOrganizations();
  const locations = getLocations();
  const resourceTypes = getFacilityResourceTypes();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Panel de Dirección Médica & Operaciones
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 500 }}>
            Supervisión global de planteles, quirófanos, personal de guardia y capacidad instalada
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/configuracion')}
          className="btn btn-secondary"
          style={{ gap: '0.35rem', fontSize: '0.8125rem' }}
        >
          <Settings size={15} />
          <span>Configuración del Sistema</span>
        </button>
      </div>

      {/* 4 Admin KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Sedes / Planteles Activos</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>{locations.length}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Personal Clínico</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>{staffList.length}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Citas Totales Hoy</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>64</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Ocupación de Red</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>78%</div>
          </div>
        </div>
      </div>

      {/* Locations and Physical Resources Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)', gap: '1.5rem' }}>
        {/* Left: Locations card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Capacidad y Ocupación por Plantel
            </h2>
            <button
              type="button"
              onClick={() => navigate('/sedes')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem' }}
            >
              Administrar Sedes
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {locations.map((loc) => (
              <div key={loc.id} style={{ backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{loc.name}</div>
                  <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#059669', fontWeight: 700 }}>
                    Operativo 24/7
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  {loc.address}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {resourceTypes.map((rt) => {
                    const count = loc.resourceCapacities?.[rt.id] ?? loc[rt.id] ?? 0;
                    if (!count) return null;
                    return (
                      <span key={rt.id} style={{ fontSize: '0.72rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#334155' }}>
                        {rt.name}: <strong>{count}</strong>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Quick admin shortcuts */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            Acciones de Gestión
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => navigate('/personal')}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', fontSize: '0.8125rem', gap: '0.5rem' }}
            >
              <Users size={15} color="#0f766e" />
              <span>Directorio y Cédulas de Personal</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/guardias')}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', fontSize: '0.8125rem', gap: '0.5rem' }}
            >
              <Clock size={15} color="#0284c7" />
              <span>Rol de Turnos & Guardias</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/configuracion')}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', fontSize: '0.8125rem', gap: '0.5rem' }}
            >
              <Settings size={15} color="#7c3aed" />
              <span>Horarios, Feriados y Catálogos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
