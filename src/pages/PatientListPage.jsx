import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SearchBar from '../components/SearchBar';
import PatientTable from '../components/PatientTable';
import PatientCards from '../components/PatientCards';
import PatientFormModal from '../components/PatientFormModal';
import PatientDetailModal from '../components/PatientDetailModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import ErrorAlert from '../components/ErrorAlert';
import { TableSkeleton, CardSkeleton } from '../components/LoadingSkeleton';
import { Users, Plus } from 'lucide-react';
import {
  getPatients,
  createPatient,
  updatePatient,
  deletePatient
} from '../services/fhirApi';
import { useLanguage } from '../i18n/LanguageContext';

export default function PatientListPage({ addToast, formModal, setFormModal }) {
  const { t } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');

  // Modals & Action States
  const [detailModal, setDetailModal] = useState({ isOpen: false, patient: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, patient: null });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search query input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch patients whenever debounced query changes
  const fetchPatientsList = useCallback(async (query = debouncedQuery, isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const result = await getPatients(query);
      setPatients(result.patients);
      setTotalCount(result.total);
    } catch (err) {
      console.error('Failed to load patients:', err);
      setError(err);
      if (addToast) {
        addToast('error', err.message || 'Failed to fetch patients from FHIR server', t('toastErrorTitle'));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [debouncedQuery, addToast, t]);

  useEffect(() => {
    fetchPatientsList(debouncedQuery);
  }, [debouncedQuery, fetchPatientsList]);

  // Client-side gender filter application
  const filteredPatients = useMemo(() => {
    if (genderFilter === 'all') return patients;
    return patients.filter(p => (p.gender || '').toLowerCase() === genderFilter.toLowerCase());
  }, [patients, genderFilter]);

  // Gender breakdown counts
  const genderStats = useMemo(() => {
    const stats = { male: 0, female: 0, other: 0, unknown: 0 };
    patients.forEach(p => {
      const g = (p.gender || 'unknown').toLowerCase();
      if (stats[g] !== undefined) stats[g]++;
      else stats.unknown++;
    });
    return stats;
  }, [patients]);

  // Create Patient Handler
  const handleCreatePatient = async (patientData) => {
    setIsSubmitting(true);
    try {
      await createPatient(patientData);
      if (addToast) {
        addToast('success', t('toastCreatedMsg', { name: `${patientData.givenName} ${patientData.familyName}` }), t('toastCreatedTitle'));
      }
      setFormModal({ isOpen: false, mode: 'create', patient: null });
      await fetchPatientsList(debouncedQuery, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit/Update Patient Handler
  const handleUpdatePatient = async (patientData) => {
    if (!formModal.patient?.id) return;
    setIsSubmitting(true);
    try {
      await updatePatient(formModal.patient.id, patientData, formModal.patient);
      if (addToast) {
        addToast('success', t('toastUpdatedMsg', { name: `${patientData.givenName} ${patientData.familyName}` }), t('toastUpdatedTitle'));
      }
      setFormModal({ isOpen: false, mode: 'create', patient: null });
      await fetchPatientsList(debouncedQuery, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Patient Handler
  const handleDeletePatient = async () => {
    if (!deleteModal.patient?.id) return;
    setIsDeleting(true);
    try {
      await deletePatient(deleteModal.patient.id);
      if (addToast) {
        addToast('success', t('toastDeletedMsg', { id: deleteModal.patient.id }), t('toastDeletedTitle'));
      }
      setDeleteModal({ isOpen: false, patient: null });
      await fetchPatientsList(debouncedQuery, true);
    } catch (err) {
      console.error('Delete error:', err);
      if (addToast) {
        addToast('error', err.message || 'Failed to delete patient resource.', t('toastDeleteFailedTitle'));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main style={{ flex: 1, padding: '2rem 0 4rem 0' }}>
      <div className="container">
        {/* Dashboard Summary Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.75rem'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {t('patientRegistry')}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '2px' }}>
              {t('registrySubtitle')}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '0.5rem 0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <Users size={16} color="var(--color-primary-600)" />
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{t('totalFhirPatients')}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{totalCount}</span>
            </div>

            {patients.length > 0 && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  fontSize: '0.8125rem'
                }}
              >
                <span style={{ color: '#64748b' }}>{t('gender')}</span>
                <span style={{ color: '#0369a1', fontWeight: 600 }}>{genderStats.male}{t('maleShort')}</span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ color: '#be185d', fontWeight: 600 }}>{genderStats.female}{t('femaleShort')}</span>
                {(genderStats.other > 0 || genderStats.unknown > 0) && (
                  <>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ color: '#7e22ce', fontWeight: 600 }}>{genderStats.other + genderStats.unknown} {t('otherShort')}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <ErrorAlert
            error={error}
            onRetry={() => fetchPatientsList(debouncedQuery)}
            title={t('errorTitle')}
          />
        )}

        {/* Search and Filters Bar */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery('')}
          totalCount={totalCount}
          isLoading={isLoading || isRefreshing}
          viewMode={viewMode}
          onToggleViewMode={setViewMode}
          genderFilter={genderFilter}
          onGenderFilterChange={setGenderFilter}
        />

        {/* Active Search / Filter Status Badge */}
        {(debouncedQuery || genderFilter !== 'all') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
              color: '#64748b',
              marginBottom: '1rem',
              padding: '0 0.25rem'
            }}
          >
            <span>{t('filteringResults')}</span>
            {debouncedQuery && (
              <span
                style={{
                  backgroundColor: 'var(--color-primary-50)',
                  color: 'var(--color-primary-800)',
                  border: '1px solid var(--color-primary-200)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  fontWeight: 600
                }}
              >
                {t('nameFilterLabel')}: "{debouncedQuery}"
              </span>
            )}
            {genderFilter !== 'all' && (
              <span
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #e2e8f0',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  fontWeight: 600,
                  textTransform: 'capitalize'
                }}
              >
                {t('genderFilterLabel')}: {genderFilter === 'male' ? t('genderMale') : genderFilter === 'female' ? t('genderFemale') : t('genderOther')}
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#0f172a' }}>
              {t('showingCount', { filtered: filteredPatients.length, total: patients.length })}
            </span>
          </div>
        )}

        {/* Main List / Table / Card Render */}
        {isLoading ? (
          viewMode === 'table' ? <TableSkeleton rows={6} /> : <CardSkeleton count={6} />
        ) : filteredPatients.length > 0 ? (
          viewMode === 'table' ? (
            <PatientTable
              patients={filteredPatients}
              onEdit={(patient) => setFormModal({ isOpen: true, mode: 'edit', patient })}
              onViewDetails={(patient) => setDetailModal({ isOpen: true, patient })}
              onDelete={(patient) => setDeleteModal({ isOpen: true, patient })}
            />
          ) : (
            <PatientCards
              patients={filteredPatients}
              onEdit={(patient) => setFormModal({ isOpen: true, mode: 'edit', patient })}
              onViewDetails={(patient) => setDetailModal({ isOpen: true, patient })}
              onDelete={(patient) => setDeleteModal({ isOpen: true, patient })}
            />
          )
        ) : (
          /* Empty State */
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              padding: '4rem 2rem',
              textAlign: 'center',
              boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto'
              }}
            >
              <Users size={28} />
            </div>

            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              {debouncedQuery ? t('emptySearchTitle') : t('emptyRegistryTitle')}
            </h3>

            <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '440px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
              {debouncedQuery
                ? t('emptySearchSubtitle', { query: debouncedQuery })
                : t('emptyRegistrySubtitle')}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              {debouncedQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="btn btn-secondary"
                >
                  {t('btnClearSearchFilter')}
                </button>
              )}

              <button
                onClick={() => setFormModal({ isOpen: true, mode: 'create', patient: null })}
                className="btn btn-primary"
              >
                <Plus size={16} />
                <span>{t('btnCreatePatient')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Patient Create / Edit Modal */}
      <PatientFormModal
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        patient={formModal.patient}
        onClose={() => setFormModal({ isOpen: false, mode: 'create', patient: null })}
        onSubmit={formModal.mode === 'edit' ? handleUpdatePatient : handleCreatePatient}
        isSubmitting={isSubmitting}
      />

      {/* Patient FHIR Details Modal */}
      <PatientDetailModal
        isOpen={detailModal.isOpen}
        patient={detailModal.patient}
        onClose={() => setDetailModal({ isOpen: false, patient: null })}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        patient={deleteModal.patient}
        onClose={() => setDeleteModal({ isOpen: false, patient: null })}
        onConfirm={handleDeletePatient}
        isDeleting={isDeleting}
      />
    </main>
  );
}
