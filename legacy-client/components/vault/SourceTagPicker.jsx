import React from 'react';
import { Filter } from 'lucide-react';

const CHIP = {
  idle: {
    backgroundColor: '#ffffff',
    color: '#475569',
    border: '1px solid #e2e8f0'
  },
  active: {
    backgroundColor: '#ccfbf1',
    color: '#0f766e',
    border: '1px solid #99f6e4'
  }
};

export function vaultTagLabel(t, tag) {
  const key = `vaultTag_${tag}`;
  const labeled = t(key);
  return labeled === key ? tag.replace(/_/g, ' ') : labeled;
}

export function collectUniqueTags(sources) {
  const tags = new Set();
  (sources || []).forEach((source) => {
    (source.tags || []).forEach((tag) => tags.add(tag));
  });
  return [...tags].sort((a, b) => a.localeCompare(b));
}

export function filterSourcesByTags(sources, selectedTags) {
  if (!selectedTags?.length) return sources || [];
  const required = new Set(selectedTags);
  return (sources || []).filter((source) => {
    const tags = new Set(source.tags || []);
    return [...required].every((tag) => tags.has(tag));
  });
}

export default function SourceTagPicker({
  tags,
  selectedTags,
  onToggle,
  onClear,
  t,
  counts
}) {
  if (!tags?.length) return null;

  return (
    <div style={{ padding: '0.75rem 1rem 0.35rem', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b' }}>
          <Filter size={12} />
          {t('vaultFilterTags')}
        </div>
        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            style={{ border: 'none', background: 'transparent', color: '#0f766e', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
          >
            {t('vaultClearFilter')}
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {tags.map((tag) => {
          const active = selectedTags.includes(tag);
          const count = counts?.[tag];
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              className="btn btn-sm"
              style={{
                ...(active ? CHIP.active : CHIP.idle),
                borderRadius: '9999px',
                padding: '0.2rem 0.65rem',
                fontSize: '0.7rem',
                fontWeight: 700
              }}
            >
              {vaultTagLabel(t, tag)}
              {typeof count === 'number' ? ` · ${count}` : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SourceTagList({ tags, t }) {
  if (!tags?.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.35rem' }}>
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            color: '#0f766e',
            backgroundColor: '#f0fdfa',
            border: '1px solid #99f6e4',
            borderRadius: '9999px',
            padding: '0.1rem 0.4rem'
          }}
        >
          {vaultTagLabel(t, tag)}
        </span>
      ))}
    </div>
  );
}
