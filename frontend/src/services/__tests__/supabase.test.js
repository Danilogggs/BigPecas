import { createClient } from '@supabase/supabase-js';
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({ auth: {} })) }));
const originalEnv = { ...globalThis.__VITE_IMPORT_META__.env };
afterEach(() => { globalThis.__VITE_IMPORT_META__.env = { ...originalEnv }; });
test('cria cliente com persistência e recuperação de sessão', () => {
  jest.isolateModules(() => {
    const { getSupabaseClient, hasSupabaseConfig, supabase } = require('../supabase');
    expect(hasSupabaseConfig).toBe(true);
    expect(getSupabaseClient()).toBe(supabase);
    expect(createClient).toHaveBeenCalledWith(originalEnv.VITE_SUPABASE_URL, originalEnv.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  });
});
test.each(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])('informa configuração ausente: %s', key => {
  globalThis.__VITE_IMPORT_META__.env[key] = '';
  jest.isolateModules(() => {
    const { getSupabaseClient, hasSupabaseConfig, supabase } = require('../supabase');
    expect(hasSupabaseConfig).toBe(false);
    expect(supabase).toBeNull();
    expect(getSupabaseClient).toThrow('Configure VITE_SUPABASE_URL');
  });
});
