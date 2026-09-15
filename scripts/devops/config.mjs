import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function parameters(env) {
  const environment = env.DEPLOY_ENVIRONMENT;
  if (!['dev', 'test', 'prod'].includes(environment)) throw Error('Ambiente invalido.');
  for (const key of ['AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_SUBSCRIPTION_ID', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ALERT_EMAIL']) {
    if (!env[key]?.trim()) throw Error(`Configure ${key} no GitHub Environment.`);
  }
  const anon = env.SUPABASE_ANON_KEY;
  let anonRole;
  try { anonRole = JSON.parse(Buffer.from(anon.split('.')[1] || '', 'base64url').toString()).role; } catch { /* Chaves publishable nao sao JWT. */ }
  if (anon.startsWith('sb_secret_') || anonRole === 'service_role' || anon === env.SUPABASE_SERVICE_ROLE_KEY) {
    throw Error('Chave privilegiada nao pode ser usada como SUPABASE_ANON_KEY no frontend.');
  }
  const projectUrl = key => {
    const url = new URL(env[key]);
    if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw Error(`Configure ${key} com a URL HTTPS de um projeto Supabase separado.`);
    }
    return url.origin;
  };
  const testUrl = projectUrl('TEST_SUPABASE_URL');
  const prodUrl = projectUrl('PROD_SUPABASE_URL');
  if (testUrl === prodUrl) throw Error('Teste e producao precisam de projetos Supabase distintos. Deploy bloqueado para proteger dados.');
  // As aplicacoes dev/test compartilham somente o projeto nao produtivo.
  const supabaseUrl = projectUrl('SUPABASE_URL');
  if (supabaseUrl !== (environment === 'prod' ? prodUrl : testUrl)) throw Error('SUPABASE_URL diverge do ambiente escolhido.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.ALERT_EMAIL)) throw Error('ALERT_EMAIL invalido.');
  const shippingUrl = env.SHIPPING_URL || 'https://sandbox.melhorenvio.com.br';
  if (!['https://sandbox.melhorenvio.com.br', 'https://melhorenvio.com.br'].includes(shippingUrl)) throw Error('SHIPPING_URL invalida.');
  if (environment !== 'prod' && shippingUrl !== 'https://sandbox.melhorenvio.com.br') throw Error('Frete real bloqueado fora de prod.');
  if (!['0', '1'].includes(env.MIN_REPLICAS || '0')) throw Error('MIN_REPLICAS deve ser 0 ou 1.');
  return Object.fromEntries(Object.entries({
    environment, supabaseUrl,
    supabaseAnonKey: env.SUPABASE_ANON_KEY, supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    alertEmail: env.ALERT_EMAIL, shippingToken: env.SHIPPING_TOKEN || '', shippingUrl,
    minReplicas: Number(env.MIN_REPLICAS || '0'),
  }).map(([key, value]) => [key, { value }]));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const params = parameters(process.env);
  if (process.argv.includes('--write')) {
    for (const key of ['BACKEND_IMAGE', 'FRONTEND_IMAGE']) {
      if (!/^[a-z0-9]+\.azurecr\.io\/(backend|frontend)@sha256:[a-f0-9]{64}$/.test(process.env[key] || '')) throw Error('Imagem deve usar digest SHA256 no ACR.');
    }
    params.backendImage = { value: process.env.BACKEND_IMAGE };
    params.frontendImage = { value: process.env.FRONTEND_IMAGE };
    fs.writeFileSync(path.join(process.env.RUNNER_TEMP, 'bigpecas.parameters.json'), JSON.stringify({
      $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#', contentVersion: '1.0.0.0', parameters: params,
    }), { mode: 0o600 });
  }
  console.log('Configuracao validada; nenhum segredo exibido.');
}
