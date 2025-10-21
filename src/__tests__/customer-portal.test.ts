import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalAIService } from '../ai-service';

describe('Customer Portal Integration', () => {
  let service: LocalAIService;
  let mockFetch: any;

  beforeEach(() => {
    service = new LocalAIService();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe('createCustomerProfile', () => {
    it('should create a customer profile with required fields', async () => {
      const mockProfile = {
        id: 'profile-123',
        businessProfileId: 'business-456',
        contact: { email: 'customer@example.com' },
        selectedTools: ['audit', 'reports'],
        verificationCode: 'ABC123',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ profile: mockProfile })
      });

      const result = await service.createCustomerProfile({
        businessProfileId: 'business-456',
        contact: { email: 'customer@example.com' },
        selectedTools: ['audit', 'reports'],
        channel: 'email',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/customer/profile',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('business-456')
        })
      );
      expect(result.profile).toEqual(mockProfile);
    });

    it('should handle SMS channel with phone contact', async () => {
      const mockProfile = {
        id: 'profile-789',
        businessProfileId: 'business-456',
        contact: { phone: '+1234567890' },
        selectedTools: ['audit'],
        verificationCode: 'XYZ789',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ profile: mockProfile })
      });

      const result = await service.createCustomerProfile({
        businessProfileId: 'business-456',
        contact: { phone: '+1234567890' },
        selectedTools: ['audit'],
        channel: 'sms',
      });

      expect(result.profile.contact.phone).toBe('+1234567890');
    });
  });

  describe('sendCustomerNotification', () => {
    it('should send notification via email', async () => {
      const mockResponse = {
        ok: true,
        channel: 'email',
        magicLink: 'https://example.com/customer/profile-123?code=ABC123',
        simulated: false,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.sendCustomerNotification('profile-123', 'email');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/customer/profile/profile-123/notify',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('email')
        })
      );
      expect(result.ok).toBe(true);
      expect(result.channel).toBe('email');
      expect(result.magicLink).toContain('profile-123');
    });

    it('should handle simulated notifications in development', async () => {
      const mockResponse = {
        ok: true,
        channel: 'email',
        magicLink: 'http://localhost:3000/customer/profile-123?code=ABC123',
        simulated: true,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.sendCustomerNotification('profile-123', 'email');

      expect(result.simulated).toBe(true);
    });

    it('should handle notification errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(service.sendCustomerNotification('profile-123', 'email'))
        .rejects.toThrow('Failed to send notification: HTTP 500');
    });
  });

  describe('getCustomerProfile', () => {
    it('should fetch customer profile by id', async () => {
      const mockProfile = {
        id: 'profile-123',
        businessProfileId: 'business-456',
        contact: { email: 'customer@example.com' },
        progress: {
          'audit': { status: 'completed', lastUpdated: '2025-10-20' }
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ profile: mockProfile })
      });

      const result = await service.getCustomerProfile('profile-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/customer/profile/profile-123');
      expect(result.profile).toEqual(mockProfile);
    });
  });

  describe('updateCustomerProgress', () => {
    it('should update customer progress', async () => {
      const mockProfile = {
        id: 'profile-123',
        progress: {
          'audit': { status: 'completed', lastUpdated: '2025-10-21' }
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ profile: mockProfile })
      });

      const result = await service.updateCustomerProgress('profile-123', {
        'audit': { status: 'completed', lastUpdated: '2025-10-21' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/customer/profile/profile-123/progress',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result.profile.progress['audit'].status).toBe('completed');
    });
  });
});
