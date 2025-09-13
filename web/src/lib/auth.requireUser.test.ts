import { describe, it, expect, vi } from 'vitest';

const getUserSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({ auth: { getUser: getUserSpy } }),
}));

vi.mock('./supabase/server', () => ({
  getSupabaseServerClient: () => ({ auth: { getUser: getUserSpy } }),
}));

describe('requireUser', () => {
  it('returns user from supabase auth', async () => {
    getUserSpy.mockResolvedValueOnce({ data: { user: { id: 'u1', email: 'u@example.com' } } });
    const { requireUser } = await import('./auth');
    const user = await requireUser();
    expect(user).toEqual({ id: 'u1', email: 'u@example.com' });
  });
});


