import { useCallback, useState } from 'react';
import { localAI } from '../ai-service';

export interface AgentResult {
  final_text: string;
  tool_trace: Array<any>;
  model: string;
  provider: string;
}

export function useAgent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AgentResult | null>(null);

  const ask = useCallback(async (prompt: string, toolsAllow?: string[]) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await localAI.agentAsk(prompt, toolsAllow);
      setData(res as AgentResult);
      return res as AgentResult;
    } catch (e: any) {
      setError(e?.message || 'Agent request failed');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, data, ask };
}
