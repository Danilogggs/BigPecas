import assert from 'node:assert/strict';
const api = new URL('/api/health', process.env.BACKEND_URL);
const web = new URL('/', process.env.FRONTEND_URL);
const currency = new URL('/api/moeda/config', process.env.BACKEND_URL);
const environment = process.env.DEPLOY_ENVIRONMENT;
for (const url of [api, web, currency]) if (url.protocol !== 'https:') throw Error('Smoke remoto exige HTTPS.');
if (!['dev', 'test', 'prod'].includes(environment)) throw Error('Ambiente de smoke invalido.');
let lastError;
for (let attempt = 0; attempt < 12; attempt++) {
  try {
    const health = await fetch(api, { signal: AbortSignal.timeout(15000) });
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, 'ok');
    assert.equal(health.headers.get('access-control-allow-origin'), process.env.FRONTEND_URL);
    const page = await fetch(web, { signal: AbortSignal.timeout(15000) });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<div id="root"><\/div>/);
    if (environment === 'test') {
      const config = await fetch(currency, { signal: AbortSignal.timeout(15000) });
      assert.equal(config.status, 200);
      const rates = await config.json();
      assert.ok(Array.isArray(rates));
      assert.ok(rates.some(rate => rate.moeda === 'BRL' && Number(rate.unidades_por_brl) === 1));
      console.log('Homologacao de test aprovada: HTTPS, CORS e leitura real do Supabase.');
    } else {
      console.log('Smoke HTTP aprovado. Nao valida login.');
    }
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.log(`Tentativa ${attempt + 1}/12 aguardando aplicacao.`);
    if (attempt < 11) await new Promise(resolve => setTimeout(resolve, 10000));
  }
}
throw lastError;
