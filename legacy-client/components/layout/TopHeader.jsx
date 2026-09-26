import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Plus,
  User,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getPatients } from '../../services/fhirApi';
import { getPatientFullName } from '../../utils/fhirHelper';

export default function TopHeader({
  serverInfo,
  onScheduleEncounter,
  onOpenSettings
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef(null);

  // Debounced search for quick search dropdown in header
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await getPatients(searchQuery.trim());
        setSearchResults(res.patients.slice(0, 6));
        setIsDropdownOpen(true);
      } catch (err) {
        console.warn('Quick search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPatient = (patientId) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    navigate(`/patient/${patientId}`);
  };

  const isConnected = serverInfo?.status === 'connected';

  return (
    <header
      style={{
        height: '68px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.75rem',
        position: 'sticky',
        top: 0,
        zIndex: 20
      }}
    >
      {/* Search Bar with Quick Dropdown */}
      <div ref={searchRef} style={{ position: 'relative', width: '380px' }}>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: '0.875rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Search size={17} />
          </div>

          <input
            type="text"
            className="form-input"
            style={{
              paddingLeft: '2.5rem',
              paddingRight: isSearching ? '2.5rem' : '1rem',
              borderRadius: '9999px',
              backgroundColor: '#f8fafc',
              borderColor: '#e2e8f0',
              fontSize: '0.875rem',
              height: '40px'
            }}
            placeholder={t('searchPlaceholderTop') || 'Buscar pacientes...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setIsDropdownOpen(true);
            }}
          />

          {isSearching && (
            <div
              style={{
                position: 'absolute',
                right: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            >
              <div className="spinner" style={{ width: '15px', height: '15px' }} />
            </div>
          )}
        </div>

        {/* Quick Dropdown Results */}
        {isDropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              zIndex: 50
            }}
          >
            <div
              style={{
                padding: '0.5rem 0.875rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#64748b',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #f1f5f9'
              }}
            >
              {t('quickResults') || 'Resultados Rápidos'}
            </div>

            {searchResults.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                {t('noPatientsFound', { query: searchQuery })}
              </div>
            ) : (
              <div>
                {searchResults.map((p) => {
                  const name = getPatientFullName(p);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPatient(p.id)}
                      style={{
                        padding: '0.625rem 0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f8fafc',
                        transition: 'background-color 0.12s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        >
                          <User size={14} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>{name}</div>
                          <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                            {p.gender || 'Unknown'} • ID: {p.id}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={15} color="#94a3b8" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Header Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Server Status Pill */}
        <div
          onClick={onOpenSettings}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.7rem',
            borderRadius: '9999px',
            backgroundColor: isConnected ? '#ecfdf5' : '#fff1f2',
            border: `1px solid ${isConnected ? '#a7f3d0' : '#fecdd3'}`,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: isConnected ? '#047857' : '#be123c',
            cursor: 'pointer'
          }}
          title={t('settingsTooltip')}
        >
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isConnected ? '#10b981' : '#ef4444' }} />
          <span>{isConnected ? 'FHIR Live' : 'Offline'}</span>
        </div>

        {/* Notifications Icon */}
        <button
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            cursor: 'pointer'
          }}
          title={t('notifications')}
        >
          <Bell size={17} />
        </button>

        {/* Primary CTA: + Nueva Cita */}
        <button
          onClick={onScheduleEncounter}
          className="btn btn-primary"
          style={{
            backgroundColor: '#0f766e',
            borderRadius: '9999px',
            padding: '0.55rem 1.25rem',
            boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)'
          }}
          id="top-new-appointment-btn"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>{t('btnNewAppointment')}</span>
        </button>
      </div>
    </header>
  );
}
