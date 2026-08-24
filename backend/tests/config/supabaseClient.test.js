const mockCreateClient = jest.fn((url, key) => ({ url, key }));

jest.mock('@supabase/supabase-js', () => ({ createClient: mockCreateClient }));

const CAMINHO_MODULO = '../../src/config/supabaseClient';

function carregarComEnv(env) {
  jest.resetModules();
  mockCreateClient.mockClear();

  const original = { ...process.env };
  Object.keys(env).forEach((chave) => {
    if (env[chave] === undefined) delete process.env[chave];
    else process.env[chave] = env[chave];
  });

  try {
    return require(CAMINHO_MODULO);
  } finally {
    process.env = original;
  }
}

const ENV_VALIDA = {
  SUPABASE_URL: 'https://projeto.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  SUPABASE_ANON_KEY: 'anon',
};

describe('supabaseClient', () => {
  it('cria o cliente admin com a service role key e sessao desligada', () => {
    const { supabaseAdmin } = carregarComEnv(ENV_VALIDA);

    expect(supabaseAdmin).toEqual({ url: ENV_VALIDA.SUPABASE_URL, key: 'service-role' });
    expect(mockCreateClient).toHaveBeenCalledWith(ENV_VALIDA.SUPABASE_URL, 'service-role', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  it('cria o cliente publico quando a anon key esta configurada', () => {
    const { supabasePublic } = carregarComEnv(ENV_VALIDA);

    expect(supabasePublic).toEqual({ url: ENV_VALIDA.SUPABASE_URL, key: 'anon' });
  });

  it('deixa o cliente publico nulo quando a anon key nao esta configurada', () => {
    const { supabasePublic } = carregarComEnv({ ...ENV_VALIDA, SUPABASE_ANON_KEY: undefined });

    expect(supabasePublic).toBeNull();
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['SUPABASE_URL', 'SUPABASE_URL'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  ])('falha na inicializacao quando %s esta ausente', (variavel) => {
    expect(() => carregarComEnv({ ...ENV_VALIDA, [variavel]: undefined })).toThrow(variavel);
  });
});
