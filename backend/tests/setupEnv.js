// Variaveis minimas para que os modulos possam ser carregados sem um .env real.
// Os testes sempre mockam o Supabase, entao os valores abaixo nunca sao usados de verdade.
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://projeto-de-teste.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-de-teste';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-de-teste';
