import {
  listarPecas,
  listarMinhasPecas,
  listarCategorias,
  listarMateriais,
  cadastrarPeca,
  buscarPecaPorId,
  atualizarPeca,
  deletarPeca,
  listarWish,
  buscarStatusWish,
  adicionarPecaWish,
  removerPecaWish,
  buscarRecomendacoesPorPeca,
  buscarFornecedoresRecomendados,
  buscarPerfilFornecedor,
} from '../pecasService';
import { getSupabaseClient } from '../supabase';
import { criarResposta, respostaDeErro, sessaoValida } from '../../../jest/helpers/http';

jest.mock('../supabase');

const API = 'http://localhost:3001/api';
const PECA = { id: 10, nome_peca: 'Friso Opala', preco: 350 };

function mockarSessao(resultado = sessaoValida()) {
  getSupabaseClient.mockReturnValue({
    auth: { getSession: jest.fn().mockResolvedValue(resultado) },
  });
}

function urlChamada(indice = 0) {
  return global.fetch.mock.calls[indice][0];
}

function opcoesChamada(indice = 0) {
  return global.fetch.mock.calls[indice][1];
}

describe('pecasService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    mockarSessao();
  });

  describe('listarPecas', () => {
    it('devolve os dados junto com os metadados de paginacao dos headers', async () => {
      global.fetch.mockResolvedValue(criarResposta({
        body: [PECA],
        headers: { 'X-Total-Count': 137, 'X-Page': 2, 'X-Page-Size': 40 },
      }));

      await expect(listarPecas()).resolves.toEqual({
        data: [PECA],
        total: 137,
        page: 2,
        pageSize: 40,
        hasMore: true,
      });
    });

    it('marca hasMore como false na ultima pagina', async () => {
      global.fetch.mockResolvedValue(criarResposta({
        body: [PECA],
        headers: { 'X-Total-Count': 41, 'X-Page': 2, 'X-Page-Size': 40 },
      }));

      await expect(listarPecas()).resolves.toMatchObject({ hasMore: false });
    });

    it('usa o tamanho da lista quando o backend nao envia os headers', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: [PECA, PECA] }));

      await expect(listarPecas()).resolves.toMatchObject({ total: 2, page: 1, pageSize: 2 });
    });

    it('monta a query string ignorando filtros vazios', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: [] }));

      await listarPecas({ nome: 'friso', categoria_id: 1, material_id: '', condicao: null, page: undefined });

      expect(urlChamada()).toBe(`${API}/pecas?nome=friso&categoria_id=1`);
    });

    it('chama a rota sem query quando nao ha filtros', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: [] }));

      await listarPecas();

      expect(urlChamada()).toBe(`${API}/pecas`);
    });

    it('propaga a mensagem de erro do backend', async () => {
      global.fetch.mockResolvedValue(
        respostaDeErro(400, { error: 'O campo de ordenação informado é inválido.' }),
      );

      await expect(listarPecas()).rejects.toThrow('O campo de ordenação informado é inválido.');
    });

    it('converte falha de rede em mensagem amigavel', async () => {
      global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(listarPecas()).rejects.toThrow(
        'Não foi possível se conectar ao servidor. Tente novamente em instantes.',
      );
    });
  });

  describe('listarMinhasPecas', () => {
    it('sempre envia minhas_pecas=true', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: [] }));

      await listarMinhasPecas();

      expect(urlChamada()).toBe(`${API}/pecas?minhas_pecas=true`);
    });

    it('mantem os demais filtros junto do minhas_pecas', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: [] }));

      await listarMinhasPecas({ sort: 'preco' });

      expect(urlChamada()).toBe(`${API}/pecas?sort=preco&minhas_pecas=true`);
    });
  });

  describe.each([
    ['listarCategorias', listarCategorias, `${API}/categorias`],
    ['listarMateriais', listarMateriais, `${API}/materiais`],
  ])('%s', (_nome, funcao, url) => {
    it('devolve a lista do backend', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: [{ id: 1, nome: 'Motor' }] }));

      await expect(funcao()).resolves.toEqual([{ id: 1, nome: 'Motor' }]);
      expect(urlChamada()).toBe(url);
    });

    it('avisa quando o servico esta indisponivel', async () => {
      global.fetch.mockResolvedValue(respostaDeErro(503, {}));

      await expect(funcao()).rejects.toThrow(
        'O serviço está temporariamente indisponível. Tente novamente em instantes.',
      );
    });

    it('usa a mensagem especifica da tela para status sem traducao propria', async () => {
      global.fetch.mockResolvedValue(respostaDeErro(418, {}));

      await expect(funcao()).rejects.toThrow(/Não foi possível carregar/);
    });
  });

  describe('cadastrarPeca', () => {
    it('envia os dados da peca como JSON', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { id: 10, peca: PECA } }));

      await cadastrarPeca({ nome_peca: 'Friso Opala', preco: 350 });

      expect(urlChamada()).toBe(`${API}/pecas/cadastrar`);
      expect(opcoesChamada().method).toBe('POST');
      expect(JSON.parse(opcoesChamada().body)).toEqual({ nome_peca: 'Friso Opala', preco: 350 });
    });

    it('propaga a regra de negocio recusada pelo backend', async () => {
      global.fetch.mockResolvedValue(
        respostaDeErro(409, { error: 'Configure o nome e a descrição da sua loja antes de cadastrar uma peça.' }),
      );

      await expect(cadastrarPeca({})).rejects.toThrow(/Configure o nome e a descrição/);
    });
  });

  describe('atualizarPeca', () => {
    it('remove campos vazios antes de enviar', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { peca: PECA } }));

      await atualizarPeca(10, { preco: 400, sku: '', oem_number: null, num_serie: undefined, estoque_atual: 0 });

      expect(JSON.parse(opcoesChamada().body)).toEqual({ preco: 400, estoque_atual: 0 });
      expect(opcoesChamada().method).toBe('PUT');
    });

    it('usa o id na URL', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: {} }));

      await atualizarPeca(10, { preco: 400 });

      expect(urlChamada()).toBe(`${API}/pecas/10`);
    });

    it('propaga o 403 de peca de outro fornecedor', async () => {
      global.fetch.mockResolvedValue(
        respostaDeErro(403, { error: 'Você só pode atualizar peças cadastradas por você.' }),
      );

      await expect(atualizarPeca(10, { preco: 400 })).rejects.toThrow(
        'Você só pode atualizar peças cadastradas por você.',
      );
    });
  });

  describe('buscarPecaPorId', () => {
    it('devolve a peca', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: PECA }));

      await expect(buscarPecaPorId(10)).resolves.toEqual(PECA);
    });

    it('avisa quando a peca nao existe', async () => {
      global.fetch.mockResolvedValue(respostaDeErro(404, {}));

      await expect(buscarPecaPorId(999)).rejects.toThrow('O item solicitado não foi encontrado.');
    });
  });

  describe('deletarPeca', () => {
    it('usa o metodo DELETE', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { message: 'Peça deletada com sucesso!' } }));

      await deletarPeca(10);

      expect(opcoesChamada().method).toBe('DELETE');
      expect(urlChamada()).toBe(`${API}/pecas/10`);
    });
  });

  describe('lista de desejos', () => {
    it('lista os itens salvos', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { total: 1, pecas: [PECA] } }));

      await expect(listarWish()).resolves.toMatchObject({ total: 1 });
      expect(urlChamada()).toBe(`${API}/wish`);
    });

    it('consulta o status de uma peca', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { peca_id: 10, in_wish: true } }));

      await expect(buscarStatusWish(10)).resolves.toMatchObject({ in_wish: true });
      expect(urlChamada()).toBe(`${API}/wish/status/10`);
    });

    it('adiciona uma peca com POST', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { item: { id: 1 } } }));

      await adicionarPecaWish(10);

      expect(urlChamada()).toBe(`${API}/wish/10`);
      expect(opcoesChamada().method).toBe('POST');
    });

    it('remove uma peca com DELETE', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { peca_id: 10 } }));

      await removerPecaWish(10);

      expect(opcoesChamada().method).toBe('DELETE');
    });

    it('avisa quando a peca nao pode ser adicionada', async () => {
      global.fetch.mockResolvedValue(respostaDeErro(404, {}));

      await expect(adicionarPecaWish(10)).rejects.toThrow('O item solicitado não foi encontrado.');
    });
  });

  describe('buscarRecomendacoesPorPeca', () => {
    it('desembrulha a lista de recomendacoes', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { total: 1, recomendacoes: [PECA] } }));

      await expect(buscarRecomendacoesPorPeca(10)).resolves.toEqual([PECA]);
    });

    it('devolve lista vazia quando a resposta nao traz recomendacoes', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: {} }));

      await expect(buscarRecomendacoesPorPeca(10)).resolves.toEqual([]);
    });

    it('usa o limite padrao de 4 e respeita o limite informado', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { recomendacoes: [] } }));

      await buscarRecomendacoesPorPeca(10);
      await buscarRecomendacoesPorPeca(10, 8);

      expect(urlChamada(0)).toBe(`${API}/pecas/10/recomendacoes?limite=4`);
      expect(urlChamada(1)).toBe(`${API}/pecas/10/recomendacoes?limite=8`);
    });
  });

  describe('buscarFornecedoresRecomendados', () => {
    it('desembrulha a lista de fornecedores', async () => {
      global.fetch.mockResolvedValue(
        criarResposta({ body: { total: 1, fornecedores: [{ id: 5, nome_loja: 'Loja do Zé' }] } }),
      );

      await expect(buscarFornecedoresRecomendados()).resolves.toEqual([
        { id: 5, nome_loja: 'Loja do Zé' },
      ]);
      expect(urlChamada()).toBe(`${API}/pecas/fornecedores/recomendados?limite=4`);
    });

    it('devolve lista vazia quando nao ha fornecedores', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: {} }));

      await expect(buscarFornecedoresRecomendados()).resolves.toEqual([]);
    });
  });

  describe('buscarPerfilFornecedor', () => {
    it('devolve o perfil com as pecas', async () => {
      const perfil = { fornecedor: { id: 5 }, pecas: [PECA] };
      global.fetch.mockResolvedValue(criarResposta({ body: perfil }));

      await expect(buscarPerfilFornecedor(5)).resolves.toEqual(perfil);
      expect(urlChamada()).toBe(`${API}/pecas/fornecedores/5/perfil`);
    });

    it('avisa quando o vendedor nao existe', async () => {
      global.fetch.mockResolvedValue(respostaDeErro(404, { error: 'Fornecedor não encontrado.' }));

      await expect(buscarPerfilFornecedor(99)).rejects.toThrow('Fornecedor não encontrado.');
    });
  });

  describe('autenticacao', () => {
    it('exige token em todas as chamadas', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: [] }));

      await listarPecas();

      expect(opcoesChamada().headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-de-teste',
      });
    });

    it('recusa quando nao ha sessao ativa', async () => {
      mockarSessao({ data: { session: null }, error: null });

      await expect(listarPecas()).rejects.toThrow('Você precisa estar autenticado para continuar.');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('recusa quando o Supabase nao esta configurado', async () => {
      getSupabaseClient.mockImplementation(() => {
        throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env do front-end.');
      });

      await expect(listarPecas()).rejects.toThrow(
        'Não foi possível carregar os dados agora. Tente novamente em instantes.',
      );
    });
  });
});
