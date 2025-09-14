import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createShow, 
  getShows, 
  getShowMembers, 
  getShowInvites, 
  sendInvite, 
  acceptInvite, 
  revokeInvite, 
  removeMember,
  formatDate,
  formatDateTime 
} from '@/lib/shows';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

// Mock the Supabase client
vi.mock('@/lib/supabase/browser', () => ({
  getSupabaseBrowserClient: vi.fn(),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('shows utility functions', () => {
  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(mockSupabase as any);
  });

  describe('createShow', () => {
    it('should create a show successfully', async () => {
      const mockShow = {
        id: 'show-1',
        name: 'Test Show',
        description: 'Test Description',
        owner_id: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockShow, error: null }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await createShow({
        name: 'Test Show',
        description: 'Test Description',
      });

      expect(result).toEqual(mockShow);
      expect(mockSupabase.from).toHaveBeenCalledWith('shows');
      expect(mockInsert).toHaveBeenCalledWith({
        name: 'Test Show',
        description: 'Test Description',
      });
    });

    it('should handle create show error', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      await expect(createShow({ name: 'Test Show' })).rejects.toThrow('Failed to create show: Database error');
    });
  });

  describe('getShows', () => {
    it('should fetch shows successfully', async () => {
      const mockShows = [
        {
          id: 'show-1',
          name: 'Test Show 1',
          description: 'Description 1',
          owner_id: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'show-2',
          name: 'Test Show 2',
          description: null,
          owner_id: 'user-1',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockShows, error: null }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await getShows();

      expect(result).toEqual(mockShows);
      expect(mockSupabase.from).toHaveBeenCalledWith('shows');
    });

    it('should handle get shows error', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(getShows()).rejects.toThrow('Failed to fetch shows: Database error');
    });
  });

  describe('getShowMembers', () => {
    it('should fetch show members successfully', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          show_id: 'show-1',
          user_id: 'user-1',
          role: 'producer',
          created_at: '2024-01-01T00:00:00Z',
          profiles: {
            display_name: 'John Doe',
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await getShowMembers('show-1');

      expect(result).toEqual(mockMembers);
      expect(mockSupabase.from).toHaveBeenCalledWith('memberships');
    });
  });

  describe('sendInvite', () => {
    it('should send invite successfully', async () => {
      const mockResponse = {
        success: true,
        invite: {
          id: 'invite-1',
          email: 'test@example.com',
          token: 'token-123',
          inviteLink: 'https://example.com/invite/token-123',
          createdAt: '2024-01-01T00:00:00Z',
        },
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
      });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await sendInvite({
        showId: 'show-1',
        email: 'test@example.com',
        role: 'collaborator',
      });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/supabase/functions/send_invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token',
        },
        body: JSON.stringify({
          showId: 'show-1',
          email: 'test@example.com',
          role: 'collaborator',
        }),
      });
    });

    it('should handle send invite error', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
      });

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid email' }),
      } as Response);

      await expect(sendInvite({
        showId: 'show-1',
        email: 'invalid-email',
      })).rejects.toThrow('Invalid email');
    });

    it('should throw error when not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      await expect(sendInvite({
        showId: 'show-1',
        email: 'test@example.com',
      })).rejects.toThrow('Not authenticated');
    });
  });

  describe('acceptInvite', () => {
    it('should accept invite successfully', async () => {
      const mockResponse = {
        success: true,
        show: {
          id: 'show-1',
          name: 'Test Show',
          description: 'Test Description',
        },
        membership: {
          role: 'collaborator',
          createdAt: '2024-01-01T00:00:00Z',
        },
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
      });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await acceptInvite('token-123', 'collaborator');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/supabase/functions/accept_invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token',
        },
        body: JSON.stringify({
          token: 'token-123',
          role: 'collaborator',
        }),
      });
    });
  });

  describe('revokeInvite', () => {
    it('should revoke invite successfully', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
      });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await revokeInvite('invite-1');

      expect(fetch).toHaveBeenCalledWith('/api/supabase/functions/revoke_invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token',
        },
        body: JSON.stringify({
          inviteId: 'invite-1',
        }),
      });
    });
  });

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
      });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await removeMember('show-1', 'user-1');

      expect(fetch).toHaveBeenCalledWith('/api/supabase/functions/remove_member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token',
        },
        body: JSON.stringify({
          showId: 'show-1',
          userId: 'user-1',
        }),
      });
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const result = formatDate(dateString);
      expect(result).toBe('Jan 15, 2024');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time correctly', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const result = formatDateTime(dateString);
      expect(result).toMatch(/Jan 15, 2024/);
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });
});
