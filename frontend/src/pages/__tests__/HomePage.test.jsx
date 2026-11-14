import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import HomePage from '../HomePage';
import { useCart } from '../../contexts/CartContext';
import { buscarRecomendacoesPorHistorico, listarCategorias, listarPecas } from '../../services/pecasService';
import { currentLocation, renderPage } from '../../../jest/helpers/render';

jest.mock('../../components/Header', () => () => <header>Cabeçalho</header>);
jest.mock('../../components/Footer', () => () => <footer>Rodapé</footer>);
jest.mock('../../contexts/CartContext', () => ({ useCart: jest.fn() }));
jest.mock('../../services/pecasService', () => ({
  listarPecas: jest.fn(), listarCategorias: jest.fn(), buscarRecomendacoesPorHistorico: jest.fn(),
}));

const addToCart = jest.fn();
const pecas = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1, nome_peca: `Peça ${i + 1}`, preco: 100 * (i + 1), estoque_atual: i === 1 ? 0 : 5,
  imagem: i % 2 ? '' : `p${i}.png`, sku: i === 0 ? '' : `SKU${i}`, condicao: i === 0 ? 'NOS' : '',
}));

beforeEach(() => {
  useCart.mockReturnValue({ addToCart, cartItems: [{ id: 3 }] });
  listarPecas.mockResolvedValue({ data: pecas, total: 1234 });
  listarCategorias.mockResolvedValue([{ id: 1, nome: 'Motor' }, { id: 2, nome: 'Outros' }]);
  buscarRecomendacoesPorHistorico.mockResolvedValue({ recomendacoes: [pecas[4], pecas[5]], baseadoEmHistorico: true });
});

test('mostra destaque, categorias, recomendacoes e estatisticas', async () => {
  renderPage(<HomePage />);
  expect(await screen.findByText('Recomendado para você')).toBeInTheDocument();
  expect(screen.getByText('SKU · BP-0001')).toBeInTheDocument();
  expect(screen.getByText('1.234')).toBeInTheDocument();
  expect(screen.getAllByText('Motor').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Indisponível').length).toBeGreaterThan(0);

  fireEvent.click(screen.getByText('Outros'));
  expect(currentLocation(screen)).toBe('/buscaPecas?categoria_id=2');
  fireEvent.click(screen.getByText('Peça 1', { selector: '.bp-hero__featured-name' }));
  expect(currentLocation(screen)).toBe('/pecas/1');
});

test('adiciona ao carrinho, busca e usa filtros rapidos', async () => {
  jest.useFakeTimers();
  renderPage(<HomePage />);
  await act(async () => { await Promise.resolve(); });
  await waitFor(() => expect(screen.getAllByText('+ Carrinho').length).toBeGreaterThan(0));
  fireEvent.click(screen.getAllByText('+ Carrinho')[0]);
  expect(addToCart).toHaveBeenCalledWith(expect.objectContaining({ id: 5, preco: 500 }));
  expect(screen.getAllByText(/Adicionado/).length).toBeGreaterThan(0);
  act(() => { jest.advanceTimersByTime(2000); });
  jest.useRealTimers();
  expect(screen.getAllByText(/No carrinho/).length).toBeGreaterThan(0);

  fireEvent.change(screen.getByPlaceholderText(/./, { selector: '.bp-hero__search input' }), { target: { value: 'farol' } });
  fireEvent.submit(document.querySelector('.bp-hero__search'));
  expect(currentLocation(screen)).toBe('/buscaPecas?nome=farol');
  fireEvent.change(document.querySelector('.bp-hero__search input'), { target: { value: ' ' } });
  fireEvent.submit(document.querySelector('.bp-hero__search'));
  expect(currentLocation(screen)).toBe('/buscaPecas');

  fireEvent.click(screen.getByText(/≤ R\$\s?500,00/));
  expect(currentLocation(screen)).toBe('/buscaPecas?max_preco=500');
  fireEvent.click(screen.getAllByText('Ver detalhe')[0]);
  expect(currentLocation(screen)).toMatch(/^\/pecas\//);
  document.querySelectorAll('.bp-section__header button').forEach((botao) => fireEvent.click(botao));
  fireEvent.click(screen.getAllByAltText('Peça 1')[0].closest('div'));
});

test('converte filtros de preco para a moeda escolhida', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ moeda: 'BRL', unidades_por_brl: 1 }, { moeda: 'USD', unidades_por_brl: 0.2 }] });
  renderPage(<HomePage />, { language: 'EN', withCurrency: true });
  fireEvent.click(await screen.findByText('≤ $100.00'));
  expect(currentLocation(screen)).toBe('/buscaPecas?max_preco=100');
});

test('sem pecas mostra chamadas para cadastro e trata falhas', async () => {
  listarPecas.mockResolvedValue({});
  listarCategorias.mockResolvedValue(null);
  buscarRecomendacoesPorHistorico.mockRejectedValue(new Error('x'));
  renderPage(<HomePage />);
  fireEvent.click(await screen.findByText('Cadastrar peça'));
  expect(currentLocation(screen)).toBe('/cadastroPecas');
  expect(screen.getByText('Você não tem peças cadastradas ainda.')).toBeInTheDocument();
  expect(screen.queryByText('Recomendado para você')).not.toBeInTheDocument();
});

test('falha ao carregar catalogo nao quebra a pagina', async () => {
  listarPecas.mockRejectedValue(new Error('offline'));
  buscarRecomendacoesPorHistorico.mockResolvedValue({ recomendacoes: [pecas[0]], baseadoEmHistorico: false });
  renderPage(<HomePage />);
  expect(await screen.findByText('Sem peças cadastradas')).toBeInTheDocument();
});
