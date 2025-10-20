import React, { useMemo, useState } from 'react';
import { localAI } from '../ai-service';
import { AuditScoreCard } from './AuditScoreCard';

type Audit = any;

export const AuditView: React.FC = () => {
  const [businessName, setBusinessName] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [latest, setLatest] = useState<Audit | null>(null);
  const [history, setHistory] = useState<Audit[]>([]);

  const canRun = businessName.trim().length > 1;

  async function loadLatestAndHistory(name: string) {
    try {
      setError('');
      const [latestRes, histRes] = await Promise.all([
        localAI.getLatestAudit(name),
        localAI.getAuditHistory(name, 5)
      ]);
      setLatest(latestRes?.audit || null);
      setHistory(histRes?.audits || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load audits');
    }
  }

  async function runAudit() {
    if (!canRun) return;
    setLoading(true); setError('');
    try {
      const res: any = await localAI.startAudit({ businessName, website, location, industry });
      const audit = res?.audit || res;
      if (audit?.businessName) {
        await loadLatestAndHistory(audit.businessName);
      }
    } catch (e: any) {
      setError(e?.message || 'Audit failed');
    } finally {
      setLoading(false);
    }
  }

  const scoreCards = useMemo(() => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <AuditScoreCard label="Overall" score={latest?.scores?.overall} />
      <AuditScoreCard label="Website" score={latest?.scores?.website} />
      <AuditScoreCard label="GBP" score={latest?.scores?.gbp} />
      <AuditScoreCard label="Citations" score={latest?.scores?.citations} />
      <AuditScoreCard label="Reviews" score={latest?.scores?.reviews} />
      <AuditScoreCard label="Social" score={latest?.scores?.social} />
    </div>
  ), [latest]);

  return (
    <section className="card">
      <h2>Run an Audit</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <label>
          Business Name
          <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g., Joe's Pizza" />
        </label>
        <label>
          Website
          <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" />
        </label>
        <label>
          Location
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, ST" />
        </label>
        <label>
          Industry
          <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g., Restaurant" />
        </label>
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={runAudit} disabled={!canRun || loading} style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Running…' : 'Run Audit'}
        </button>
      </div>
      {error && <div style={{ color: '#c00', marginTop: 8 }}>{error}</div>}

      {latest && (
        <div style={{ marginTop: 16 }}>
          <h3>Latest Audit</h3>
          {scoreCards}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600 }}>Summary</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{latest.summary || '—'}</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600 }}>Top Recommendations</div>
            <ol>
              {(latest.recommendations || []).slice(0, 5).map((r: any, i: number) => (
                <li key={i}>
                  <strong>{r.title}</strong> {r.expectedImpact ? `— ${r.expectedImpact}` : ''}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {history && history.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>History</h3>
          <ul>
            {history.map((a: any, idx: number) => (
              <li key={a.id || idx}>
                {new Date(a.timestamp).toLocaleString()} — Overall {a.scores?.overall ?? '—'}
                {a.delta && typeof a.delta.overall === 'number' && (
                  <span style={{ marginLeft: 8, color: a.delta.overall >= 0 ? '#1a7f37' : '#d1242f' }}>
                    {a.delta.overall >= 0 ? '+' : ''}{a.delta.overall}
                    {typeof a.delta.daysSince === 'number' ? ` in ${a.delta.daysSince}d` : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default AuditView;
