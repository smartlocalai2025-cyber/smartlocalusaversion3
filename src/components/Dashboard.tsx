import React, { useEffect, useState } from 'react';
import { StatusIndicator } from './StatusIndicator';
import { localAI } from '../ai-service';
import AuditView from './AuditView';

const Dashboard: React.FC = () => {
  const [aiHealth, setAiHealth] = useState<boolean>(false);
  const [provider, setProvider] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  // Brain chat state
  const [brainInput, setBrainInput] = useState<string>('');
  const [brainBusy, setBrainBusy] = useState<boolean>(false);
  const [brainAnswer, setBrainAnswer] = useState<string>('');
  const [brainTraceCount, setBrainTraceCount] = useState<number>(0);
  const [brainStreaming, setBrainStreaming] = useState<boolean>(false);
  const [brainStreamText, setBrainStreamText] = useState<string>('');
  // Assistant chat state (non-brain)
  const [assistantInput, setAssistantInput] = useState<string>('');
  const [assistantBusy, setAssistantBusy] = useState<boolean>(false);
  const [assistantAnswer, setAssistantAnswer] = useState<string>('');
  const [assistantStreaming, setAssistantStreaming] = useState<boolean>(false);
  const [assistantStreamText, setAssistantStreamText] = useState<string>('');
  const [now, setNow] = useState<string>(new Date().toLocaleString());
  const [streamByDefault, setStreamByDefault] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      try {
        const healthy = await localAI.checkHealth();
        setAiHealth(healthy);
      } catch {
        setAiHealth(false);
      }
      try {
        setProvider(localAI.getActiveProvider());
        setModel(localAI.getModel());
      } catch {
        setProvider(localAI.getProvider());
        setModel(localAI.getModel());
      }
    };
    load();
    const id = setInterval(() => {
      load();
      setNow(new Date().toLocaleString());
    }, 30000);
    return () => clearInterval(id);
  }, []);
  // Placeholder data for audits and reports
  const audits = [
    { id: 1, name: 'Q3 Financial Audit', status: 'Completed', date: '2025-09-30' },
    { id: 2, name: 'Security Review', status: 'In Progress', date: '2025-10-10' },
  ];
  const reports = [
    { id: 1, title: 'Q3 Summary', date: '2025-09-30' },
    { id: 2, title: 'Security Findings', date: '2025-10-10' },
  ];

  return (
    <div className="dashboard-container">
      <header>
        <h1>Business Audit Dashboard</h1>
        <StatusIndicator />
      </header>
      <div className="chat-header" role="region" aria-label="Assistant header">
        <div className="brand">Morrow.AI</div>
        <div className="meta">
          <span className="status-pill">Now: {now}</span>
          <span className="status-pill">Provider: {provider || '—'}</span>
          <span className="status-pill">Model: {model || '—'}</span>
        </div>
      </div>
      <section>
        <h2>AI Status</h2>
        <p>Now: {now}</p>
        <p>Health: {aiHealth ? 'Online' : 'Offline'}</p>
        <p>Provider: {provider}</p>
        <p>Model: {model}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <label>
            Provider:
            <select
              value={provider}
              onChange={(e) => {
                const p = e.target.value as any;
                localAI.setProvider(p);
                setProvider(p);
              }}
              style={{ marginLeft: 8 }}
            >
              <option value="openai">openai (Morrow.AI brain)</option>
              <option value="gemini">gemini (helper)</option>
            </select>
          </label>
          <label>
            Model:
            <input
              value={model}
              onChange={(e) => {
                const m = e.target.value;
                localAI.setModel(m);
                setModel(m);
              }}
              style={{ marginLeft: 8 }}
              placeholder="model name"
            />
          </label>
        </div>
        <div style={{ marginTop: 8 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={streamByDefault}
              onChange={(e) => setStreamByDefault(e.target.checked)}
            />
            Stream replies by default
          </label>
        </div>
      </section>
      <section className="card">
        <h2>Talk to Morrow.AI (Brain Mode)</h2>
        <p style={{ marginTop: 4 }}>
          Route: <code>/api/ai/brain</code>. Morrow.AI orchestrates tools and replies intelligently.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', marginTop: 8 }}>
          <input
            type="text"
            value={brainInput}
            onChange={(e) => setBrainInput(e.target.value)}
            placeholder="Ask anything. Morrow.AI will use tools as needed…"
            style={{ flex: 1, padding: '8px' }}
            aria-label="Brain prompt"
          />
          <button
            onClick={async () => {
              if (streamByDefault) {
                setBrainStreaming(true); setBrainStreamText(''); setError('');
                const handle = (localAI as any).brainStream(
                  brainInput,
                  undefined,
                  model || undefined,
                  (delta: string) => setBrainStreamText(prev => prev + delta)
                );
                setTimeout(() => { try { handle.close(); } catch {} setBrainStreaming(false); }, 20000);
              } else {
                setBrainBusy(true); setBrainAnswer(''); setError(''); setBrainTraceCount(0);
                try {
                  const res: any = await (localAI as any).brain(
                    brainInput,
                    undefined,
                    provider as any,
                    model || undefined
                  );
                  setBrainAnswer(res?.final_text || '');
                  setBrainTraceCount(Array.isArray(res?.tool_trace) ? res.tool_trace.length : 0);
                } catch (e: any) {
                  setError(e?.message || 'Brain request failed');
                } finally {
                  setBrainBusy(false);
                }
              }
            }}
            disabled={brainBusy || !brainInput.trim()}
          style={{ opacity: brainBusy ? 0.7 : 1 }}
          >
            {brainBusy ? 'Thinking…' : 'Ask Morrow.AI'}
          </button>
        </div>
        {(brainAnswer || error) && (
          <div style={{ marginTop: 12 }}>
            {brainAnswer && (
              <div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{brainAnswer}</div>
                <div style={{ marginTop: 6, color: '#666' }}>Tools used: {brainTraceCount}</div>
              </div>
            )}
            {error && <div style={{ color: '#c00' }} aria-live="assertive">{error}</div>}
          </div>
        )}
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              setBrainStreaming(true); setBrainStreamText(''); setError('');
              const handle = (localAI as any).brainStream(
                brainInput,
                undefined,
                model || undefined,
                (delta: string) => setBrainStreamText(prev => prev + delta)
              );
              // Stop after 20s as a safety (frontend)
              setTimeout(() => { try { handle.close(); } catch {} setBrainStreaming(false); }, 20000);
            }}
            disabled={brainStreaming || !brainInput.trim()}
          >
            {brainStreaming ? 'Streaming…' : 'Stream Reply'}
          </button>
          {brainStreaming && (
            <button onClick={() => { setBrainStreaming(false); setBrainStreamText(''); }}>
              Stop
            </button>
          )}
        </div>
        {brainStreamText && (
          <pre style={{ marginTop: 8, padding: 8, background: '#f6f8fa', whiteSpace: 'pre-wrap' }}>{brainStreamText}</pre>
        )}
      </section>
      <section className="card">
        <h2>Talk to Morrow.AI (Assistant)</h2>
        <p style={{ marginTop: 4 }}>
          Route: <code>/api/ai/assistant</code>. Uses brain logic for conversational answers. You can stream live tokens below.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', marginTop: 8 }}>
          <input
            type="text"
            value={assistantInput}
            onChange={(e) => setAssistantInput(e.target.value)}
            placeholder={'Ask the assistant…'}
            style={{ flex: 1, padding: '8px' }}
            aria-label="Assistant prompt"
          />
          <button
            onClick={async () => {
              if (streamByDefault) {
                setAssistantStreaming(true); setAssistantStreamText(''); setError('');
                const handle = (localAI as any).brainStream(
                  assistantInput,
                  undefined,
                  model || undefined,
                  (delta: string) => setAssistantStreamText(prev => prev + delta)
                );
                setTimeout(() => { try { handle.close(); } catch {} setAssistantStreaming(false); }, 20000);
              } else {
                setAssistantBusy(true); setAssistantAnswer(''); setError('');
                try {
                  const res: any = await localAI.askAssistant(assistantInput, undefined, undefined, { provider: provider as any, model: model || undefined });
                  const answer = res?.response || res?.text || res?.analysis || res?.report || '';
                  setAssistantAnswer(answer);
                } catch (e: any) {
                  setError(e?.message || 'Assistant request failed');
                } finally {
                  setAssistantBusy(false);
                }
              }
            }}
            disabled={assistantBusy || !assistantInput.trim()}
          style={{ opacity: assistantBusy ? 0.7 : 1 }}
          >
            {assistantBusy ? 'Answering…' : 'Ask Morrow.AI'}
          </button>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              setAssistantStreaming(true); setAssistantStreamText(''); setError('');
              const text = assistantInput;
              const handle = (localAI as any).brainStream(
                text,
                undefined,
                model || undefined,
                (delta: string) => setAssistantStreamText(prev => prev + delta)
              );
              setTimeout(() => { try { handle.close(); } catch {} setAssistantStreaming(false); }, 20000);
            }}
            disabled={assistantStreaming || !assistantInput.trim()}
          >
            {assistantStreaming ? 'Streaming…' : 'Stream Reply'}
          </button>
          {assistantStreaming && (
            <button onClick={() => { setAssistantStreaming(false); setAssistantStreamText(''); }}>
              Stop
            </button>
          )}
        </div>
        {(assistantAnswer || error) && (
          <div style={{ marginTop: 12 }}>
            {assistantAnswer && (
              <div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{assistantAnswer}</div>
              </div>
            )}
            {error && <div style={{ color: '#c00' }} aria-live="assertive">{error}</div>}
          </div>
        )}
        {assistantStreamText && (
          <pre style={{ marginTop: 8, padding: 8, background: '#f6f8fa', whiteSpace: 'pre-wrap' }}>{assistantStreamText}</pre>
        )}
      </section>
      <section>
        <h2>Audit Status</h2>
        <ul>
          {audits.map(audit => (
            <li key={audit.id}>
              <strong>{audit.name}</strong> - {audit.status} ({audit.date})
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Recent Reports</h2>
        <ul>
          {reports.map(report => (
            <li key={report.id}>
              <strong>{report.title}</strong> ({report.date})
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Quick Actions</h2>
        <button
          onClick={async () => {
            setIsRunning(true); setMessage(''); setError('');
            try {
              const res = await localAI.startAudit({});
              setMessage(res.text || res.analysis || res.report || 'Audit started.');
            } catch (e: any) {
              setError(e?.message || 'Failed to start audit');
            } finally {
              setIsRunning(false);
            }
          }}
          disabled={isRunning}
        >
          {isRunning ? 'Starting…' : 'Start New Audit'}
        </button>
        <button
          onClick={async () => {
            setIsRunning(true); setMessage(''); setError('');
            try {
              const res = await localAI.generateReport({ format: 'markdown' });
              setMessage(res.report || res.text || 'Report generated.');
            } catch (e: any) {
              setError(e?.message || 'Failed to generate report');
            } finally {
              setIsRunning(false);
            }
          }}
          disabled={isRunning}
        >
          {isRunning ? 'Generating…' : 'Generate Report'}
        </button>
        {(message || error) && (
          <div style={{ marginTop: 12 }}>
            {message && <div aria-live="polite">{message}</div>}
            {error && <div style={{ color: '#c00' }} aria-live="assertive">{error}</div>}
          </div>
        )}
      </section>
      <section>
        <h2>Audit Engine</h2>
        <AuditView />
      </section>
    </div>
  );
};

export default Dashboard;
