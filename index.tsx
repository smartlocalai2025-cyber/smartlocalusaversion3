import React, { useState, useEffect, type FC, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { StatusIndicator } from './src/components/StatusIndicator';
import { auth, signInWithGoogle, signOut, type User, firebaseError, db, collection, addDoc, query, where, orderBy, getDocs, functions, httpsCallable } from './firebase';
import { MapView } from './MapView';
import { localAI, type AIResponse } from './ai-service';
import { logoUrl, logoAlt, appName } from './src/branding';
import CustomerProfile from './CustomerProfile';
import type { HttpsCallableResult, HttpsCallable } from 'firebase/functions';


// --- Type Definitions ---
type View = 'CLIENT_SETUP' | 'AUDIT' | 'PROFILES' | 'TOOLS' | 'MAP' | 'SERVICES' | 'PROFILE_DETAIL' | 'ADVANCED_FEATURES' | 'AI_ASSISTANT';
type DemoView = 'LEADS' | 'AGENT_FEED';

interface Business {
    id?: string; // Client's Firestore document ID
    name: string;
    website?: string;
}

interface Profile extends Business {
    id: string;
    notes?: string;
    consultant_uid: string;
    createdAt: { toDate: () => Date }; // Firestore Timestamp
}

interface Audit {
    id: string;
    ai_report: string;
    date_completed: { toDate: () => Date };
}


// --- Logo ---
// Centralized in branding.ts; served from Vite public/ folder

// --- Header Component ---
const Header: FC<{ user: User | null }> = ({ user }) => {
  const [showStats, setShowStats] = useState(false);
  const isAdmin = user?.email === ADMIN_EMAIL;
  
  return (
    <header className="app-header">
      <div className="header-left">
    <img src={logoUrl} alt={logoAlt} className="logo" />
      </div>
      <div className="header-center">
        <div className="ai-status">
          <StatusIndicator 
            showDetails={showStats && isAdmin} 
            className="header-status"
          />
          {isAdmin && (
            <button 
              onClick={() => setShowStats(!showStats)}
              className="stats-toggle"
              title="Toggle AI Stats"
            >
              📊
            </button>
          )}
        </div>
      </div>
      <div className="header-right">
        {user ? (
          <button onClick={() => signOut()}>Sign Out</button>
        ) : (
          <button onClick={() => signInWithGoogle()}>Sign In</button>
        )}
      </div>
    </header>
  );
};

// --- AI Service Configuration ---
let geminiProxy: HttpsCallable<{ action: string; params: any }, { text: string }> | null = null;
if (functions && httpsCallable) {
    geminiProxy = httpsCallable(functions, 'geminiProxy');
}

// AI Service Selection (local AI server preferred, Firebase Functions as fallback)
const useLocalAI = true; // Always use local AI server for all-local development

// Admin email allowlist (frontend guard)
const ADMIN_EMAIL = (import.meta as any)?.env?.VITE_ADMIN_EMAIL || 'tjmorrow909@gmail.com';


// --- Core Components ---

const LoadingScreen: FC = () => (
    <div className="loading-screen" aria-label="Loading application">
    <img src={logoUrl} alt={logoAlt} className="header-logo" />
        <div className="loading-spinner"></div>
    </div>
);
// --- All AI/business API calls should use local Express backend ---
// Example usage:
// fetch('http://localhost:3001/api/ai', { ... })
// fetch('http://localhost:3001/api/features', { ... })
// Remove or disable any Gemini/OpenAI calls in production

const LoginView: FC = () => (
    <div className="login-view">
        <div className="login-box">
            <img src={logoUrl} alt={logoAlt} className="header-logo" />
            <h1>AI-Powered Local Business Growth</h1>
            <p>Sign in to access your dashboard and start optimizing your local presence.</p>
            <button className="btn btn-google" onClick={signInWithGoogle}>
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><g fill="none" fillRule="evenodd"><path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7772 2.7218v2.2582h2.9082c1.7018-1.5668 2.6836-3.8741 2.6836-6.621v.0001z" fill="#4285F4"></path><path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9082-2.2582c-.8059.54-1.8368.8618-3.0482.8618-2.344 0-4.3282-1.5818-5.0359-3.7118H.9573v2.3318C2.4382 16.1423 5.4818 18 9 18z" fill="#34A853"></path><path d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z" fill="#FBBC05"></path><path d="M9 3.4773c1.3236 0 2.52.4573 3.4418 1.346l2.5818-2.5818C13.4636.8918 11.43 0 9 0 5.4818 0 2.4382 1.8577.9573 4.9582L3.964 7.29C4.6718 5.159 6.656 3.4773 9 3.4773z" fill="#EA4335"></path></g></svg>
                Sign In with Google
            </button>
        </div>
    </div>
);

// --- Backend Health Indicator ---
const HealthBadge: FC = () => {
    const [status, setStatus] = useState<'ok' | 'warn' | 'down'>('down');
    const [latency, setLatency] = useState<number | null>(null);

    const checkHealth = useCallback(async () => {
        const start = performance.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        try {
            const resp = await fetch('/api/health', { signal: controller.signal });
            clearTimeout(timeout);
            const ms = Math.round(performance.now() - start);
            setLatency(ms);
            if (resp.ok) {
                setStatus(ms > 2000 ? 'warn' : 'ok');
            } else {
                setStatus('down');
            }
        } catch {
            clearTimeout(timeout);
            setLatency(null);
            setStatus('down');
        }
    }, []);

    useEffect(() => {
        checkHealth();
        const t = setInterval(checkHealth, 15000);
        return () => clearInterval(t);
    }, [checkHealth]);

    const color = status === 'ok' ? '#28a745' : status === 'warn' ? '#ffc107' : '#dc3545';
    const label = status === 'ok' ? 'Online' : status === 'warn' ? 'Slow' : 'Offline';

    return (
        <div aria-label={`Backend status: ${label}`} title={`Backend: ${label}${latency !== null ? ` (${latency}ms)` : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#333' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color }} />
            <span>Server {label}{latency !== null ? ` • ${latency}ms` : ''}</span>
        </div>
    );
};

// --- AI Status Panel ---
const AIStatusPanel: FC = () => {
    const [health, setHealth] = useState<'ok'|'down'>('down');
    const [stats, setStats] = useState<any>({});
    const [provider, setProvider] = useState(localAI.getProvider());
    const [model, setModel] = useState(localAI.getModel());

    const load = useCallback(async () => {
        try {
            const h = await fetch('/api/health');
            setHealth(h.ok ? 'ok' : 'down');
        } catch { setHealth('down'); }
        try {
            const s = await fetch('/api/stats');
            if (s.ok) {
                const data = await s.json();
                setStats(data);
                if (data?.provider) setProvider(data.provider);
                if (data?.model) setModel(data.model);
            }
        } catch {}
        try { setProvider(localAI.getProvider()); } catch {}
        try { setModel(localAI.getModel()); } catch {}
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(load, 20000);
        return () => clearInterval(t);
    }, [load]);

    return (
        <div className="card" style={{ padding: '1rem', display: 'grid', gap: 8 }}>
            <h3>Morrow.AI Status</h3>
            <div>Health: <strong style={{color: health==='ok'?'#28a745':'#dc3545'}}>{health==='ok'?'Online':'Offline'}</strong></div>
            <div>Provider: {provider}</div>
            <div>Model: {model}</div>
            {typeof stats.knowledgeCount !== 'undefined' && (
                <div>Knowledge files: {stats.knowledgeCount}</div>
            )}
            {stats && (
                <div style={{opacity:0.9}}>
                    <div>Queue: {stats.queueLength ?? '—'}</div>
                    <div>Server Load: {stats.systemLoad ?? stats.serverLoad ?? '—'}</div>
                    <div>Tokens: {stats.totalTokens ?? stats.tokenCount ?? '—'}</div>
                    <div>Cost Estimate: {stats.costEstimate ?? '—'}</div>
                </div>
            )}
            <button className="btn" onClick={load}>Refresh</button>
        </div>
    );
};

const AppHeader: FC<{ user: User; currentView: View | DemoView; setView: (view: any) => void; onSignOut: () => void; }> = ({ user, currentView, setView, onSignOut }) => {
    const views: { id: View | DemoView; label: string }[] = [
        { id: 'MAP', label: 'Map View' },
        { id: 'LEADS', label: 'Leads' },
        { id: 'AGENT_FEED', label: 'Agent Feed' },
        { id: 'SERVICES', label: 'Service Packages' },
        { id: 'CLIENT_SETUP', label: 'Client Setup' },
        { id: 'PROFILES', label: 'Profiles' },
        { id: 'TOOLS', label: 'AI Tools' },
        { id: 'ADVANCED_FEATURES', label: '⚡ Advanced' },
        { id: 'AI_ASSISTANT', label: '🤖 Assistant' },
    ];

    return (
        <header className="app-header">
            <div className="header-branding">
                <img src={logoUrl} alt={logoAlt} className="header-logo" />
                <div className="powered-by" style={{marginLeft:12, display:'flex', alignItems:'center', gap:8}}>
                    <strong>Powered by Morrow.AI</strong>
                    <span style={{opacity:0.8}}>|</span>
                    <HealthBadge />
                </div>
            </div>
            <nav className="app-nav">
                {views.map(view => {
                    const isActive = currentView === view.id || (currentView === 'PROFILE_DETAIL' && view.id === 'PROFILES');
                    return (
                        <button
                            key={view.id}
                            className={`nav-button ${isActive ? 'active' : ''}`}
                            onClick={() => setView(view.id as any)}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            {view.label}
                        </button>
                    );
                })}
            </nav>
            <div className="header-user-info">
                <div style={{ marginRight: 12 }}>
                    <HealthBadge />
                </div>
                <img src={user.photoURL ?? undefined} alt={user.displayName ?? 'User'} />
                <span className="user-name">{user.displayName}</span>
                <button className="btn-sign-out" onClick={onSignOut}>Sign Out</button>
            </div>
        </header>
    );
};

const OfflineBanner: FC = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline) return null;
    return (
        <div className="offline-banner" role="status">
            You are currently offline. Some features may be unavailable.
        </div>
    );
};

// --- View Components (Placeholders & Features) ---

const ClientSetupView: FC<{ onCreateProfile: (data: { name: string; website?: string; notes?: string }) => Promise<void> }> = ({ onCreateProfile }) => {
    const [name, setName] = useState('');
    const [website, setWebsite] = useState('');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            alert('Business Name is required.');
            return;
        }
        setIsSaving(true);
        try {
            await onCreateProfile({ name, website, notes });
            setName('');
            setWebsite('');
            setNotes('');
        } catch (error) {
            console.error("Failed to save profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="view-container client-setup-view">
            <div className="client-setup-header">
                <h2>Client Onboarding</h2>
                <p>Enter your new client's information. This will create a profile to track audits and AI-generated content.</p>
            </div>
            <div className="client-setup-layout">
                <div className="notepad-container" style={{ gap: '1rem', textAlign: 'left' }}>
                     <div className="form-group">
                    <div className="header-status" style={{ marginLeft: 'auto', marginRight: 16 }}>
                        <HealthBadge />
                    </div>
                        <label htmlFor="client-name">Business Name</label>
                        <input id="client-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Joe's Pizza Downtown" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="client-website">Website URL</label>
                        <input id="client-website" type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://www.joespizzadt.com" />
                    </div>
                     <div className="form-group">
                        <label htmlFor="client-notes">Onboarding Notes</label>
                        <textarea id="client-notes" className="notepad-textarea" rows={10} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., target audience, primary goals for local SEO, main competitors, etc."></textarea>
                    </div>
                    <div className="notepad-actions">
                        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving || !name.trim()}>
                            {isSaving ? 'Saving...' : 'Create Profile'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MVP Demo: Agent Feed ---
const AgentFeedView: FC = () => {
    const [actions, setActions] = useState<Array<any>>([]);
    const [loading, setLoading] = useState(true);
    const fetchActions = async () => {
        try {
            const resp = await fetch('/api/actions', { headers: await authHeader() });
            const data = await resp.json();
            setActions(data.actions || []);
        } catch (e) {
            console.error('Failed to load actions', e);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchActions();
        const t = setInterval(fetchActions, 5000);
        return () => clearInterval(t);
    }, []);
    if (loading) return <div className="view-container"><h2>Agent Feed</h2><p>Loading...</p></div>;
    return (
        <div className="view-container">
            <h2>Agent Feed</h2>
            {actions.length === 0 ? <p>No actions yet. Trigger an email blast or audit.</p> : null}
            <div className="actions-timeline">
                {actions.map((a) => (
                    <div key={a.id} className={`feed-card feed-${a.type}`}>
                        <div className="feed-header">
                            <strong>{a.type}</strong>
                            <span>{new Date(a.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="feed-body">
                            <p><strong>Lead:</strong> {a.lead?.name}</p>
                            {a.subject && <p><strong>Subject:</strong> {a.subject}</p>}
                            {a.status && <p><strong>Status:</strong> {a.status}</p>}
                            {a.preview && <details><summary>Preview</summary><pre>{a.preview}</pre></details>}
                            {a.summary && <details open><summary>Audit Summary</summary><pre>{a.summary}</pre></details>}
                            {a.error && <p style={{color:'#dc3545'}}><strong>Error:</strong> {a.error}</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- MVP Demo: Leads ---
const LeadsView: FC = () => {
    const [leads, setLeads] = useState<Array<any>>([]);
    const [busy, setBusy] = useState<string | null>(null);
    const userEmail = auth?.currentUser?.email?.toLowerCase() || '';
    const isAdmin = userEmail && ADMIN_EMAIL && userEmail === ADMIN_EMAIL.toLowerCase();

    const loadLeads = async () => {
        try {
            if (!auth?.currentUser) return;
            const headers = await authHeader();
            if (!('Authorization' in headers)) return;
            const resp = await fetch('/api/leads', { headers });
            if (resp.status === 401 || resp.status === 403) {
                const text = await resp.text();
                console.error('Unauthorized accessing /api/leads:', resp.status, text);
                return;
            }
            const data = await resp.json();
            setLeads(data.leads || []);
        } catch (e) {
            console.error('Failed to load leads', e);
        }
    };

    useEffect(() => {
        const unsub = auth?.onAuthStateChanged?.(() => loadLeads());
        loadLeads();
        return () => { unsub && unsub(); };
    }, []);

    const sendOutreach = async () => {
        setBusy('Sending outreach emails...');
        try {
            const resp = await fetch('/api/ai/sendEmails', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) } });
            const data = await resp.json();
            alert(`Outreach complete: ${JSON.stringify(data.results)}`);
        } catch (e:any) {
            alert(`Error: ${e.message}`);
        } finally { setBusy(null); }
    };

    const runAudit = async (leadId: string) => {
        setBusy('Running audit...');
        try {
            const resp = await fetch('/api/ai/audit', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) }, body: JSON.stringify({ leadId }) });
            const data = await resp.json();
            alert('Audit done. Check Agent Feed for details.');
        } catch (e:any) {
            alert(`Error: ${e.message}`);
        } finally { setBusy(null); }
    };

    if (!isAdmin) {
        return (
            <div className="view-container">
                <h2>Leads</h2>
                <p>
                    This section is restricted to administrators.
                    Please sign in with <strong>{ADMIN_EMAIL}</strong> or ask your developer to add your email to the admin allowlist.
                </p>
            </div>
        );
    }

    return (
        <div className="view-container">
            <h2>Leads</h2>
            <div style={{marginBottom:'1rem'}}>
                <button className="btn" onClick={sendOutreach} disabled={!!busy}>Send Outreach Emails</button>
                {busy && <span style={{marginLeft:8}}>{busy}</span>}
            </div>
            <div className="profiles-grid">
                {leads.map((lead) => (
                    <div key={lead.id} className="profile-card">
                        <h3>{lead.name}</h3>
                        <p>{lead.location}</p>
                        <p>{lead.website}</p>
                        <button className="btn" onClick={() => runAudit(lead.id)}>Run SEO Audit</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Helper to attach Firebase ID token to API requests
async function authHeader() {
    if (!auth?.currentUser) return {} as Record<string,string>;
    const token = await auth.currentUser.getIdToken();
    return { Authorization: `Bearer ${token}` } as Record<string,string>;
}

const AuditView: FC<{ business?: Business; onSaveAudit: (report: string, clientId: string) => Promise<void>; }> = ({ business, onSaveAudit }) => {
    const [businessName, setBusinessName] = useState(business?.name || '');
    const [websiteUrl, setWebsiteUrl] = useState(business?.website || '');
    const [report, setReport] = useState('');
    const [isAuditing, setIsAuditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        setBusinessName(business?.name || '');
        setWebsiteUrl(business?.website || '');
        setReport('');
        setError(null);
        setSaveSuccess(false);
        setIsSaving(false);
    }, [business]);

    const handleStartAudit = async () => {
        if (!businessName.trim()) {
            alert('Business Name is required to run an audit.');
            return;
        }
        
        setIsAuditing(true);
        setError(null);
        setReport('');
        
        try {
            let result: AIResponse;
            
            if (useLocalAI) {
                // Use new advanced SEO analysis from local AI server
                result = await localAI.performSEOAnalysis({
                    businessName,
                    website: websiteUrl,
                });
                setReport(result.analysis || result.text || 'No analysis generated');
            } else {
                // Fallback to Firebase Functions
                if (!geminiProxy) {
                    throw new Error("AI functionality is not available. Please check your configuration.");
                }
                
                const prompt = `Please perform a comprehensive local SEO and online presence audit for the following business. Provide a summary, key findings, and actionable recommendations.\n\nBusiness Name: ${businessName}\nWebsite: ${websiteUrl || 'Not provided'}\n\nThe audit should cover:\n1.  **Google Business Profile:** Potential optimizations, completeness, photo quality, reviews, Q&A.\n2.  **On-Page SEO:** Website mobile-friendliness, page speed insights (conceptual), local keyword targeting, NAP consistency.\n3.  **Local Citations & Listings:** Importance of consistent NAP across major directories.\n4.  **Online Reviews:** Reputation analysis, strategy for getting more reviews.\n5.  **Social Media Presence:** Brief check of relevant social media channels for activity and engagement.\n6.  **Competitor Analysis:** Based on the business name and website, identify 2-3 likely local competitors. Briefly analyze their online strengths and suggest ways for our client to differentiate themselves.\n\nFormat the output as clean, well-structured markdown. Use headings, bold text, and bullet points to make it easy to read.`;

                const fbResult = await geminiProxy({
                    action: 'generateContent',
                    params: {
                        model: 'gemini-2.5-flash',
                        contents: prompt,
                    }
                });
                setReport(fbResult.data.text);
            }
        } catch (e: any) {
            console.error("Audit generation failed:", e);
            setError(`Failed to generate audit: ${e.message || 'An unknown error occurred.'}`);
        } finally {
            setIsAuditing(false);
        }
    };
    
    const handleSaveAuditReport = async () => {
        if (!report || !business?.id) return;
        setIsSaving(true);
        setSaveSuccess(false);
        setError(null);
        try {
            await onSaveAudit(report, business.id);
            setSaveSuccess(true);
        } catch (err) {
            console.error("Failed to save audit report:", err);
            setError("Failed to save the report. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="view-container">
            <h2>Run a Local Presence Audit</h2>
            <div className="audit-controls">
                <div className="form-group">
                    <label htmlFor="business-name">Business Name</label>
                    <input
                        type="text"
                        id="business-name"
                        placeholder="e.g., Joe's Pizza Downtown"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="business-website">Website URL</label>
                    <input
                        type="url"
                        id="business-website"
                        placeholder="https://www.joespizzadt.com"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                    />
                </div>
                <button className="btn btn-primary" onClick={handleStartAudit} disabled={isAuditing || !businessName}>
                     {isAuditing ? 'Generating Report...' : 'Start AI Audit'}
                </button>
            </div>
            <div className={`result-container ${report ? 'has-content' : ''} ${error ? 'error' : ''}`}>
                {isAuditing && <div className="loading-spinner small"></div>}
                {error && <p>{error}</p>}
                {report ? (
                    <p>{report}</p>
                ) : !isAuditing && (
                    <div className="audit-placeholder">
                        <p>Your audit report will appear here once generated.</p>
                    </div>
                )}
            </div>
             {report && (
                <div className="audit-actions">
                    {business?.id ? (
                        <button className="btn btn-primary" onClick={handleSaveAuditReport} disabled={isSaving || saveSuccess}>
                            {isSaving ? 'Saving...' : saveSuccess ? '✓ Report Saved' : 'Save Report to Profile'}
                        </button>
                    ) : (
                        <div className="audit-actions-note">
                            <p>To save this report, first create a client profile from the 'Client Setup' tab and run the audit from the 'Profiles' view.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ProfilesView: FC<{ profiles: Profile[]; onSelectProfile: (profile: Profile) => void; loading: boolean; }> = ({ profiles, onSelectProfile, loading }) => {
    
    if (loading) {
        return (
            <div className="view-container profiles-view-container">
                <h2>Client Profiles</h2>
                <div className="loading-spinner"></div>
            </div>
        );
    }
    
    if (profiles.length === 0) {
        return (
            <div className="view-container profiles-view-container">
                <h2>Client Profiles</h2>
                <div className="no-profiles-message">
                    <p>You haven't created any client profiles yet.</p>
                    <p>Go to the 'Client Setup' tab to add your first client.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="view-container profiles-view-container">
            <h2>Client Profiles</h2>
            <div className="profiles-grid">
                {profiles.map(profile => (
                    <div key={profile.id} className="profile-card" tabIndex={0} onClick={() => onSelectProfile(profile)} onKeyDown={(e) => e.key === 'Enter' && onSelectProfile(profile)}>
                        <h3>{profile.name}</h3>
                        {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{profile.website}</a>}
                        <div className="profile-footer">
                            <span className="date-info">Created: {new Date(profile.createdAt?.toDate()).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ProfileDetailView: FC<{
    profile: Profile;
    onBack: () => void;
    onRunAudit: (profile: Profile) => void;
}> = ({ profile, onBack, onRunAudit }) => {
    const [audits, setAudits] = useState<Audit[]>([]);
    const [loadingAudits, setLoadingAudits] = useState(true);
    const [selectedAudit, setSelectedAudit] = useState<string | null>(null);

    useEffect(() => {
        const fetchAudits = async () => {
            if (!db) return;
            setLoadingAudits(true);
            try {
                const q = query(collection(db, 'audits'), where('client_id', '==', profile.id), orderBy('date_completed', 'desc'));
                const querySnapshot = await getDocs(q);
                const auditData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                } as Audit));
                setAudits(auditData);
            } catch (error) {
                console.error("Error fetching audits: ", error);
            } finally {
                setLoadingAudits(false);
            }
        };

        fetchAudits();
    }, [profile.id]);

    const toggleAudit = (auditId: string) => {
        setSelectedAudit(selectedAudit === auditId ? null : auditId);
    };

    return (
        <div className="view-container profile-detail-view">
            <div className="profile-detail-header">
                <button className="btn-back" onClick={onBack}>&larr; Back to Profiles</button>
                <div className="profile-detail-actions">
                     <button className="btn btn-primary" onClick={() => onRunAudit(profile)}>Run New Audit</button>
                </div>
            </div>

            <div className="profile-detail-info">
                <h2>{profile.name}</h2>
                {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer">{profile.website}</a>}
                {profile.notes && <p className="profile-notes">{profile.notes}</p>}
            </div>

            <div className="profile-audits-section">
                <h3>Audit History</h3>
                {loadingAudits ? (
                    <div className="loading-spinner"></div>
                ) : audits.length === 0 ? (
                    <p>No audits found for this client yet.</p>
                ) : (
                    <div className="audits-list">
                        {audits.map(audit => (
                            <div key={audit.id} className="audit-item-card">
                                <div className="audit-item-header" onClick={() => toggleAudit(audit.id)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && toggleAudit(audit.id)} role="button" aria-expanded={selectedAudit === audit.id}>
                                    <span>Audit from {new Date(audit.date_completed.toDate()).toLocaleString()}</span>
                                    <span>{selectedAudit === audit.id ? 'Hide Report ▲' : 'View Report ▼'}</span>
                                </div>
                                {selectedAudit === audit.id && (
                                     <div className="audit-item-body">
                                        <pre>{audit.ai_report}</pre>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ToolsView: FC = () => {
    // State for GBP Post tool
    const [postTopic, setPostTopic] = useState('');
    const [postTone, setPostTone] = useState('Friendly');
    const [postResult, setPostResult] = useState('');
    const [isGeneratingPost, setIsGeneratingPost] = useState(false);
    const [postError, setPostError] = useState<string | null>(null);

    // State for Keyword Ideas tool
    const [keywordService, setKeywordService] = useState('');
    const [keywordLocation, setKeywordLocation] = useState('');
    const [keywordResult, setKeywordResult] = useState('');
    const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
    const [keywordError, setKeywordError] = useState<string | null>(null);

    const handleGeneratePost = async () => {
        if (!postTopic.trim()) return;
        
        setIsGeneratingPost(true);
        setPostError(null);
        setPostResult('');
        
        try {
            let result: AIResponse;
            
            if (useLocalAI) {
                result = await localAI.generateContent('generateContent', {
                    contents: `Generate a short, engaging Google Business Profile post about "${postTopic}". The tone of voice should be ${postTone}. Include relevant hashtags.`
                });
                setPostResult(result.text || 'No content generated');
            } else {
                if (!geminiProxy) { 
                    throw new Error("AI is unavailable"); 
                }
                
                const fbResult = await geminiProxy({
                    action: 'generateContent',
                    params: { model: 'gemini-2.5-flash', contents: `Generate a short, engaging Google Business Profile post about "${postTopic}". The tone of voice should be ${postTone}. Include relevant hashtags.` }
                });
                setPostResult(fbResult.data.text);
            }
        } catch(e: any) {
            console.error("Post generation failed:", e);
            setPostError(e.message || "Failed to generate post.");
        } finally {
            setIsGeneratingPost(false);
        }
    };
    
    const handleGetIdeas = async () => {
        if (!keywordService.trim() || !keywordLocation.trim()) return;
        
        setIsGeneratingKeywords(true);
        setKeywordError(null);
        setKeywordResult('');
        
        try {
            let result: AIResponse;
            
            if (useLocalAI) {
                result = await localAI.generateContent('generateContent', {
                    contents: `Generate a list of local SEO keyword ideas for a business that offers "${keywordService}" in "${keywordLocation}". Include a mix of short-tail, long-tail, and question-based keywords.`
                });
                setKeywordResult(result.text || 'No keywords generated');
            } else {
                if (!geminiProxy) { 
                    throw new Error("AI is unavailable"); 
                }
                
                const fbResult = await geminiProxy({
                    action: 'generateContent',
                    params: { model: 'gemini-2.5-flash', contents: `Generate a list of local SEO keyword ideas for a business that offers "${keywordService}" in "${keywordLocation}". Include a mix of short-tail, long-tail, and question-based keywords.` }
                });
                setKeywordResult(fbResult.data.text);
            }
        } catch(e: any) {
            console.error("Keyword idea generation failed:", e);
            setKeywordError(e.message || "Failed to get ideas.");
        } finally {
            setIsGeneratingKeywords(false);
        }
    };

    return (
        <div className="view-container">
            <h2>AI Content Tools</h2>
            <div className="tools-grid">
                <div className="tool-card">
                    <h3>Google Business Profile Post</h3>
                    <div className="form-group">
                        <label htmlFor="post-topic">Topic</label>
                        <input type="text" id="post-topic" placeholder="e.g., New weekly special, upcoming event" value={postTopic} onChange={e => setPostTopic(e.target.value)} />
                    </div>
                     <div className="form-group">
                        <label htmlFor="post-tone">Tone of Voice</label>
                        <select id="post-tone" value={postTone} onChange={e => setPostTone(e.target.value)}>
                            <option>Friendly</option>
                            <option>Professional</option>
                            <option>Excited</option>
                            <option>Informative</option>
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={handleGeneratePost} disabled={isGeneratingPost || !postTopic.trim()}>
                        {isGeneratingPost ? 'Generating...' : 'Generate Post'}
                    </button>
                    <div className={`result-container ${postResult ? 'has-content' : ''} ${postError ? 'error' : ''}`}>
                       {isGeneratingPost && <div className="loading-spinner small"></div>}
                       {postError && <p>{postError}</p>}
                       {postResult && <p>{postResult}</p>}
                    </div>
                </div>
                <div className="tool-card">
                    <h3>Local SEO Keyword Ideas</h3>
                     <div className="form-group">
                        <label htmlFor="keyword-service">Service/Product</label>
                        <input type="text" id="keyword-service" placeholder="e.g., residential plumbing, artisan coffee" value={keywordService} onChange={e => setKeywordService(e.target.value)} />
                    </div>
                     <div className="form-group">
                        <label htmlFor="keyword-location">Location</label>
                        <input type="text" id="keyword-location" placeholder="e.g., San Francisco" value={keywordLocation} onChange={e => setKeywordLocation(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" onClick={handleGetIdeas} disabled={isGeneratingKeywords || !keywordService.trim() || !keywordLocation.trim()}>
                        {isGeneratingKeywords ? 'Generating...' : 'Get Ideas'}
                    </button>
                     <div className={`result-container ${keywordResult ? 'has-content' : ''} ${keywordError ? 'error' : ''}`}>
                         {isGeneratingKeywords && <div className="loading-spinner small"></div>}
                         {keywordError && <p>{keywordError}</p>}
                         {keywordResult && <p>{keywordResult}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ServicesView: FC = () => {
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    const handleCardClick = (cardId: string) => {
        setExpandedCard(expandedCard === cardId ? null : cardId);
    };

    const packages = [
        {
            id: 'starter',
            name: 'Local SEO Starter',
            price: '$99',
            description: 'Essential local SEO to get your business on the map and ranking.',
            features: [
                'Google Business Profile Optimization',
                'Local Keyword Research (10 keywords)',
                'On-Page SEO for 5 Pages',
                'Monthly Performance Report',
                'Basic Citation Building (20 listings)',
            ],
        },
        {
            id: 'growth',
            name: 'Business Growth Pro',
            price: '$299',
            description: 'A comprehensive package for businesses ready to dominate local search.',
            features: [
                'All features from Starter Plan',
                'Advanced Schema Markup',
                'Content Creation (2 Articles/mo)',
                'Local Link Building Campaign',
                'Quarterly Strategy Review',
            ],
        },
        {
            id: 'ultimate',
            name: 'Ultimate Presence',
            price: '$699+',
            description: 'The ultimate solution for market leaders who want maximum visibility.',
            features: [
                'All features from Growth Pro Plan',
                'Reputation Management & Review Generation',
                'Social Media Signal Integration',
                'Hyperlocal Content Strategy',
                'Dedicated Account Manager',
            ],
        },
    ];

    return (
        <div className="view-container">
            <h2>Our Service Packages</h2>
            <p style={{textAlign: 'center', maxWidth: '600px', margin: '0 auto 2rem'}}>Choose a package that fits your goals. Click on any package to see the full list of features.</p>
            <div className="services-grid">
                {packages.map(pkg => (
                    <div className="service-card" key={pkg.id} onClick={() => handleCardClick(pkg.id)} tabIndex={0} role="button" aria-expanded={expandedCard === pkg.id}>
                        <div className="service-header">
                            <h3>{pkg.name}</h3>
                            <p className="service-price">{pkg.price}</p>
                            <p>{pkg.description}</p>
                        </div>
                        <div className={`service-details ${expandedCard === pkg.id ? 'expanded' : ''}`}>
                            <ul>
                                {pkg.features.map((feature, index) => <li key={index}>{feature}</li>)}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 🎯 Advanced Features View
const AdvancedFeaturesView: FC = () => {
    const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    
    // SEO Analysis state
    const [seoBusinessName, setSeoBusinessName] = useState('');
    const [seoWebsite, setSeoWebsite] = useState('');
    const [seoLocation, setSeoLocation] = useState('');
    const [seoIndustry, setSeoIndustry] = useState('');
    
    // Social Content state
    const [socialBusiness, setSocialBusiness] = useState('');
    const [socialTopic, setSocialTopic] = useState('');
    const [socialPlatform, setSocialPlatform] = useState('instagram');
    const [socialTone, setSocialTone] = useState('friendly');
    const [includeImages, setIncludeImages] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    
    // Competitor Analysis state
    const [compBusiness, setCompBusiness] = useState('');
    const [compLocation, setCompLocation] = useState('');
    const [compIndustry, setCompIndustry] = useState('');

    // Content Calendar state
    const [calBusiness, setCalBusiness] = useState('');
    const [calIndustry, setCalIndustry] = useState('');
    const [calTimeframe, setCalTimeframe] = useState('30');
    const [calPlatforms, setCalPlatforms] = useState<string[]>(['facebook', 'instagram']);

    const handleFeatureAction = async (action: string) => {
        setIsProcessing(true);
        setError(null);
        setResult('');
        setGeneratedImages([]);

        try {
            let response: any;
            switch (action) {
                case 'seo-analysis': {
                    if (!seoBusinessName.trim()) throw new Error('Business name is required');
                    response = await localAI.performSEOAnalysis({
                        businessName: seoBusinessName,
                        website: seoWebsite,
                        location: seoLocation,
                        industry: seoIndustry,
                    });
                    setResult(response.analysis || response.text || 'No analysis generated');
                    break;
                }
                case 'social-content': {
                    if (!socialBusiness.trim() || !socialTopic.trim()) throw new Error('Business name and topic are required');
                    response = await localAI.generateSocialContent({
                        businessName: socialBusiness,
                        topic: socialTopic,
                        platform: socialPlatform,
                        tone: socialTone,
                        includeImage: includeImages,
                    });
                    setResult(response.content || response.text || 'No content generated');
                    if (response.images && response.images.length > 0) {
                        setGeneratedImages(response.images);
                    }
                    break;
                }
                case 'competitor-analysis': {
                    if (!compBusiness.trim() || !compLocation.trim()) throw new Error('Business name and location are required');
                    response = await localAI.analyzeCompetitors({
                        businessName: compBusiness,
                        location: compLocation,
                        industry: compIndustry,
                    });
                    setResult(response.analysis || response.text || 'No analysis generated');
                    break;
                }
                case 'content-calendar': {
                    if (!calBusiness.trim()) throw new Error('Business name is required');
                    response = await localAI.createContentCalendar({
                        businessName: calBusiness,
                        industry: calIndustry,
                        timeframe: calTimeframe,
                        platforms: calPlatforms,
                    });
                    setResult(response.calendar || response.text || 'No calendar generated');
                    break;
                }
                default:
                    throw new Error('Unknown action');
            }
        } catch (e: any) {
            console.error('Advanced feature error:', e);
            setError(e.message || 'An error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    const features = [
        {
            id: 'seo-analysis',
            name: '🎯 Advanced SEO Analysis',
            description: 'Comprehensive local SEO audit with multi-step reasoning and competitor insights',
        },
        {
            id: 'social-content',
            name: '🖼️ Social Media Content',
            description: 'AI-generated posts with optional images for multiple platforms',
        },
        {
            id: 'competitor-analysis',
            name: '🔍 Competitor Analysis',
            description: 'Detailed competitive landscape analysis with actionable opportunities',
        },
        {
            id: 'content-calendar',
            name: '📈 Content Calendar',
            description: 'Strategic content planning for consistent engagement and growth',
        },
    ];

    return (
        <div className="view-container">
            <div className="advanced-features-header">
                <h2>⚡ Advanced AI Features</h2>
                <p>Powerful AI-driven tools for comprehensive local business growth and optimization.</p>
                <div style={{ marginTop: '0.5rem' }}>
                    <AIStatusPanel />
                </div>
            </div>
            
            <div className="features-grid">
                {features.map(feature => (
                    <div 
                        key={feature.id}
                        className={`feature-card ${selectedFeature === feature.id ? 'active' : ''}`}
                        onClick={() => setSelectedFeature(selectedFeature === feature.id ? null : feature.id)}
                    >
                        <h3>{feature.name}</h3>
                        <p>{feature.description}</p>
                    </div>
                ))}
            </div>

            {selectedFeature && (
                <div className="feature-panel">
                    {selectedFeature === 'seo-analysis' && (
                        <div className="feature-form">
                            <h3>🎯 Advanced SEO Analysis</h3>
                            <div className="form-group">
                                <label>Business Name *</label>
                                <input 
                                    type="text" 
                                    value={seoBusinessName} 
                                    onChange={e => setSeoBusinessName(e.target.value)}
                                    placeholder="e.g., Joe's Pizza Downtown"
                                />
                            </div>
                            <div className="form-group">
                                <label>Website URL</label>
                                <input 
                                    type="url" 
                                    value={seoWebsite} 
                                    onChange={e => setSeoWebsite(e.target.value)}
                                    placeholder="https://www.joespizza.com"
                                />
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input 
                                    type="text" 
                                    value={seoLocation} 
                                    onChange={e => setSeoLocation(e.target.value)}
                                    placeholder="e.g., San Francisco, CA"
                                />
                            </div>
                            <div className="form-group">
                                <label>Industry</label>
                                <input 
                                    type="text" 
                                    value={seoIndustry} 
                                    onChange={e => setSeoIndustry(e.target.value)}
                                    placeholder="e.g., Restaurant, Plumbing, Legal"
                                />
                            </div>
                            <button 
                                className="btn btn-primary"
                                onClick={() => handleFeatureAction('seo-analysis')}
                                disabled={isProcessing || !seoBusinessName.trim()}
                            >
                                {isProcessing ? 'Analyzing...' : 'Generate SEO Analysis'}
                            </button>
                        </div>
                    )}

                    {selectedFeature === 'social-content' && (
                        <div className="feature-form">
                            <h3>🖼️ Social Media Content Generator</h3>
                            <div className="form-group">
                                <label>Business Name *</label>
                                <input 
                                    type="text" 
                                    value={socialBusiness} 
                                    onChange={e => setSocialBusiness(e.target.value)}
                                    placeholder="e.g., Joe's Pizza"
                                />
                            </div>
                            <div className="form-group">
                                <label>Content Topic *</label>
                                <input 
                                    type="text" 
                                    value={socialTopic} 
                                    onChange={e => setSocialTopic(e.target.value)}
                                    placeholder="e.g., New menu item launch, Weekend special"
                                />
                            </div>
                            <div className="form-group">
                                <label>Platform</label>
                                <select value={socialPlatform} onChange={e => setSocialPlatform(e.target.value)}>
                                    <option value="instagram">Instagram</option>
                                    <option value="facebook">Facebook</option>
                                    <option value="twitter">Twitter</option>
                                    <option value="linkedin">LinkedIn</option>
                                    <option value="google-business">Google Business Profile</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Tone</label>
                                <select value={socialTone} onChange={e => setSocialTone(e.target.value)}>
                                    <option value="friendly">Friendly</option>
                                    <option value="professional">Professional</option>
                                    <option value="excited">Excited</option>
                                    <option value="informative">Informative</option>
                                    <option value="casual">Casual</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>
                                    <input 
                                        type="checkbox" 
                                        checked={includeImages} 
                                        onChange={e => setIncludeImages(e.target.checked)}
                                    />
                                    Generate images with content
                                </label>
                            </div>
                            <button 
                                className="btn btn-primary"
                                onClick={() => handleFeatureAction('social-content')}
                                disabled={isProcessing || !socialBusiness.trim() || !socialTopic.trim()}
                            >
                                {isProcessing ? 'Creating Content...' : 'Generate Content'}
                            </button>
                        </div>
                    )}

                    {selectedFeature === 'competitor-analysis' && (
                        <div className="feature-form">
                            <h3>🔍 Competitor Analysis</h3>
                            <div className="form-group">
                                <label>Business Name *</label>
                                <input 
                                    type="text" 
                                    value={compBusiness} 
                                    onChange={e => setCompBusiness(e.target.value)}
                                    placeholder="e.g., Joe's Pizza"
                                />
                            </div>
                            <div className="form-group">
                                <label>Location *</label>
                                <input 
                                    type="text" 
                                    value={compLocation} 
                                    onChange={e => setCompLocation(e.target.value)}
                                    placeholder="e.g., San Francisco, CA"
                                />
                            </div>
                            <div className="form-group">
                                <label>Industry</label>
                                <input 
                                    type="text" 
                                    value={compIndustry} 
                                    onChange={e => setCompIndustry(e.target.value)}
                                    placeholder="e.g., Restaurant, Plumbing, Legal"
                                />
                            </div>
                            <button 
                                className="btn btn-primary"
                                onClick={() => handleFeatureAction('competitor-analysis')}
                                disabled={isProcessing || !compBusiness.trim() || !compLocation.trim()}
                            >
                                {isProcessing ? 'Analyzing Competitors...' : 'Analyze Competition'}
                            </button>
                        </div>
                    )}

                    {selectedFeature === 'content-calendar' && (
                        <div className="feature-form">
                            <h3>📈 Content Calendar Generator</h3>
                            <div className="form-group">
                                <label>Business Name *</label>
                                <input 
                                    type="text" 
                                    value={calBusiness} 
                                    onChange={e => setCalBusiness(e.target.value)}
                                    placeholder="e.g., Joe's Pizza"
                                />
                            </div>
                            <div className="form-group">
                                <label>Industry</label>
                                <input 
                                    type="text" 
                                    value={calIndustry} 
                                    onChange={e => setCalIndustry(e.target.value)}
                                    placeholder="e.g., Restaurant, Plumbing, Legal"
                                />
                            </div>
                            <div className="form-group">
                                <label>Timeframe</label>
                                <select value={calTimeframe} onChange={e => setCalTimeframe(e.target.value)}>
                                    <option value="30">30 Days</option>
                                    <option value="60">60 Days</option>
                                    <option value="90">90 Days</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Platforms</label>
                                <div className="checkbox-group">
                                    {['facebook', 'instagram', 'twitter', 'linkedin', 'google-business'].map(platform => (
                                        <label key={platform}>
                                            <input 
                                                type="checkbox" 
                                                checked={calPlatforms.includes(platform)}
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        setCalPlatforms([...calPlatforms, platform]);
                                                    } else {
                                                        setCalPlatforms(calPlatforms.filter(p => p !== platform));
                                                    }
                                                }}
                                            />
                                            {platform.charAt(0).toUpperCase() + platform.slice(1).replace('-', ' ')}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <button 
                                className="btn btn-primary"
                                onClick={() => handleFeatureAction('content-calendar')}
                                disabled={isProcessing || !calBusiness.trim()}
                            >
                                {isProcessing ? 'Creating Calendar...' : 'Generate Calendar'}
                            </button>
                        </div>
                    )}

                    <div className={`result-container ${result ? 'has-content' : ''} ${error ? 'error' : ''}`}>
                        {isProcessing && <div className="loading-spinner small"></div>}
                        {error && <p className="error-text">{error}</p>}
                        {result && (
                            <div>
                                <pre>{result}</pre>
                                {generatedImages.length > 0 && (
                                    <div className="generated-images">
                                        <h4>Generated Images:</h4>
                                        {generatedImages.map((imageUrl, index) => (
                                            <img key={index} src={imageUrl} alt={`Generated content ${index + 1}`} style={{ maxWidth: '100%', margin: '10px 0' }} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// 🤖 AI Assistant View
const AIAssistantView: FC = () => {
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [conversationId, setConversationId] = useState<string>('');

    const handleSendMessage = async () => {
        if (!input.trim()) return;
        
        const userMessage = { role: 'user' as const, content: input.trim(), timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsThinking(true);
        
        try {
            const response = await localAI.askAssistant(
                userMessage.content,
                'Local SEO consultation',
                conversationId
            );
            
            if (response.conversationId && !conversationId) {
                setConversationId(response.conversationId);
            }
            
            const assistantMessage = { 
                role: 'assistant' as const, 
                content: response.response || 'No response generated', 
                timestamp: new Date() 
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error('Assistant error:', error);
            const errorMessage = { 
                role: 'assistant' as const, 
                content: `Sorry, I encountered an error: ${error.message}`, 
                timestamp: new Date() 
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsThinking(false);
        }
    };

    const clearConversation = () => {
        setMessages([]);
        setConversationId('');
    };

    return (
        <div className="view-container ai-assistant-view">
            <div className="assistant-header">
                <h2>🤖 SMARTLOCAL.AI Assistant</h2>
                <p>Your expert AI consultant for local SEO, digital marketing, and business growth strategies.</p>
                <button className="btn btn-secondary" onClick={clearConversation}>Clear Conversation</button>
            </div>
            
            <div className="chat-container">
                <div className="messages-container">
                    {messages.length === 0 ? (
                        <div className="welcome-message">
                            <h3>👋 Welcome! I'm your AI assistant.</h3>
                            <p>Ask me about:</p>
                            <ul>
                                <li>🎯 Local SEO strategies and optimization</li>
                                <li>📱 Social media marketing for local businesses</li>
                                <li>🔍 Competitor analysis and positioning</li>
                                <li>📊 Performance tracking and analytics</li>
                                <li>💡 Business growth and marketing ideas</li>
                            </ul>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div key={index} className={`message ${message.role}`}>
                                <div className="message-content">
                                    <pre>{message.content}</pre>
                                </div>
                                <div className="message-time">
                                    {message.timestamp.toLocaleTimeString()}
                                </div>
                            </div>
                        ))
                    )}
                    
                    {isThinking && (
                        <div className="message assistant thinking">
                            <div className="message-content">
                                <div className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                                <em>AI is thinking...</em>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="chat-input-container">
                    <input 
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask me about local SEO, marketing strategies, or business growth..."
                        disabled={isThinking}
                    />
                    <button 
                        className="btn btn-primary"
                        onClick={handleSendMessage}
                        disabled={isThinking || !input.trim()}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main App Component ---

const App: FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentView, setView] = useState<View | DemoView>('LEADS');
    const [auditTarget, setAuditTarget] = useState<Business | undefined>();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [profilesLoading, setProfilesLoading] = useState(true);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

    const fetchProfiles = useCallback(async (currentUser: User | null) => {
        if (!currentUser || !db) {
            setProfiles([]);
            setProfilesLoading(false);
            return;
        }
        setProfilesLoading(true);
        try {
            // Use simple where to avoid composite index requirement; sort client-side
            const q = query(collection(db, 'clients'), where('consultant_uid', '==', currentUser.uid));
            const querySnapshot = await getDocs(q);
            const profilesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as Profile)).sort((a, b) => {
                const ad = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const bd = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return bd - ad;
            });
            setProfiles(profilesData);
        } catch (error) {
            console.error("Error fetching profiles: ", error);
            // Permission issues often show as FirebaseError: Missing or insufficient permissions
            // This can be caused by Firestore rules not yet deployed.
        } finally {
            setProfilesLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!auth) {
            console.error('Firebase Auth is not initialized.');
            setLoading(false);
            return;
        }
        
        // Set a timeout to prevent indefinite loading
        const loadingTimeout = setTimeout(() => {
            console.warn('Auth state check timed out, proceeding without user');
            setLoading(false);
        }, 5000); // 5 second timeout
        
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            console.log('onAuthStateChanged fired. User:', currentUser);
            clearTimeout(loadingTimeout); // Clear timeout when auth resolves
            setUser(currentUser);
            fetchProfiles(currentUser);
            setLoading(false);
        });
        
        return () => {
            unsubscribe();
            clearTimeout(loadingTimeout);
        };
    }, [fetchProfiles]);
    
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(registration => {
                    console.log('Service Worker registered: ', registration);
                }).catch(registrationError => {
                    console.log('Service Worker registration failed: ', registrationError);
                });
            });
        }
    }, []);

    const handleStartAudit = (business: { name: string; website?: string }) => {
        setAuditTarget(business);
        setView('AUDIT');
    };

    const handleViewChange = (view: View) => {
        if (view !== 'AUDIT') {
            setAuditTarget(undefined);
        }
        if (view !== 'PROFILE_DETAIL') {
            setSelectedProfile(null);
        }
        setView(view);
    };

    const handleCreateProfile = async (profileData: { name: string; website?: string; notes?: string }) => {
        if (!user || !db) throw new Error("User not signed in or DB not available");

    await addDoc(collection(db, 'clients'), {
            ...profileData,
            consultant_uid: user.uid,
            createdAt: new Date(),
        });
        await fetchProfiles(user);
        setView('PROFILES');
    };
    
    const handleSelectProfile = (profile: Profile) => {
        setSelectedProfile(profile);
        setView('PROFILE_DETAIL');
    };

    const handleSaveAudit = async (report: string, clientId: string) => {
        if (!user || !db) {
            throw new Error("User not signed in or DB not available");
        }
    await addDoc(collection(db, 'audits'), {
            client_id: clientId,
            consultant_uid: user.uid,
            status: "complete",
            ai_report: report,
            date_completed: new Date(),
        });
    };

    if (firebaseError) {
        return (
            <div style={{ padding: '2rem', color: '#dc3545', textAlign: 'center' }}>
                <h2>Configuration Error</h2>
                <p>{firebaseError}</p>
                <p>Please check your Firebase configuration and environment variables.</p>
            </div>
        );
    }

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <LoginView />;
    }
    
    const renderView = () => {
        switch (currentView as any) {
            case 'MAP': return <MapView onStartAudit={handleStartAudit} />;
            case 'LEADS':
                if (user.email !== 'tjmorrow909@gmail.com') {
                    return <div style={{padding:'2rem',color:'#dc3545',textAlign:'center'}}><h2>Access Denied</h2><p>This section is restricted to the admin.</p></div>;
                }
                return <LeadsView />;
            case 'AGENT_FEED':
                if (user.email !== 'tjmorrow909@gmail.com') {
                    return <div style={{padding:'2rem',color:'#dc3545',textAlign:'center'}}><h2>Access Denied</h2><p>This section is restricted to the admin.</p></div>;
                }
                return <AgentFeedView />;
            case 'SERVICES': return <ServicesView />;
            case 'CLIENT_SETUP': return <ClientSetupView onCreateProfile={handleCreateProfile} />;
            case 'AUDIT': return <AuditView business={auditTarget} onSaveAudit={handleSaveAudit} />;
                case 'PROFILES':
                    if (user.email !== ADMIN_EMAIL) {
                        return <div style={{padding:'2rem',color:'#dc3545',textAlign:'center'}}><h2>Access Denied</h2><p>This section is restricted to the admin.</p></div>;
                    }
                    return <ProfilesView profiles={profiles} onSelectProfile={handleSelectProfile} loading={profilesLoading} />;
                case 'PROFILE_DETAIL':
                    if (user.email !== ADMIN_EMAIL) {
                        return <div style={{padding:'2rem',color:'#dc3545',textAlign:'center'}}><h2>Access Denied</h2><p>This section is restricted to the admin.</p></div>;
                    }
                    return selectedProfile ? (
                        <ProfileDetailView
                            profile={selectedProfile}
                            onBack={() => setView('PROFILES')}
                            onRunAudit={(profile) => {
                                setAuditTarget(profile);
                                setView('AUDIT');
                            }}
                        />
                    ) : (
                        <ProfilesView profiles={profiles} onSelectProfile={handleSelectProfile} loading={profilesLoading} />
                    );
                case 'TOOLS': return <ToolsView />;
                case 'ADVANCED_FEATURES':
                    if (user.email !== ADMIN_EMAIL) {
                        return <div style={{padding:'2rem',color:'#dc3545',textAlign:'center'}}><h2>Access Denied</h2><p>This section is restricted to the admin.</p></div>;
                    }
                    return <AdvancedFeaturesView />;
                case 'AI_ASSISTANT':
                    if (user.email !== ADMIN_EMAIL) {
                        return <div style={{padding:'2rem',color:'#dc3545',textAlign:'center'}}><h2>Access Denied</h2><p>This section is restricted to the admin.</p></div>;
                    }
                    return <AIAssistantView />;
                default: return <MapView onStartAudit={handleStartAudit} />;
        }
    };

    return (
        <>
            <OfflineBanner />
            <AppHeader user={user} currentView={currentView} setView={handleViewChange} onSignOut={signOut} />
            <main className="app-container">
                {renderView()}
            </main>
        </>
    );
};

// --- Render Application ---
const container = document.getElementById('root');
if (container) {
        const root = createRoot(container);
        root.render(
            <BrowserRouter>
                <Routes>
                    <Route path="/customer/:id" element={<CustomerProfile />} />
                    <Route path="/*" element={<App />} />
                </Routes>
            </BrowserRouter>
        );
} else {
        console.error('Failed to find the root element.');
}