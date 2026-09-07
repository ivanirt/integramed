import React from 'react';
import { Search, X, LayoutGrid, List } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function SearchBar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  totalCount,
  isLoading,
  viewMode,
  onToggleViewMode,
  genderFilter,
  onGenderFilterChange
}) {
  const { t } = useLanguage();

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        padding: '0.875rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)'
      }}
    >
      {/* Search Input */}
      <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
        <div
          style={{
            position: 'absolute',
            left: '0.875rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: searchQuery ? 'var(--color-primary-600)' : '#94a3b8',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Search size={18} />
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="form-input"
          style={{
            paddingLeft: '2.5rem',
            paddingRight: searchQuery ? '2.5rem' : '1rem',
            height: '42px',
            fontSize: '0.875rem',
            backgroundColor: '#f8fafc',
            borderColor: searchQuery ? 'var(--color-primary-500)' : '#e2e8f0'
          }}
        />

        {searchQuery && (
          <button
            onClick={onClearSearch}
            style={{
              position: 'absolute',
              right: '0.625rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#e2e8f0',
              border: 'none',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title={t('clearSearch')}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Gender Filters & View Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {/* Gender Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '0.5rem', gap: '2px' }}>
          {[
            { id: 'all', label: t('filterAll') },
            { id: 'male', label: t('filterMale') },
            { id: 'female', label: t('filterFemale') },
            { id: 'other', label: t('filterOther') }
          ].map(g => (
            <button
              key={g.id}
              onClick={() => onGenderFilterChange(g.id)}
              style={{
                border: 'none',
                background: genderFilter === g.id ? '#ffffff' : 'transparent',
                color: genderFilter === g.id ? 'var(--color-primary-700)' : '#64748b',
                fontWeight: genderFilter === g.id ? 700 : 500,
                fontSize: '0.75rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                boxShadow: genderFilter === g.id ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* View Switcher Table / Cards */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '0.5rem', gap: '2px' }}>
          <button
            onClick={() => onToggleViewMode('table')}
            style={{
              border: 'none',
              background: viewMode === 'table' ? '#ffffff' : 'transparent',
              color: viewMode === 'table' ? 'var(--color-slate-900)' : '#94a3b8',
              padding: '0.35rem 0.5rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
            }}
            title={t('tableView')}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => onToggleViewMode('cards')}
            style={{
              border: 'none',
              background: viewMode === 'cards' ? '#ffffff' : 'transparent',
              color: viewMode === 'cards' ? 'var(--color-slate-900)' : '#94a3b8',
              padding: '0.35rem 0.5rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: viewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
            }}
            title={t('cardView')}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
