import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, User, Activity, Check, RefreshCw, X, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getPatients } from '../../services/fhirApi';
import { getPatientFullName } from '../../utils/fhirHelper';

export default function TopHeader({
  serverInfo,
  onScheduleEncounter,
  onOpenSettings
}) {
  const { language, setLanguage, t } = useLanguage();
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setIsDropdownOpen(true);
            }}
            placeholder={t('searchPlaceholderTop')}
            style={{
              height: '40px',
              paddingLeft: '2.5rem',
              paddingRight: searchQuery ? '2.2rem' : '1rem',
              backgroundColor: '#f8fafc',
              fontSize: '0.875rem',
              borderRadius: '9999px',
              border: '1px solid #e2e8f0'
            }}
          />

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setIsDropdownOpen(false);
              }}
              style={{
                position: 'absolute',
                right: '0.625rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#e2e8f0',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isDropdownOpen && searchResults.length > 0 && (
          <div
            className="animate-modal-in"
            style={{
              position: 'absolute',
              top: '46px',
              left: 0,
              right: 0,
              backgroundColor: '#ffffff',
              borderRadius: '0.625rem',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              zIndex: 50
            }}
          >
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              {t('patientResults')} ({searchResults.length})
            </div>
            {searchResults.map((p) => {
              const name = getPatientFullName(p);
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPatient(p.id)}
                  style={{
                    padding: '0.6rem 0.875rem',
                    borderBottom: '1px solid #f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdfa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                      {name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {p.gender || 'Unknown'} • DOB: {p.birthDate || 'N/A'}
                    </div>
                  </div>
                  <ChevronRight size={15} color="#94a3b8" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Language Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            padding: '2px',
            borderRadius: '0.5rem',
            gap: '2px',
            border: '1px solid #e2e8f0'
          }}
        >
          <button
            onClick={() => setLanguage('en')}
            style={{
              border: 'none',
              background: language === 'en' ? '#ffffff' : 'transparent',
              color: language === 'en' ? '#047857' : '#64748b',
              fontWeight: language === 'en' ? 700 : 500,
              fontSize: '0.75rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              boxShadow: language === 'en' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('es')}
            style={{
              border: 'none',
              background: language === 'es' ? '#ffffff' : 'transparent',
              color: language === 'es' ? '#047857' : '#64748b',
              fontWeight: language === 'es' ? 700 : 500,
              fontSize: '0.75rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              boxShadow: language === 'es' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            ES
          </button>
        </div>

        {/* Server Connection Status */}
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

        {/* Primary CTA: + Nueva Cita (Schedule Encounter) */}
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

        {/* Doctor Avatar Profile */}
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: '#e0f2fe',
            border: '2px solid #bae6fd',
            color: '#0369a1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.875rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
          }}
          title="Dr. Alejandro García"
        >
          AG
        </div>
      </div>
    </header>
  );
}
