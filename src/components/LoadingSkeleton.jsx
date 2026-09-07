import React from 'react';

export function TableSkeleton({ rows = 6 }) {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '2rem' }}>
        <div style={{ height: '14px', width: '180px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} className="animate-pulse-subtle" />
        <div style={{ height: '14px', width: '100px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} className="animate-pulse-subtle" />
        <div style={{ height: '14px', width: '140px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} className="animate-pulse-subtle" />
        <div style={{ height: '14px', width: '120px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginLeft: 'auto' }} className="animate-pulse-subtle" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: '1.1rem 1.25rem',
            borderBottom: i === rows - 1 ? 'none' : '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem'
          }}
        >
          {/* Avatar skeleton */}
          <div
            style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9', flexShrink: 0 }}
            className="animate-pulse-subtle"
          />
          {/* Name & ID */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 2 }}>
            <div style={{ height: '16px', width: '60%', backgroundColor: '#e2e8f0', borderRadius: '4px' }} className="animate-pulse-subtle" />
            <div style={{ height: '12px', width: '35%', backgroundColor: '#f1f5f9', borderRadius: '4px' }} className="animate-pulse-subtle" />
          </div>
          {/* Gender Badge */}
          <div style={{ height: '24px', width: '70px', borderRadius: '9999px', backgroundColor: '#f1f5f9', flex: 1 }} className="animate-pulse-subtle" />
          {/* DOB */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1.5 }}>
            <div style={{ height: '14px', width: '80%', backgroundColor: '#e2e8f0', borderRadius: '4px' }} className="animate-pulse-subtle" />
            <div style={{ height: '12px', width: '45%', backgroundColor: '#f1f5f9', borderRadius: '4px' }} className="animate-pulse-subtle" />
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <div style={{ width: '65px', height: '32px', backgroundColor: '#f1f5f9', borderRadius: '6px' }} className="animate-pulse-subtle" />
            <div style={{ width: '32px', height: '32px', backgroundColor: '#f1f5f9', borderRadius: '6px' }} className="animate-pulse-subtle" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 6 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#f1f5f9' }} className="animate-pulse-subtle" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <div style={{ height: '16px', width: '70%', backgroundColor: '#e2e8f0', borderRadius: '4px' }} className="animate-pulse-subtle" />
              <div style={{ height: '12px', width: '40%', backgroundColor: '#f1f5f9', borderRadius: '4px' }} className="animate-pulse-subtle" />
            </div>
          </div>
          <div style={{ height: '20px', width: '60px', borderRadius: '9999px', backgroundColor: '#f1f5f9' }} className="animate-pulse-subtle" />
          <div style={{ height: '36px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '6px', marginTop: 'auto' }} className="animate-pulse-subtle" />
        </div>
      ))}
    </div>
  );
}
