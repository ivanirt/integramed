import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Stethoscope,
  Users,
  Activity,
  Calendar,
  FileText,
  Microscope,
  Pill,
  Clock,
  Shield,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  GraduationCap,
  Award,
  PlusSquare,
  Sparkles,
  ChevronRight,
  ExternalLink,
  HeartPulse,
  FlaskConical,
  Bed,
  Check,
  Building
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getStaffFullName, CLINICAL_ROLES } from '../utils/staffStorage';
import { getOrganizations, getLocations } from '../utils/facilityStorage';

export default function HomePage({ addToast, onOpenScheduleModal }) {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { staffList, currentUser } = useAuth();

  const organizations = useMemo(() => getOrganizations(), []);
  const locations = useMemo(() => getLocations(), []);

  // Active Organization & Selected Location
  const primaryOrg = organizations[0] || null;
  const [selectedLocId, setSelectedLocId] = useState(locations[0]?.id || 'loc-santafe');

  const selectedLocation = useMemo(() => {
    return locations.find(l => l.id === selectedLocId) || locations[0] || null;
  }, [locations, selectedLocId]);

  // Clinical Specialties Catalog
  const specialties = [
    {
      id: 'medicina-interna',
      titleEs: 'Medicina Interna & Alta Especialidad',
      titleEn: 'Internal Medicine & High Specialty',
      descEs: 'Diagnóstico y tratamiento integral de patologías crónicas, metabolismo, hipertensión y medicina de adultos.',
      descEn: 'Comprehensive diagnosis and treatment of chronic illnesses, metabolism, hypertension, and adult care.',
      icon: Stethoscope,
      color: '#0d9488',
      bgColor: '#ccfbf1',
      room: 'Consultorio 101 - Ala Principal',
      leadDoctor: 'Dr. Jesús Robledo',
      practitionersCount: 2
    },
    {
      id: 'fisioterapia-rehab',
      titleEs: 'Fisioterapia & Neuro-Rehabilitación',
      titleEn: 'Physical Therapy & Neuro-Rehabilitation',
      descEs: 'Rehabilitación motora avanzada bajo concepto Bobath, punción seca, terapia traumatológica y deportiva.',
      descEn: 'Advanced motor rehabilitation (Bobath concept), dry needling, orthopedic and sports therapy.',
      icon: Activity,
      color: '#0284c7',
      bgColor: '#e0f2fe',
      room: 'Cabinas Bobath 1 y 2 - Gimnasio',
      leadDoctor: 'Lic. Sofía Mendiola / Dr. Edgar Robledo',
      practitionersCount: 2
    },
    {
      id: 'pediatria-vacunacion',
      titleEs: 'Pediatría & Control de Niño Sano',
      titleEn: 'Pediatrics & Well-Child Care',
      descEs: 'Atención médica infantil, control de desarrollo, inmunizaciones de esquema nacional y urgencias pediátricas.',
      descEn: 'Child healthcare, developmental assessment, national vaccination schemes, and pediatric urgencies.',
      icon: HeartPulse,
      color: '#e11d48',
      bgColor: '#ffe4e6',
      room: 'Consultorio 103 - Área Pediátrica',
      leadDoctor: 'Enf. Mariana Domínguez',
      practitionersCount: 2
    },
    {
      id: 'urgencias-triage',
      titleEs: 'Urgencias, Triage & Cuidados Críticos',
      titleEn: 'Emergency Care, Triage & Critical Care',
      descEs: 'Clasificación de urgencias protocolo Manchester, reanimación, sala de choque y monitoreo continuo 24 horas.',
      descEn: 'Manchester protocol triage, resuscitation, shock room, and continuous 24-hour hemodynamic monitoring.',
      icon: ShieldCheck,
      color: '#dc2626',
      bgColor: '#fee2e2',
      room: 'Módulo de Triage y Sala de Choque',
      leadDoctor: 'Enf. Carmen Saldaña / Dr. Jesús Robledo',
      practitionersCount: 3
    },
    {
      id: 'laboratorio-clinico',
      titleEs: 'Química Clínica & Laboratorio Diagnóstico',
      titleEn: 'Clinical Chemistry & Diagnostic Lab',
      descEs: 'Hematología, inmunoserología, microbiología, pruebas moleculares y resultados en tiempo real vía FHIR R4.',
      descEn: 'Hematology, immunoserology, microbiology, molecular testing, and real-time FHIR R4 integration.',
      icon: FlaskConical,
      color: '#4f46e5',
      bgColor: '#e0e7ff',
      room: 'Laboratorio Central de Análisis',
      leadDoctor: 'QFB. Luis Fernando Garza',
      practitionersCount: 2
    },
    {
      id: 'enfermeria-infusion',
      titleEs: 'Enfermería Clínica & Terapia de Infusión',
      titleEn: 'Clinical Nursing & Infusion Therapy',
      descEs: 'Administración segura de medicamentos IV, catéteres centrales PICC, curación avanzada de heridas y estomas.',
      descEn: 'Safe IV medication administration, PICC central lines, advanced wound care, and stoma management.',
      icon: PlusSquare,
      color: '#be123c',
      bgColor: '#ffe4e6',
      room: 'Estación de Enfermería A',
      leadDoctor: 'Enf. Lluvia Robledo',
      practitionersCount: 3
    }
  ];

  return (
    <div style={{ padding: '1.75rem', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* 1. HERO BANNER WITH CLINICAL ILLUSTRATION & ACTIONS */}
      <div
        style={{
          borderRadius: '1.5rem',
          background: 'linear-gradient(135deg, #032b22 0%, #064e3b 50%, #0f766e 100%)',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 35px -10px rgba(6, 78, 59, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        {/* Ambient background glows */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(52, 211, 153, 0.22) 0%, rgba(6, 78, 59, 0) 70%)',
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-25%',
            left: '30%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(45, 212, 191, 0.15) 0%, rgba(6, 78, 59, 0) 70%)',
            pointerEvents: 'none'
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '2.5rem 3rem',
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            alignItems: 'center',
            gap: '2.5rem'
          }}
        >
          {/* Left Column: Headlines & Call to Actions */}
          <div>
            {/* Top Live Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#a7f3d0',
                marginBottom: '1rem'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34d399', boxShadow: '0 0 0 3px rgba(52, 211, 153, 0.3)' }} />
              <span>{language === 'en' ? 'IntegraMed Healthcare Network • Live FHIR R4 Engine' : 'Red Hospitalaria IntegraMed • Servidor FHIR R4 en Vivo'}</span>
            </div>

            <h1
              style={{
                fontSize: '2.25rem',
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: '#ffffff',
                marginBottom: '0.875rem'
              }}
            >
              {language === 'en'
                ? 'Comprehensive, smart and evidence-based clinical care.'
                : 'Atención médica integral, inteligente y de vanguardia.'}
            </h1>

            <p
              style={{
                fontSize: '0.95rem',
                lineHeight: 1.6,
                color: 'rgba(255, 255, 255, 0.88)',
                marginBottom: '1.75rem',
                maxWidth: '560px'
              }}
            >
              {language === 'en'
                ? 'Unified clinical management platform with FHIR R4 patient registry, SOAP consultations, pharmacy stock control, and multi-facility coordination.'
                : 'Plataforma clínica unificada con expediente digital FHIR R4, consulta con notas SOAP, farmacia e inventarios, y coordinación médica entre planteles.'}
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate('/consulta')}
                style={{
                  backgroundColor: '#34d399',
                  color: '#064e3b',
                  border: 'none',
                  padding: '0.75rem 1.35rem',
                  borderRadius: '0.625rem',
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(52, 211, 153, 0.4)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Stethoscope size={18} />
                <span>{language === 'en' ? 'Start Consultation' : 'Iniciar Consulta Médica'}</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => navigate('/agenda')}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '0.625rem',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Calendar size={17} />
                <span>{language === 'en' ? 'Clinical Agenda' : 'Agenda Médica'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/patients')}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '0.625rem',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Users size={17} />
                <span>{language === 'en' ? 'Patient Registry' : 'Pacientes'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Stylized Visual Medical Card Showcase */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                width: '100%',
                maxWidth: '380px',
                borderRadius: '1.25rem',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                padding: '1.5rem',
                boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              {/* Card Header inside Hero */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      backgroundColor: '#34d399',
                      color: '#064e3b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900
                    }}
                  >
                    +
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#ffffff' }}>IntegraMed Monitor</div>
                    <div style={{ fontSize: '0.6875rem', color: '#a7f3d0' }}>Plantel Santa Fe Central</div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(52, 211, 153, 0.25)',
                    color: '#6ee7b7',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(52, 211, 153, 0.4)'
                  }}
                >
                  {language === 'en' ? 'Online 24/7' : 'En Vivo 24/7'}
                </span>
              </div>

              {/* Vitals Telemetry Box */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '0.75rem',
                  padding: '0.875rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                  textAlign: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.625rem', color: '#a7f3d0', fontWeight: 600 }}>P. ARTERIAL</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>120/80</div>
                  <div style={{ fontSize: '0.55rem', color: '#6ee7b7' }}>mmHg Óptimo</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.625rem', color: '#a7f3d0', fontWeight: 600 }}>F. CARDÍACA</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>72</div>
                  <div style={{ fontSize: '0.55rem', color: '#6ee7b7' }}>bpm Rítmico</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.625rem', color: '#a7f3d0', fontWeight: 600 }}>SAT. OXÍGENO</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#34d399', marginTop: '2px' }}>99%</div>
                  <div style={{ fontSize: '0.55rem', color: '#6ee7b7' }}>SpO2 Normal</div>
                </div>
              </div>

              {/* Active Clinician On-Duty */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#0f766e',
                    border: '2px solid #34d399',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.8125rem',
                    flexShrink: 0
                  }}
                >
                  JR
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Dr. Jesús Robledo
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#a7f3d0' }}>
                    Dirección Médica • Guardia 24h
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ORGANIZACIÓN MATRIZ & PLANTELES ACTIVOS (ORGANIZATION & LOCATIONS) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'stretch' }}>
        {/* Organization Card */}
        {primaryOrg && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 2px 5px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '10px',
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800
                  }}
                >
                  <Building2 size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>
                    {language === 'en' ? 'Parent Organization' : 'Organización Matriz'}
                  </span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.25 }}>
                    {primaryOrg.alias || primaryOrg.name}
                  </h3>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.625rem',
                  padding: '0.875rem',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  fontSize: '0.78125rem',
                  color: '#334155',
                  marginBottom: '1rem'
                }}
              >
                <div><strong>Razón Social:</strong> {primaryOrg.name}</div>
                <div><strong>RFC:</strong> <code style={{ fontFamily: 'var(--font-mono)' }}>{primaryOrg.taxId}</code></div>
                <div><strong>Licencia:</strong> {primaryOrg.license}</div>
                <div><strong>Director:</strong> {primaryOrg.director}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem', color: '#64748b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Phone size={13} color="#94a3b8" />
                  <span>{primaryOrg.phone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Mail size={13} color="#94a3b8" />
                  <span>{primaryOrg.email}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/configuracion?tab=facilities')}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '1.25rem', justifyContent: 'center', gap: '0.35rem' }}
            >
              <span>{language === 'en' ? 'Manage Organizations' : 'Administrar Organización'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Plantel / Facility Showcase */}
        {selectedLocation && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 2px 5px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              {/* Plantel Selector Pills */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {language === 'en' ? 'Select Active Plantel / Location:' : 'Planteles & Sedes Clínicas:'}
                </div>

                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {locations.map(loc => {
                    const isSelected = selectedLocId === loc.id;
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => setSelectedLocId(loc.id)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: isSelected ? 800 : 600,
                          border: isSelected ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                          color: isSelected ? '#065f46' : '#64748b',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {loc.name.split('—')[0].trim()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Plantel Information Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.875rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        backgroundColor: '#ecfdf5',
                        color: '#065f46',
                        border: '1px solid #a7f3d0',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      {selectedLocation.code}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedLocation.typeName}</span>
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {selectedLocation.name}
                  </h2>
                </div>

                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '9999px',
                    backgroundColor: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <CheckCircle2 size={11} />
                  {language === 'en' ? 'Active Location' : 'Operando 24/7'}
                </span>
              </div>

              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
                {selectedLocation.description}
              </p>

              {/* Address & Hours */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.625rem',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.8125rem',
                  marginBottom: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={15} color="#059669" flexShrink={0} />
                  <span>{selectedLocation.address?.line}, {selectedLocation.address?.district}, {selectedLocation.address?.city}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b' }}>
                  <Clock size={14} color="#0284c7" flexShrink={0} />
                  <span>{selectedLocation.operatingHours}</span>
                </div>
              </div>

              {/* Capacity Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '0.5rem',
                  border: '1px solid #bbf7d0',
                  textAlign: 'center',
                  marginBottom: '1rem'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#166534', fontWeight: 600 }}>{language === 'en' ? 'Consulting Rooms' : 'Consultorios'}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>{selectedLocation.capacity?.consultingRooms}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#166534', fontWeight: 600 }}>{language === 'en' ? 'Therapy Booths' : 'Cabinas Terapia'}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>{selectedLocation.capacity?.therapyBooths}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#166534', fontWeight: 600 }}>{language === 'en' ? 'Operating Theaters' : 'Quirófanos'}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>{selectedLocation.capacity?.operatingTheaters}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#166534', fontWeight: 600 }}>{language === 'en' ? 'Recovery Beds' : 'Camas Obs.'}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>{selectedLocation.capacity?.recoveryBeds}</div>
                </div>
              </div>

              {/* Services Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {selectedLocation.services?.map((serv, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.2rem 0.5rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      color: '#334155',
                      fontWeight: 600
                    }}
                  >
                    ✓ {serv}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => navigate('/configuracion?tab=facilities')}
                className="btn btn-primary btn-sm"
                style={{ backgroundColor: '#0f766e', gap: '0.35rem' }}
              >
                <span>{language === 'en' ? 'View All Planteles & Rooms' : 'Ver Todos los Planteles y Consultorios'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. ESPECIALIDADES MÉDICAS (CLINICAL SPECIALTIES) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              {language === 'en' ? 'Medical Specialties & Clinical Services' : 'Especialidades Médicas y Departamentos'}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.2rem 0 0' }}>
              {language === 'en' ? 'Integrated clinical departments with specialized physicians and diagnostic equipment' : 'Departamentos clínicos de alta resolución con médicos especialistas y equipamiento'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/practitioners')}
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.35rem' }}
          >
            <span>{language === 'en' ? 'View All Specialists' : 'Ver Especialistas'}</span>
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Specialties Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {specialties.map(spec => {
            const Icon = spec.icon;

            return (
              <div
                key={spec.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  padding: '1.25rem',
                  boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: spec.bgColor,
                        color: spec.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Icon size={22} />
                    </div>

                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {language === 'en' ? spec.titleEn : spec.titleEs}
                      </h3>
                      <div style={{ fontSize: '0.72rem', color: spec.color, fontWeight: 700, marginTop: '0.15rem' }}>
                        {spec.room}
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                    {language === 'en' ? spec.descEn : spec.descEs}
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '0.5rem',
                    padding: '0.6rem 0.85rem',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem'
                  }}
                >
                  <span style={{ color: '#64748b' }}>
                    Médico Titular: <strong style={{ color: '#0f172a' }}>{spec.leadDoctor}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => navigate('/consulta')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0f766e',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      padding: 0
                    }}
                  >
                    <span>{language === 'en' ? 'Consult' : 'Atender'}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. DOCTORES & PERSONAL CLÍNICO DESTACADO (DOCTORS & STAFF DIRECTORY) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              {language === 'en' ? 'Medical Staff & Practitioners' : 'Cuerpo Médico y Profesionales de la Salud'}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.2rem 0 0' }}>
              {language === 'en' ? 'Board-certified physicians, therapists, and nursing specialists with direct consultation access' : 'Especialistas certificados por consejos médicos con consultorio asignado'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/practitioners')}
            className="btn btn-primary btn-sm"
            style={{ backgroundColor: '#0f766e', gap: '0.35rem' }}
          >
            <Users size={14} />
            <span>{language === 'en' ? 'Manage Staff Directory' : 'Administración de Personal'}</span>
          </button>
        </div>

        {/* Doctors Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {staffList.slice(0, 6).map(doc => {
            const roleConfig = CLINICAL_ROLES[doc.primaryRole] || CLINICAL_ROLES.doctor;
            const fullName = getStaffFullName(doc);

            return (
              <div
                key={doc.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  padding: '1.25rem',
                  boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          backgroundColor: doc.avatarBg || '#0f766e',
                          color: doc.avatarText || '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1rem',
                          flexShrink: 0,
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}
                      >
                        {doc.givenName?.[0]}{doc.familyName?.[0]}
                      </div>

                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.25 }}>
                          {fullName}
                        </h3>
                        <div style={{ fontSize: '0.75rem', color: roleConfig.color, fontWeight: 700, marginTop: '0.15rem' }}>
                          {language === 'en' ? roleConfig.labelEn : roleConfig.labelEs}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        backgroundColor: '#ecfdf5',
                        color: '#047857',
                        border: '1px solid #a7f3d0'
                      }}
                    >
                      Activo
                    </span>
                  </div>

                  {/* Specialty and Room */}
                  <div style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 600, marginBottom: '0.35rem' }}>
                    {doc.specialty}
                  </div>
                  {doc.license && (
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-mono)', marginBottom: '0.4rem' }}>
                      {doc.license}
                    </div>
                  )}

                  <div style={{ fontSize: '0.75rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building size={12} />
                    <span>{doc.consultingRoom || 'Consultorio Principal'}</span>
                  </div>
                </div>

                {/* Bottom Action */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {doc.courses?.length || 0} cursos acreditados
                  </span>

                  <button
                    type="button"
                    onClick={() => navigate('/consulta')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', gap: '0.3rem', color: '#0f766e', borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' }}
                  >
                    <Stethoscope size={13} />
                    <span>{language === 'en' ? 'Open Consult' : 'Consultar'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. QUICK ACCESS MODULAR CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div
          onClick={() => navigate('/recetas')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <FileText size={20} />
          </div>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
            {language === 'en' ? 'Digital Prescriptions' : 'Constructor de Recetas'}
          </h4>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            {language === 'en' ? 'Create printable digital prescriptions with QR stamp' : 'Recetas médicas con código QR y sincronización FHIR'}
          </p>
        </div>

        <div
          onClick={() => navigate('/inventario')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <Pill size={20} />
          </div>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
            {language === 'en' ? 'Pharmacy' : 'Farmacia'}
          </h4>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            {language === 'en' ? 'Medication catalog, batch numbers and stock in/out' : 'Control de lotes, caducidades y entradas/salidas'}
          </p>
        </div>

        <div
          onClick={() => navigate('/laboratorios')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#faf5ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <Microscope size={20} />
          </div>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
            {language === 'en' ? 'Lab Studies & AI' : 'Estudios de Laboratorio'}
          </h4>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            {language === 'en' ? 'Ingest PDF, DICOM and AI clinical analysis' : 'Carga de estudios, parámetros FHIR y análisis clínico IA'}
          </p>
        </div>

        <div
          onClick={() => navigate('/turnos')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <Clock size={20} />
          </div>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
            {language === 'en' ? 'Guards & Coverages' : 'Turnos & Guardias'}
          </h4>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            {language === 'en' ? '24h on-call schedules and substitute assignments' : 'Rol de guardias 24h y asignación de sustitutos/relevos'}
          </p>
        </div>
      </div>
    </div>
  );
}
