import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const cookiesStore = new Map<string, string>();
const cookiesMock = vi.fn(() => ({
  get: (name: string) => (cookiesStore.has(name) ? { value: cookiesStore.get(name)! } : undefined),
  set: ({ name, value }: { name: string; value: string }) => {
    if (value === '') cookiesStore.delete(name);
    else cookiesStore.set(name, value);
  },
}));

vi.mock('next/headers', () => ({ cookies: cookiesMock }));

const createServerClientMock = vi.fn(() => ({ kind: 'server-client' }));

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}));

const originalEnv = { ...process.env };

describe('getSupabaseServerClient', () => {
  beforeEach(() => {
    vi.resetModules();
    createServerClientMock.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws when env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const mod = await import('./server');
    expect(() => mod.getSupabaseServerClient()).toThrowError(/Missing NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('creates server client and wires cookie adapters', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    const mod = await import('./server');
    const client = mod.getSupabaseServerClient();
    expect(client).toEqual({ kind: 'server-client' });
    expect(createServerClientMock).toHaveBeenCalled();
    // exercise cookie adapter behavior via the options passed to createServerClient
    const args = createServerClientMock.mock.calls[0];
    const options = args[2];
    options.cookies.set('sb', 'v', {});
    expect(options.cookies.get('sb')).toBe('v');
    options.cookies.remove('sb', {});
    expect(options.cookies.get('sb')).toBeUndefined();
  });
});


