import { act, renderHook, waitFor } from '@testing-library/react';
import useCatalogoPecas from '../useCatalogoPecas';
import { LanguageProvider } from '../../../../contexts/LanguageContext';
import { CurrencyProvider } from '../../../../contexts/CurrencyContext';

const evento = () => ({ preventDefault: jest.fn(), stopPropagation: jest.fn() });

function criarGateway(overrides = {}) {
  return {
    listarCategorias: jest.fn().mockResolvedValue([{ id: 1, nome: 'Motor' }]),
    listarPecas: jest.fn().mockResolvedValue({ data: [{ id: 1 }, { id: 2 }], total: 30, hasMore: true }),
    listarWish: jest.fn().mockResolvedValue({ pecas: [{ id: 2 }] }),
    adicionarPecaWish: jest.fn().mockResolvedValue({}),
    removerPecaWish: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
}

const wrapper = ({ children }) => <LanguageProvider>{children}</LanguageProvider>;
const montar = (gateway, params = '') => {
  const searchParams = new URLSearchParams(params);
  return renderHook(() => useCatalogoPecas({ searchParams, gateway }), { wrapper });
};

test('carrega categorias, pecas, favoritos e pagina', async () => {
  const gateway = criarGateway();
  const { result } = montar(gateway, 'nome=opala&categoria_id=1&min_preco=10&max_preco=500');
  await waitFor(() => expect(result.current.pecas).toHaveLength(2));
  expect(result.current.filters).toMatchObject({ nome: 'opala', categoria_id: '1', min_preco: 10, max_preco: 500 });
  expect(result.current.totalPecas).toBe(30);
  expect(result.current.hasMore).toBe(true);
  expect(result.current.wishIds.has('2')).toBe(true);
  expect(result.current.buscarNomeCategoria(1)).toBe('Motor');
  expect(result.current.buscarNomeCategoria(99)).toBe('Categoria não informada');
  expect(result.current.formatarPreco(10)).toContain('10');
  await act(async () => { await result.current.handleCarregarMais(); });
  expect(result.current.pecas).toHaveLength(4);
  expect(gateway.listarPecas).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, moeda: 'BRL' }));
});

test('ordena, filtra e alterna favoritos', async () => {
  jest.useFakeTimers();
  const gateway = criarGateway();
  const { result } = montar(gateway);
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.handleSortClick('preco'));
  expect(result.current.ordem).toBe('desc');
  act(() => result.current.handleSortClick('preco'));
  expect(result.current.ordem).toBe('asc');
  act(() => result.current.handleSortClick('nome'));
  expect(result.current).toMatchObject({ sort: 'nome', ordem: 'asc' });
  act(() => result.current.handleChange({ target: { name: 'nome', value: 'farol' } }));
  await act(async () => { jest.advanceTimersByTime(400); });
  expect(gateway.listarPecas).toHaveBeenLastCalledWith(expect.objectContaining({ nome: 'farol' }));

  await act(async () => { await result.current.handleWishClick(evento(), { id: 1 }); });
  expect(gateway.adicionarPecaWish).toHaveBeenCalledWith(1);
  expect(result.current.feedbackMessage).toBe('Peça adicionada à sua lista de desejos.');
  await act(async () => { await result.current.handleWishClick(evento(), { id: 1 }); });
  expect(gateway.removerPecaWish).toHaveBeenCalledWith(1);
  expect(result.current.wishIds.has('1')).toBe(false);
  act(() => { jest.advanceTimersByTime(3000); });
  expect(result.current.feedbackMessage).toBe('');
  await act(async () => { await result.current.handleWishClick(evento(), null); });
  expect(gateway.adicionarPecaWish).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

test('trata falhas de categorias, pecas, favoritos e respostas incompletas', async () => {
  const gateway = criarGateway({
    listarCategorias: jest.fn().mockRejectedValue(new Error('sem categorias')),
    listarPecas: jest.fn().mockRejectedValue(new Error('offline')),
    adicionarPecaWish: jest.fn().mockRejectedValue(new Error('x')),
  });
  const { result } = montar(gateway);
  await waitFor(() => expect(result.current.loadingCategorias).toBe(false));
  await waitFor(() => expect(result.current.errorMessage).toBeTruthy());
  expect(result.current.shouldShowEmptyState).toBe(false);
  await act(async () => { await result.current.handleWishClick(evento(), { id: 5 }); });
  expect(result.current.feedbackMessage).toBeTruthy();

  const incompleto = criarGateway({
    listarCategorias: jest.fn().mockResolvedValue(null),
    listarPecas: jest.fn().mockResolvedValue({}),
    listarWish: jest.fn().mockRejectedValue(new Error('x')),
  });
  const vazio = montar(incompleto);
  await waitFor(() => expect(vazio.result.current.shouldShowEmptyState).toBe(true));
  expect(vazio.result.current.categorias).toEqual([]);
  expect(vazio.result.current.totalPecas).toBe(0);

  const semMensagem = criarGateway({ listarCategorias: jest.fn().mockRejectedValue({}), listarWish: jest.fn().mockResolvedValue({}) });
  const fallback = montar(semMensagem);
  await waitFor(() => expect(fallback.result.current.errorMessage).toBe('Não foi possível carregar as categorias agora.'));
});

test('mantem itens ja carregados quando a pagina seguinte falha', async () => {
  const gateway = criarGateway();
  const { result } = montar(gateway);
  await waitFor(() => expect(result.current.pecas).toHaveLength(2));
  gateway.listarPecas.mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await result.current.handleCarregarMais(); });
  expect(result.current.pecas).toHaveLength(2);
  expect(result.current.errorMessage).toBeTruthy();
});

test('usa a moeda do usuario quando ha CurrencyProvider', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ moeda: 'BRL', unidades_por_brl: 1 }, { moeda: 'USD', unidades_por_brl: 0.2 }] });
  localStorage.setItem('bigpecas-language', 'EN');
  const gateway = criarGateway();
  const searchParams = new URLSearchParams();
  const { result } = renderHook(
    () => useCatalogoPecas({ searchParams, gateway }),
    { wrapper: ({ children }) => <LanguageProvider><CurrencyProvider>{children}</CurrencyProvider></LanguageProvider> },
  );
  await waitFor(() => expect(gateway.listarPecas).toHaveBeenCalledWith(expect.objectContaining({ moeda: 'USD' })));
  expect(result.current.formatarPreco(100)).toBe('$100.00');
});
