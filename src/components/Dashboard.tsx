import React, { useEffect, useState } from 'react';
import { StatusIndicator } from './StatusIndicator';
import { localAI } from '../ai-service';

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
  // Assistant chat state (non-brain)
  const [assistantInput, setAssistantInput] = useState<string>('');
  const [assistantBusy, setAssistantBusy] = useState<boolean>(false);
  const [assistantAnswer, setAssistantAnswer] = useState<string>('');
  const [now, setNow] = useState<string>(new Date().toLocaleString());

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
              <option value="claude">claude</option>
              <option value="ollama">ollama</option>
              <option value="gemini">gemini</option>
              <option value="openai">openai</option>
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
      </section>
      <section>
        <h2>Talk to Morrow (Brain Mode)</h2>
        <p style={{ marginTop: 4 }}>
          Route: <code>/api/ai/brain</code>. Uses the provider you select above. Choose <strong>openai</strong> to have the brain orchestrate tools and reply.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', marginTop: 8 }}>
          <input
            type="text"
            value={brainInput}
            onChange={(e) => setBrainInput(e.target.value)}
            placeholder={provider === 'openai' ? 'Ask anything. Tools will be used as needed…' : 'Select openai above if you want OpenAI to respond'}
            style={{ flex: 1, padding: '8px' }}
            aria-label="Brain prompt"
          />
          <button
            onClick={async () => {
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
            }}
            disabled={brainBusy || !brainInput.trim()}
          >
            {brainBusy ? 'Thinking…' : 'Ask'}
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
      </section>
      <section>
        <h2>Talk to Morrow (Assistant)</h2>
        <p style={{ marginTop: 4 }}>
          Route: <code>/api/ai/assistant</code>. This is a guided assistant chat without tool orchestration.
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
            }}
            disabled={assistantBusy || !assistantInput.trim()}
          >
            {assistantBusy ? 'Answering…' : 'Ask'}
          </button>
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
    </div>
  );
};

export default Dashboard;
