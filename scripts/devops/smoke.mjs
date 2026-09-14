import assert from 'node:assert/strict';
const api = new URL('/api/health', process.env.BACKEND_URL);
const web = new URL('/', process.env.FRONTEND_URL);
for (const url of [api, web]) if (url.protocol !== 'https:') throw Error('Smoke remoto exige HTTPS.');
let lastError;
for (let attempt = 0; attempt < 12; attempt++) {
  try {
    const health = await fetch(api, { signal: AbortSignal.timeout(15000) });
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, 'ok');
    const page = await fetch(web, { signal: AbortSignal.timeout(15000) });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<div id="root"><\/div>/);
    console.log('Smoke HTTP aprovado. Nao valida conexao com banco ou login.');
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.log(`Tentativa ${attempt + 1}/12 aguardando aplicacao.`);
    if (attempt < 11) await new Promise(resolve => setTimeout(resolve, 10000));
  }
}
throw lastError;
