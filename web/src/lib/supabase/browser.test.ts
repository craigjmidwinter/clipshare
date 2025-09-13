import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const createBrowserClientMock = vi.fn(() => ({ kind: 'browser-client' }));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: createBrowserClientMock,
}));

const originalEnv = { ...process.env };

describe('getSupabaseBrowserClient', () => {
  beforeEach(() => {
    vi.resetModules();
    createBrowserClientMock.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws when env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const mod = await import('./browser');
    expect(() => mod.getSupabaseBrowserClient()).toThrowError(/Missing NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('creates client with env vars', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    const mod = await import('./browser');
    const client = mod.getSupabaseBrowserClient();
    expect(client).toEqual({ kind: 'browser-client' });
    expect(createBrowserClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key');
  });

  it('returns same shape on repeated calls', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    const mod = await import('./browser');
    const c1 = mod.getSupabaseBrowserClient();
    const c2 = mod.getSupabaseBrowserClient();
    expect(c1).toEqual({ kind: 'browser-client' });
    expect(c2).toEqual({ kind: 'browser-client' });
  });
});


