const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: null,
}));

const initializeDatabaseData = require('../../src/services/initializeDatabaseData');
const logger = require('../../src/utils/logger');

function insercoes(tabela) {
  return mockSupabaseAdmin
    .__callsFor(tabela)
    .filter((consulta) => consulta.operacao('insert'))
    .map((consulta) => consulta.argumentos('insert')[0]);
}

describe('initializeDatabaseData', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
  });

  it('insere categorias e materiais padrao quando as tabelas estao vazias', async () => {
    mockSupabaseAdmin.__mockTable('categorias', { count: 0, error: null });
    mockSupabaseAdmin.__mockTable('materiais', { count: 0, error: null });

    await initializeDatabaseData();

    expect(insercoes('categorias')[0]).toEqual(
      expect.arrayContaining([{ nome: 'Motor' }, { nome: 'Freios' }]),
    );
    expect(insercoes('materiais')[0]).toEqual(
      expect.arrayContaining([{ nome: 'Aço' }, { nome: 'Borracha' }]),
    );
  });

  it('conta os registros sem trazer dados (head)', async () => {
    mockSupabaseAdmin.__mockTable('categorias', { count: 6, error: null });
    mockSupabaseAdmin.__mockTable('materiais', { count: 6, error: null });

    await initializeDatabaseData();

    const [contagem] = mockSupabaseAdmin.__callsFor('categorias');
    expect(contagem.argumentos('select')).toEqual(['*', { count: 'exact', head: true }]);
  });

  it('nao insere nada quando as tabelas ja tem dados', async () => {
    mockSupabaseAdmin.__mockTable('categorias', { count: 6, error: null });
    mockSupabaseAdmin.__mockTable('materiais', { count: 2, error: null });

    await initializeDatabaseData();

    expect(insercoes('categorias')).toHaveLength(0);
    expect(insercoes('materiais')).toHaveLength(0);
  });

  it('nao derruba a inicializacao do servidor quando o Supabase falha', async () => {
    const aviso = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    mockSupabaseAdmin.__mockTable('categorias', {
      count: null,
      error: { message: 'relation "categorias" does not exist' },
    });

    await expect(initializeDatabaseData()).resolves.toBeUndefined();
    expect(aviso).toHaveBeenCalledWith(
      'Nao foi possivel inicializar dados padrao',
      { error: 'relation "categorias" does not exist' },
    );
  });

  it('interrompe o seed quando a insercao falha, sem tentar a proxima tabela', async () => {
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    mockSupabaseAdmin.__queueTable('categorias', { count: 0, error: null }, { error: { message: 'sem permissao' } });

    await initializeDatabaseData();

    expect(mockSupabaseAdmin.__callsFor('materiais')).toHaveLength(0);
  });
});
