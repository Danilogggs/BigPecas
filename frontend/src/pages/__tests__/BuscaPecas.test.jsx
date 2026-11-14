import { fireEvent, screen, waitFor } from '@testing-library/react';
import BuscaPecas from '../BuscaPecas';
import * as api from '../../services/pecasService';
import { renderPage } from '../../../jest/helpers/render';

jest.mock('../../components/Header', () => () => <header>Cabeçalho</header>);
jest.mock('../../services/pecasService', () => ({
  listarPecas: jest.fn(), listarCategorias: jest.fn(), listarWish: jest.fn(), adicionarPecaWish: jest.fn(), removerPecaWish: jest.fn(),
}));

const pecas = [
  { id: 1, nome_peca: 'Farol', preco: 1500, estoque_atual: 2, imagem: 'f.png', sku: 'F1', oem_number: 'OEM1', condicao: 'NOS', categoria_id: 1 },
  { id: 2, nome_peca: '', preco_base: 20, moeda_base: 'USD', estoque_atual: 0, categoria_id: 9 },
];

beforeEach(() => {
  api.listarPecas.mockResolvedValue({ data: pecas, total: 2, hasMore: true });
  api.listarCategorias.mockResolvedValue([{ id: 1, nome: 'Motor' }]);
  api.listarWish.mockResolvedValue({ pecas: [{ id: 1 }] });
  api.adicionarPecaWish.mockResolvedValue({});
  api.removerPecaWish.mockResolvedValue({});
});

test('lista pecas, ordena, filtra e carrega mais', async () => {
  renderPage(<BuscaPecas />, { route: '/buscaPecas?nome=farol' });
  expect(await screen.findByText('Farol')).toBeInTheDocument();
  expect(screen.getAllByText('Peça sem nome').length).toBeGreaterThan(0);
  expect(screen.getByText(/R\$\s?1\.500,00/)).toBeInTheDocument();
  expect(screen.getByText('Sem imagem')).toBeInTheDocument();

  fireEvent.click(screen.getByText(/Data de Cadastro/));
  await waitFor(() => expect(api.listarPecas).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'data_cadastro', ordem: 'asc' })));
  fireEvent.click(screen.getByText(/Data de Cadastro/));
  fireEvent.click(screen.getByText(/^Preço/));

  fireEvent.click(screen.getByText('Mostrar Filtros'));
  fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'roda' } });
  fireEvent.change(document.querySelector('select[name="categoria_id"]'), { target: { value: '1' } });
  fireEvent.change(document.querySelector('select[name="condicao"]'), { target: { value: 'BOM' } });
  const [minimo, maximo] = document.querySelectorAll('input[type="number"]');
  fireEvent.change(minimo, { target: { value: '100' } });
  fireEvent.change(maximo, { target: { value: '50' } });
  const [sliderMin, sliderMax] = document.querySelectorAll('input[type="range"]');
  fireEvent.change(sliderMin, { target: { value: '10' } });
  fireEvent.change(sliderMax, { target: { value: '90' } });
  await waitFor(() => expect(api.listarPecas).toHaveBeenLastCalledWith(expect.objectContaining({ nome: 'roda', condicao: 'BOM' })), { timeout: 2000 });
  fireEvent.click(screen.getByText('Esconder Filtros'));

  fireEvent.click(screen.getByText('Carregar mais peças'));
  await waitFor(() => expect(api.listarPecas).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
});

test('alterna favoritos e mostra feedback', async () => {
  renderPage(<BuscaPecas />);
  await screen.findByText('Farol');
  const [remover, adicionar] = screen.getAllByRole('button').filter((botao) => botao.title);
  fireEvent.click(remover);
  expect(await screen.findByText('Peça removida da sua lista de desejos.')).toBeInTheDocument();
  fireEvent.click(adicionar);
  expect(await screen.findByText('Peça adicionada à sua lista de desejos.')).toBeInTheDocument();
});

test('estados de vazio e erro', async () => {
  api.listarPecas.mockResolvedValue({ data: [], total: 0 });
  const { unmount } = renderPage(<BuscaPecas />);
  expect(await screen.findByText('Nenhuma peça foi encontrada com os filtros informados.')).toBeInTheDocument();
  unmount();
  api.listarPecas.mockRejectedValue(new Error('offline'));
  renderPage(<BuscaPecas />);
  expect(await screen.findByText(/offline|Não foi possível/)).toBeInTheDocument();
});

test('em ingles usa a moeda do usuario', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ moeda: 'BRL', unidades_por_brl: 1 }, { moeda: 'USD', unidades_por_brl: 0.2 }] });
  renderPage(<BuscaPecas />, { language: 'EN', withCurrency: true });
  expect(await screen.findByText('$300.00')).toBeInTheDocument();
  expect(screen.getByText('$20.00')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Show filters'));
  expect(screen.getByText(/USD/)).toBeInTheDocument();
});
