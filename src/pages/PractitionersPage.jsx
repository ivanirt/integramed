import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  Award,
  Stethoscope,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { getPractitioners, createPractitioner } from '../services/fhirApi';
import PractitionerModal from '../components/practitioners/PractitionerModal';
import ErrorAlert from '../components/ErrorAlert';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { useLanguage } from '../i18n/LanguageContext';

export default function PractitionersPage({ addToast, onOpenScheduleModal }) {
  const { t } = useLanguage();

  const [practitioners, setPractitioners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const loadPractitioners = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await getPractitioners();
      setPractitioners(data || []);
    } catch (err) {
      console.error('Failed to load practitioners:', err);
      setError(err);
      if (addToast) {
        addToast('error', err.message || 'Failed to fetch practitioners from FHIR server', t('toastErrorTitle'));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    loadPractitioners();
  }, [loadPractitioners]);

  // Seed sample clinical practitioners into the live FHIR server
  const handleSeedPractitioners = async () => {
    setIsSeeding(true);
    try {
      const sampleStaff = [
        {
          prefix: 'Dr.',
          givenName: 'Jesús',
          familyName: 'Robledo',
          gender: 'male',
          email: 'jesus.robledo@integramed.com',
          phone: '+52 55 5234 8101',
          qualification: 'Medicina Interna & Dirección Médica'
        },
        {
          prefix: 'Dr.',
          givenName: 'Edgar',
          familyName: 'Robledo',
          gender: 'male',
          email: 'edgar.robledo@integramed.com',
          phone: '+52 55 5234 8102',
          qualification: 'Medicina General & Fisioterapia Integral'
        },
        {
          prefix: 'Lic.',
          givenName: 'Sofía',
          familyName: 'Mendiola',
          gender: 'female',
          email: 'sofia.mendiola@integramed.com',
          phone: '+52 55 5234 8103',
          qualification: 'Fisioterapia y Rehabilitación Neurológica'
        },
        {
          prefix: 'Enf.',
          givenName: 'Lluvia',
          familyName: 'Robledo',
          gender: 'female',
          email: 'lluvia.robledo@integramed.com',
          phone: '+52 55 5234 8104',
          qualification: 'Enfermería General y Terapia Intensiva'
        },
        {
          prefix: 'Enf.',
          givenName: 'Carmen',
          familyName: 'Saldaña',
          gender: 'female',
          email: 'carmen.saldana@integramed.com',
          phone: '+52 55 5234 8105',
          qualification: 'Enfermería Clínica y Triage de Urgencias'
        },
        {
          prefix: 'Enf.',
          givenName: 'Mariana',
          familyName: 'Domínguez',
          gender: 'female',
          email: 'mariana.dominguez@integramed.com',
          phone: '+52 55 5234 8106',
          qualification: 'Enfermería Pediátrica y Control de Dosis'
        },
        {
          prefix: 'Lic.',
          givenName: 'Edith',
          familyName: 'Alvarez',
          gender: 'female',
          email: 'edith.alvarez@integramed.com',
          phone: '+52 55 5234 8107',
          qualification: 'Atención a Pacientes, Análisis Clínicos y Administración'
        },
        {
          prefix: 'QFB.',
          givenName: 'Luis Fernando',
          familyName: 'Garza',
          gender: 'male',
          email: 'luis.garza@integramed.com',
          phone: '+52 55 5234 8108',
          qualification: 'Química Clínica, Hematología y Microbiología'
        },
        {
          prefix: 'Ing.',
          givenName: 'Roberto',
          familyName: 'Méndez',
          gender: 'male',
          email: 'roberto.mendez@integramed.com',
          phone: '+52 55 5234 8109',
          qualification: 'Administración Hospitalaria y Operaciones Clínicas'
        }
      ];

      for (const doc of sampleStaff) {
        await createPractitioner(doc);
      }

      if (addToast) {
        addToast('success', t('seededDoctorsSuccess'), t('toastCreatedTitle'));
      }
      loadPractitioners(true);
    } catch (err) {
      console.error('Error seeding practitioners:', err);
      if (addToast) {
        addToast('error', err.message || 'Failed to create sample practitioners on FHIR server', t('toastErrorTitle'));
      }
    } finally {
      setIsSeeding(false);
    }
  };

  // Filtered practitioners list
  const filteredPractitioners = useMemo(() => {
    if (!searchQuery.trim()) return practitioners;
    const query = searchQuery.toLowerCase().trim();
    return practitioners.filter(p => {
      const name = p.name?.[0];
      const fullName = `${name?.prefix?.join(' ') || ''} ${name?.given?.join(' ') || ''} ${name?.family || ''}`.toLowerCase();
      const qual = p.qualification?.[0]?.code?.text?.toLowerCase() || '';
      const email = p.telecom?.find(t => t.system === 'email')?.value?.toLowerCase() || '';
      const phone = p.telecom?.find(t => t.system === 'phone')?.value?.toLowerCase() || '';
      return fullName.includes(query) || qual.includes(query) || email.includes(query) || phone.includes(query);
    });
  }, [practitioners, searchQuery]);

  return (
    <div style={{ padding: '1.75rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <UserCheck size={20} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {t('practitionersTitle')}
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
            {t('practitionersSubtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {practitioners.length === 0 && !isLoading && (
            <button
              onClick={handleSeedPractitioners}
              disabled={isSeeding}
              className="btn btn-secondary btn-sm"
              style={{ gap: '0.4rem', color: 'var(--color-primary-700)', borderColor: 'var(--color-primary-300)', backgroundColor: '#ecfdf5' }}
            >
              <Sparkles size={15} />
              <span>{isSeeding ? t('seedingDoctors') : t('seedDoctorsBtn')}</span>
            </button>
          )}

          <button
            onClick={() => loadPractitioners(true)}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
            title={t('refreshTooltip')}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin-fast' : ''} />
            <span>{t('refresh')}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            style={{ backgroundColor: '#0f766e', boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)' }}
            id="new-practitioner-btn"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{t('newPractitionerBtn')}</span>
          </button>
        </div>
      </div>

      {/* Search and Stats Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}
      >
        <div style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 600 }}>
          {t('showingPractitioners', { count: filteredPractitioners.length, total: practitioners.length })}
        </div>

        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPractitionersPlaceholder')}
            style={{
              paddingLeft: '2.25rem',
              height: '36px',
              fontSize: '0.8125rem',
              backgroundColor: '#f8fafc',
              borderRadius: '0.5rem'
            }}
          />
        </div>
      </div>

      {/* Error state */}
      {error && <ErrorAlert error={error} onRetry={() => loadPractitioners()} title={t('errorTitle')} />}

      {/* Loading state */}
      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : filteredPractitioners.length === 0 ? (
        /* Empty State */
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.875rem',
            border: '1px solid #e2e8f0',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#ecfdf5',
              border: '2px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
              color: '#059669'
            }}
          >
            <UserCheck size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            {searchQuery ? t('noMatchingPractitioners') : t('noPractitionersTitle')}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
            {searchQuery ? t('noMatchingPractitionersDesc') : t('noPractitionersDesc')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleSeedPractitioners}
              disabled={isSeeding}
              className="btn btn-secondary"
              style={{ color: 'var(--color-primary-700)', borderColor: 'var(--color-primary-300)', backgroundColor: '#ecfdf5' }}
            >
              <Sparkles size={16} />
              <span>{isSeeding ? t('seedingDoctors') : t('seedDoctorsBtn')}</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary"
              style={{ backgroundColor: '#0f766e' }}
            >
              <Plus size={16} />
              <span>{t('createFirstPractitioner')}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Practitioners Cards Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredPractitioners.map((doc) => {
            const name = doc.name?.[0];
            const prefix = name?.prefix?.join(' ') || (doc.gender === 'female' ? 'Dra.' : 'Dr.');
            const given = name?.given?.join(' ') || '';
            const family = name?.family || '';
            const fullName = `${prefix} ${given} ${family}`.trim() || t('unnamedPractitioner');
            const qualification = doc.qualification?.[0]?.code?.text || t('generalPractice');
            const email = doc.telecom?.find(t => t.system === 'email')?.value;
            const phone = doc.telecom?.find(t => t.system === 'phone')?.value;

            return (
              <div
                key={doc.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '0.875rem',
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem'
                }}
              >
                <div>
                  {/* Top Doctor Avatar & Status */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <div
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          backgroundColor: '#e0f2fe',
                          border: '2px solid #bae6fd',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.35rem',
                          color: '#0284c7',
                          flexShrink: 0
                        }}
                      >
                        {doc.gender === 'female' ? '👩‍⚕️' : '👨‍⚕️'}
                      </div>

                      <div>
                        <h3 style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25 }}>
                          {fullName}
                        </h3>
                        <div style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                          <Award size={13} />
                          <span>{qualification}</span>
                        </div>
                      </div>
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
                      {t('activeStatus')}
                    </span>
                  </div>

                  {/* Contact Information */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8125rem', color: '#64748b', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                    {email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Mail size={13} color="#94a3b8" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                      </div>
                    )}
                    {phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Phone size={13} color="#94a3b8" />
                        <span>{phone}</span>
                      </div>
                    )}
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                      FHIR ID: {doc.id}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '0.875rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                    <ShieldCheck size={14} />
                    <span>{t('verifiedFhirPractitioner')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Practitioner Modal */}
      <PractitionerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPractitionerCreated={() => {
          loadPractitioners(true);
          if (addToast) {
            addToast('success', t('practitionerCreatedToast'), t('toastCreatedTitle'));
          }
        }}
      />
    </div>
  );
}
