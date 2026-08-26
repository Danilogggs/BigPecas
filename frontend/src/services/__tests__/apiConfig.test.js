const CAMINHO_MODULO = '../apiConfig';

function carregarComEnv(env) {
  jest.resetModules();

  const original = globalThis.__VITE_IMPORT_META__;
  globalThis.__VITE_IMPORT_META__ = { env };

  try {
    return require(CAMINHO_MODULO);
  } finally {
    globalThis.__VITE_IMPORT_META__ = original;
  }
}

describe('apiConfig', () => {
  it('usa VITE_API_URL como origem da API', () => {
    const { AUTH_API_URL, API_BASE_URL } = carregarComEnv({ VITE_API_URL: 'https://api.bigpecas.com' });

    expect(AUTH_API_URL).toBe('https://api.bigpecas.com');
    expect(API_BASE_URL).toBe('https://api.bigpecas.com/api');
  });

  it('aceita VITE_AUTH_API_URL como alternativa', () => {
    const { AUTH_API_URL } = carregarComEnv({ VITE_AUTH_API_URL: 'https://auth.bigpecas.com' });

    expect(AUTH_API_URL).toBe('https://auth.bigpecas.com');
  });

  it('cai no backend local quando nada esta configurado', () => {
    const { AUTH_API_URL, API_BASE_URL } = carregarComEnv({});

    expect(AUTH_API_URL).toBe('http://localhost:3001');
    expect(API_BASE_URL).toBe('http://localhost:3001/api');
  });

  it.each([
    ['https://api.bigpecas.com/', 'https://api.bigpecas.com'],
    ['https://api.bigpecas.com///', 'https://api.bigpecas.com'],
  ])('remove as barras finais de %s', (configurado, esperado) => {
    expect(carregarComEnv({ VITE_API_URL: configurado }).AUTH_API_URL).toBe(esperado);
  });

  it('permite apontar a API de peças para outra origem', () => {
    const { API_BASE_URL } = carregarComEnv({
      VITE_API_URL: 'https://api.bigpecas.com',
      VITE_PECAS_API_URL: 'https://pecas.bigpecas.com/api/',
    });

    expect(API_BASE_URL).toBe('https://pecas.bigpecas.com/api');
  });

  it('VITE_API_URL tem prioridade sobre VITE_AUTH_API_URL', () => {
    const { AUTH_API_URL } = carregarComEnv({
      VITE_API_URL: 'https://principal.bigpecas.com',
      VITE_AUTH_API_URL: 'https://auth.bigpecas.com',
    });

    expect(AUTH_API_URL).toBe('https://principal.bigpecas.com');
  });
});
