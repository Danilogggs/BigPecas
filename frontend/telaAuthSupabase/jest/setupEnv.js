// Substitui o `import.meta.env` do Vite (veja jest/babel-plugin-import-meta.cjs).
// Os testes sempre mockam o fetch e o cliente do Supabase, entao os valores
// abaixo servem apenas para montar as URLs.
globalThis.__VITE_IMPORT_META__ = {
  env: {
    MODE: 'test',
    DEV: false,
    PROD: false,
    VITE_API_URL: 'http://localhost:3001',
    VITE_SUPABASE_URL: 'https://projeto-de-teste.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon-de-teste',
  },
};
