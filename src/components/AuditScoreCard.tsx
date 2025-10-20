import React from 'react';

type Props = {
  label: string;
  score?: number;
};

export const AuditScoreCard: React.FC<Props> = ({ label, score }) => {
  const s = typeof score === 'number' ? Math.max(0, Math.min(100, Math.round(score))) : undefined;
  const color = s == null ? '#bbb' : s >= 80 ? '#1a7f37' : s >= 60 ? '#9a6700' : '#d1242f';
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: '#555' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', border: `6px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
          {s == null ? '—' : s}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 10, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${s || 0}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
