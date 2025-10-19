import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { StatusIndicator } from '../components/StatusIndicator';
import { localAI } from '../ai-service';

vi.mock('../ai-service', () => ({
  localAI: {
    checkHealth: vi.fn(),
    getProvider: vi.fn(),
    getModel: vi.fn(),
    subscribeToStatus: vi.fn()
  }
}));

describe('StatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (localAI.checkHealth as any).mockResolvedValue(true);
    (localAI.getProvider as any).mockReturnValue('claude');
    (localAI.getModel as any).mockReturnValue('claude-3-sonnet-20240229');
    (localAI.subscribeToStatus as any).mockImplementation((callback) => {
      callback({
        requestCount: 0,
        averageLatency: 0
      });
      return () => {};
    });
  });

  it('shows online status when healthy', async () => {
    render(<StatusIndicator showDetails />);
    
    // Wait for health check
    await screen.findByText('Online');
    
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('Online')).toHaveClass('text-success');
  });

  it('shows offline status when unhealthy', async () => {
    (localAI.checkHealth as any).mockResolvedValue(false);
    
    render(<StatusIndicator showDetails />);
    
    // Wait for health check
    await screen.findByText('Offline');
    
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toHaveClass('text-error');
  });

  it('shows error message when health check fails', async () => {
    const errorMessage = 'Connection failed';
    (localAI.checkHealth as any).mockRejectedValue(new Error(errorMessage));
    
    render(<StatusIndicator showDetails />);
    
    // Wait for error message
    await screen.findByText(errorMessage);
    
    expect(screen.getByText('Error:')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('updates stats when receiving updates', async () => {
    const { rerender } = render(<StatusIndicator showDetails />);
    
    // Initial state
    expect(screen.getByText('Requests:')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    
    // Simulate stats update
    const unsubscribe = (localAI.subscribeToStatus as any).mock.calls[0][0];
    act(() => {
      unsubscribe({
        requestCount: 5,
        averageLatency: 150
      });
    });
    
    rerender(<StatusIndicator showDetails />);
    
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('150ms')).toBeInTheDocument();
  });
});