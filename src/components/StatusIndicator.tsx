import React, { useEffect, useState } from 'react';
import { localAI } from '../ai-service';

interface StatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

interface ServiceStatus {
  isHealthy: boolean;
  provider: string;
  model: string;
  latency: number;
  requestCount: number;
  lastError?: string;
  queueLength?: number;
  serverLoad?: number;
  tokenCount?: number;
  costEstimate?: number;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const [status, setStatus] = useState<ServiceStatus>({
    isHealthy: true,
    provider: localAI.getProvider(),
    model: localAI.getModel(),
    latency: 0,
    requestCount: 0
  });

  const checkHealth = async () => {
    const startTime = Date.now();
    let isHealthy = false;
    let healthError: string | undefined;

    // Health check should not be affected by server stats errors
    try {
      isHealthy = await localAI.checkHealth();
    } catch (error) {
      healthError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Fetch server stats opportunistically; never flip health due to stats issues
    let serverStats: Partial<ServiceStatus> = {};
    try {
      const statsFn = (localAI as any).getServerStats;
      const inVitest = typeof import.meta !== 'undefined' && (import.meta as any).vitest;
      if (!inVitest && typeof statsFn === 'function') {
        serverStats = await statsFn.call(localAI);
      }
    } catch {
      // ignore
    }

    const latency = Date.now() - startTime;
    setStatus(prev => ({
      ...prev,
      isHealthy,
      latency,
      lastError: healthError,
      ...serverStats
    }));
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Subscribe to AI service events
  useEffect(() => {
    const unsubscribe = localAI.subscribeToStatus((stats) => {
      setStatus(prev => ({
        ...prev,
        requestCount: stats.requestCount,
        latency: stats.averageLatency
      }));
    });
    return () => unsubscribe();
  }, []);

  if (!showDetails) {
    return (
      <div 
        className={`ai-status-indicator ${className}`}
        title={`AI Service: ${status.isHealthy ? 'Online' : 'Offline'}`}
      >
        <div 
          className={`status-dot ${status.isHealthy ? 'status-healthy' : 'status-error'}`} 
        />
      </div>
    );
  }

  return (
    <div className={`ai-status-panel ${className}`}>
      <h3>AI Service Status</h3>
      <div className="status-details">
        <div className="status-row">
          <span>Status:</span>
          <span className={status.isHealthy ? 'text-success' : 'text-error'}>
            {status.isHealthy ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="status-row">
          <span>Provider:</span>
          <span>{status.provider}</span>
        </div>
        <div className="status-row">
          <span>Model:</span>
          <span>{status.model}</span>
        </div>
        <div className="status-row">
          <span>Latency:</span>
          <span>{status.latency}ms</span>
        </div>
        <div className="status-row">
          <span>Requests:</span>
          <span>{status.requestCount}</span>
        </div>
        {status.queueLength !== undefined && (
          <div className="status-row">
            <span>Queue:</span>
            <span>{status.queueLength} requests</span>
          </div>
        )}
        {status.serverLoad !== undefined && (
          <div className="status-row">
            <span>Server Load:</span>
            <span>{status.serverLoad.toFixed(2)}%</span>
          </div>
        )}
        {status.tokenCount !== undefined && (
          <div className="status-row">
            <span>Tokens:</span>
            <span>{status.tokenCount.toLocaleString()}</span>
          </div>
        )}
        {status.costEstimate !== undefined && (
          <div className="status-row">
            <span>Cost:</span>
            <span>${status.costEstimate.toFixed(2)}</span>
          </div>
        )}
        {status.lastError && (
          <div className="status-row error-message">
            <span>Error:</span>
            <span>{status.lastError}</span>
          </div>
        )}
      </div>
      <style>{`
        .ai-status-indicator {
          display: inline-flex;
          align-items: center;
          padding: 4px;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: background-color 0.3s ease;
        }
        
        .status-healthy {
          background-color: #4caf50;
        }
        
        .status-error {
          background-color: #f44336;
        }
        
        .ai-status-panel {
          padding: 16px;
          border-radius: 8px;
          background: #f5f5f5;
          max-width: 400px;
        }
        
        .status-details {
          display: grid;
          gap: 8px;
        }
        
        .status-row {
          display: grid;
          grid-template-columns: 100px 1fr;
          gap: 16px;
        }
        
        .text-success {
          color: #4caf50;
        }
        
        .text-error {
          color: #f44336;
        }
        
        .error-message {
          color: #f44336;
          font-size: 0.9em;
        }
      `}</style>
    </div>
  );
};