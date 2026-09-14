import test from 'node:test';
import assert from 'node:assert/strict';
import { parameters } from './config.mjs';
const base = {
  DEPLOY_ENVIRONMENT: 'dev', AZURE_CLIENT_ID: 'client', AZURE_TENANT_ID: 'tenant', AZURE_SUBSCRIPTION_ID: 'subscription',
  SUPABASE_URL: 'https://test-project.supabase.co',
  TEST_SUPABASE_URL: 'https://test-project.supabase.co', PROD_SUPABASE_URL: 'https://prod-project.supabase.co',
  SUPABASE_ANON_KEY: 'fake-anon', SUPABASE_SERVICE_ROLE_KEY: 'fake-service', ALERT_EMAIL: 'test@example.com',
};
test('gera parametros isolados com defaults seguros', () => {
  const p = parameters(base);
  assert.equal(p.environment.value, 'dev');
  assert.equal(p.minReplicas.value, 0);
  assert.equal(p.shippingUrl.value, 'https://sandbox.melhorenvio.com.br');
});
for (const [name, change] of Object.entries({
  'ambiente desconhecido': { DEPLOY_ENVIRONMENT: 'staging' },
  'banco compartilhado': { TEST_SUPABASE_URL: base.PROD_SUPABASE_URL },
  'banco de producao em dev': { SUPABASE_URL: base.PROD_SUPABASE_URL },
  'secret ausente': { SUPABASE_SERVICE_ROLE_KEY: '' },
  'URL insegura': { TEST_SUPABASE_URL: 'http://test-project.supabase.co' },
  'banco de producao em test': { DEPLOY_ENVIRONMENT: 'test', SUPABASE_URL: base.PROD_SUPABASE_URL },
  'banco de teste em prod': { DEPLOY_ENVIRONMENT: 'prod' },
  'URL do ambiente com query': { SUPABASE_URL: `${base.SUPABASE_URL}?token=bad` },
  'producao sem configuracao': { PROD_SUPABASE_URL: '' },
  'frete real em dev': { SHIPPING_URL: 'https://melhorenvio.com.br' },
  'replicas fora do limite': { MIN_REPLICAS: '3' },
  'email invalido': { ALERT_EMAIL: 'no-email' },
  'secret no frontend': { SUPABASE_ANON_KEY: 'sb_secret_fake' },
  'service role como anon': { SUPABASE_ANON_KEY: `header.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature` },
  'chaves identicas': { SUPABASE_ANON_KEY: base.SUPABASE_SERVICE_ROLE_KEY },
})) test(`bloqueia ${name}`, () => assert.throws(() => parameters({ ...base, ...change })));
for (const environment of ['dev', 'test', 'prod']) {
  test(`seleciona o banco correto para ${environment}`, () => {
    const url = environment === 'prod' ? base.PROD_SUPABASE_URL : base.TEST_SUPABASE_URL;
    const p = parameters({ ...base, DEPLOY_ENVIRONMENT: environment, SUPABASE_URL: `${url}/` });
    assert.equal(p.supabaseUrl.value, url);
    assert.equal(p.environment.value, environment);
  });
}
