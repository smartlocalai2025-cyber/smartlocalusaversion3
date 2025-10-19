import { describe, it, expect, vi } from 'vitest';
import { LocalAIService } from '../ai-service';

describe('LocalAIService', () => {
  it('should use Claude as default provider', () => {
    const service = new LocalAIService();
    expect((service as any).defaultOptions.provider).toBe('claude');
    expect((service as any).defaultOptions.model).toBe('claude-3-sonnet-20240229');
  });

  it('should include provider headers in requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: 'test response' })
    });
    global.fetch = mockFetch;

    const service = new LocalAIService();
    await service.chat('test prompt');

    expect(mockFetch).toHaveBeenCalled();
    const requestInit = mockFetch.mock.calls[0][1];
    expect(requestInit.headers['X-Provider']).toBe('claude');
    expect(requestInit.headers['X-Model']).toBe('claude-3-sonnet-20240229');
  });

  it('should handle request timeouts', async () => {
    const mockFetch = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ text: 'test response' })
        }), 31000); // Longer than default timeout
      });
    });
    global.fetch = mockFetch;

    const service = new LocalAIService();
    await expect(service.chat('test prompt')).rejects.toThrow('Request timeout');
  });
});