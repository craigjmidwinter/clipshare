import { describe, it, expect, vi } from 'vitest';

// Mock Supabase server client before importing module under test
const upsertSpy = vi.fn();
const getUserSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => {
  return {
    getSupabaseServerClient: () => ({
      auth: { getUser: getUserSpy },
      from: () => ({ upsert: upsertSpy }),
    }),
  };
});

// Also mock the relative specifier used in auth.ts
vi.mock('./supabase/server', () => {
  return {
    getSupabaseServerClient: () => ({
      auth: { getUser: getUserSpy },
      from: () => ({ upsert: upsertSpy }),
    }),
  };
});

describe('ensureProfile', () => {
  it('upserts profile with display name and avatar for logged-in user', async () => {
    getUserSpy.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-123',
          user_metadata: { full_name: 'Ada Lovelace', avatar_url: 'https://example.com/a.png' },
          email: 'ada@example.com',
        },
      },
    });
    const { ensureProfile } = await import('./auth');

    await ensureProfile();

    expect(upsertSpy).toHaveBeenCalledTimes(1);
    const arg = upsertSpy.mock.calls[0][0];
    expect(arg).toMatchObject({
      user_id: 'user-123',
      display_name: 'Ada Lovelace',
      avatar_url: 'https://example.com/a.png',
    });
  });

  it('no-ops when there is no user', async () => {
    upsertSpy.mockReset();
    getUserSpy.mockResolvedValueOnce({ data: { user: null } });
    const { ensureProfile } = await import('./auth');
    await ensureProfile();
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('falls back to name, then email, and null avatar', async () => {
    upsertSpy.mockReset();
    getUserSpy.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-456',
          user_metadata: { name: 'Grace Hopper' },
          email: 'grace@example.com',
        },
      },
    });
    const { ensureProfile } = await import('./auth');
    await ensureProfile();
    const arg1 = upsertSpy.mock.calls[0][0];
    expect(arg1).toMatchObject({ user_id: 'user-456', display_name: 'Grace Hopper' });

    upsertSpy.mockReset();
    getUserSpy.mockResolvedValueOnce({ data: { user: { id: 'user-789', user_metadata: {}, email: 'e@example.com' } } });
    await ensureProfile();
    const arg2 = upsertSpy.mock.calls[0][0];
    expect(arg2.display_name).toBe('e@example.com');
    expect(arg2.avatar_url).toBeNull();
    expect(typeof arg2.updated_at).toBe('string');
  });

  it('uses picture for avatar when avatar_url missing', async () => {
    upsertSpy.mockReset();
    getUserSpy.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-999',
          user_metadata: { full_name: 'Linus', picture: 'https://example.com/pic.png' },
          email: 'linus@example.com',
        },
      },
    });
    const { ensureProfile } = await import('./auth');
    await ensureProfile();
    const arg = upsertSpy.mock.calls[0][0];
    expect(arg.avatar_url).toBe('https://example.com/pic.png');
  });

  it('handles missing name fields and email gracefully', async () => {
    upsertSpy.mockReset();
    getUserSpy.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-empty',
          user_metadata: {},
          email: null,
        },
      },
    } as any);
    const { ensureProfile } = await import('./auth');
    await ensureProfile();
    const arg = upsertSpy.mock.calls[0][0];
    expect(arg.display_name).toBe('');
    expect(arg.avatar_url).toBeNull();
  });
});


