import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import DetalhePeca from '../DetalhePeca';
import { useCart } from '../../contexts/CartContext';
import * as pecas from '../../services/pecasService';
import { buscarAvaliacoesFornecedor, buscarAvaliacoesProduto } from '../../services/avaliacoesService';
import { buscarUsuarioPorId } from '../../services/usuarioService';
import { currentLocation, renderPage } from '../../../jest/helpers/render';

jest.mock('../../components/Header', () => () => <header>Cabeçalho</header>);
jest.mock('../../contexts/CartContext', () => ({ useCart: jest.fn() }));
jest.mock('../../services/pecasService', () => ({
  adicionarPecaWish: jest.fn(), buscarFornecedoresRecomendados: jest.fn(), buscarPecaPorId: jest.fn(),
  buscarRecomendacoesPorPeca: jest.fn(), buscarStatusWish: jest.fn(), listarCategorias: jest.fn(),
  listarMateriais: jest.fn(), removerPecaWish: jest.fn(),
}));
jest.mock('../../services/avaliacoesService', () => ({ buscarAvaliacoesFornecedor: jest.fn(), buscarAvaliacoesProduto: jest.fn() }));
jest.mock('../../services/usuarioService', () => ({ buscarUsuarioPorId: jest.fn() }));

const addToCart = jest.fn();
const removeFromCart = jest.fn();
const peca = {
  id: 7, nome_peca: 'Farol Opala', preco: 1500, estoque_atual: 1200, imagem: 'f.png', url_video: 'v.mp4', sku: 'F-1',
  oem_number: 'OEM', num_serie: 'S1', condicao: 'NOS', categoria_id: 1, material_id: 2, fornecedor_id: 3,
  data_cadastro: '2026-01-31T12:00:00', peso_gramas: 1500, comprimento_mm: 300, largura_mm: 20, altura_mm: 0,
  detalhes_gravacao: 'Gravação X', historico_proveniencia: 'Origem Y',
};

function configurar({ cartItems = [], pecaData = peca } = {}) {
  useCart.mockReturnValue({ addToCart, removeFromCart, cartItems });
  pecas.buscarPecaPorId.mockResolvedValue(pecaData);
  pecas.listarCategorias.mockResolvedValue([{ id: 1, nome: 'Outros' }]);
  pecas.listarMateriais.mockResolvedValue([{ id: 2, nome: 'Aço' }]);
  pecas.buscarStatusWish.mockResolvedValue({ in_wish: false });
  pecas.adicionarPecaWish.mockResolvedValue({});
  pecas.removerPecaWish.mockResolvedValue({});
  pecas.buscarRecomendacoesPorPeca.mockResolvedValue([{ id: 8, nome_peca: 'Lanterna', preco: 100, imagem: 'l.png', score_recomendacao: 9 }, { id: 9, nome_peca: 'Friso', preco_base: 5, moeda_base: 'USD' }]);
  pecas.buscarFornecedoresRecomendados.mockResolvedValue([{ id: 4, nome_loja: 'Loja Z', media_avaliacoes: 4.5, total_avaliacoes: 1, total_pecas: 3, pecas_com_estoque: 2 }, { id: 5, full_name: 'Bia', total_avaliacoes: 2 }]);
  buscarAvaliacoesProduto.mockResolvedValue({ avaliacoes: [{ id: 1, nota: 4, comentario: 'Muito bom' }, { id: 2, nota: 5 }], resumo: { total: 2, media: 4.5 } });
  buscarAvaliacoesFornecedor.mockResolvedValue({ resumo: { total: 3, media: 4.666 } });
  buscarUsuarioPorId.mockResolvedValue({ profile: { full_name: 'Loja do Zé' } });
}

const abrir = (language) => renderPage(<DetalhePeca />, { route: '/pecas/7', path: '/pecas/:id', language });

beforeEach(() => configurar());

test('exibe detalhes localizados, avaliacoes e recomendacoes', async () => {
  abrir();
  expect(await screen.findByRole('heading', { name: 'Farol Opala' })).toBeInTheDocument();
  expect(await screen.findByText('Loja do Zé')).toBeInTheDocument();
  expect(screen.getByText('Outros / Aço')).toBeInTheDocument();
  expect(screen.getByText(/1\.500 g/)).toBeInTheDocument();
  expect(screen.getByText(/1\.200/)).toBeInTheDocument();
  expect(screen.getByText('31/01/2026')).toBeInTheDocument();
  expect(await screen.findByText('★ 4,7 (3)')).toBeInTheDocument();
  expect(screen.getByText('Muito bom')).toBeInTheDocument();
  expect(await screen.findByText('Lanterna')).toBeInTheDocument();
  expect(await screen.findByText('Loja Z')).toBeInTheDocument();

  fireEvent.click(screen.getByText('Lanterna'));
  expect(currentLocation(screen)).toBe('/pecas/8');
});

test('em ingles usa separadores e textos do idioma', async () => {
  abrir('EN');
  expect(await screen.findByText(/1,500 g/)).toBeInTheDocument();
  expect(screen.getByText('Other / Steel')).toBeInTheDocument();
  expect(screen.getByText('01/31/2026')).toBeInTheDocument();
  expect(await screen.findByText('★ 4.7 (3)')).toBeInTheDocument();
});

test('carrinho, favoritos e navegacao para o vendedor', async () => {
  abrir();
  fireEvent.click(await screen.findByText(/Adicionar ao carrinho/));
  expect(addToCart).toHaveBeenCalledWith(expect.objectContaining({ id: 7, preco: 1500 }));
  fireEvent.click(await screen.findByText(/Adicionar à lista de desejos/));
  await waitFor(() => expect(screen.getByText(/Remover da lista de desejos/)).toBeInTheDocument());
  fireEvent.click(screen.getByText(/Remover da lista de desejos/));
  await waitFor(() => expect(pecas.removerPecaWish).toHaveBeenCalledWith(7));
  pecas.adicionarPecaWish.mockRejectedValueOnce(new Error('falhou wish'));
  fireEvent.click(screen.getByText(/Adicionar à lista de desejos/));
  expect(await screen.findByText('falhou wish')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText('falhou wish')).not.toBeInTheDocument(), { timeout: 4000 });
  fireEvent.click(screen.getByText(/Abrir conversa/));
  expect(currentLocation(screen)).toBe('/chat/3');
});

test('ver vendedor e remover item que ja esta no carrinho', async () => {
  configurar({ cartItems: [{ id: 7 }] });
  abrir();
  fireEvent.click(await screen.findByText(/Remover do carrinho/));
  expect(removeFromCart).toHaveBeenCalledWith(7);
  fireEvent.click(screen.getAllByText(/Ver vendedor/)[0]);
  expect(currentLocation(screen)).toBe('/vendedores/3');
});

test('peca sem estoque, sem fornecedor e sem dados opcionais', async () => {
  configurar({ pecaData: { id: 7, nome_peca: 'Simples', preco: 10, estoque_atual: 0, categoria: { nome: 'Motor' }, material: { nome: 'Cromo' } } });
  buscarAvaliacoesProduto.mockRejectedValue(new Error('x'));
  pecas.buscarRecomendacoesPorPeca.mockRejectedValue(new Error('x'));
  pecas.buscarFornecedoresRecomendados.mockResolvedValue(null);
  pecas.buscarStatusWish.mockRejectedValue(new Error('x'));
  abrir();
  fireEvent.click(await screen.findByText(/Adicionar ao carrinho/));
  expect(screen.getByText('Desculpe, este item não está em estoque no momento.')).toBeInTheDocument();
  expect(addToCart).not.toHaveBeenCalled();
  expect(screen.getByText('Motor / Cromo')).toBeInTheDocument();
  expect(screen.getByText('Sem imagem cadastrada')).toBeInTheDocument();
  fireEvent.click(screen.getAllByText(/Ver vendedor/)[0]);
  fireEvent.click(screen.getByText(/Abrir conversa/));
  expect(currentLocation(screen)).toBe('/pecas/7');
  fireEvent.click(screen.getByText(/Voltar para busca/));
  expect(currentLocation(screen)).toBe('/buscaPecas');
});

test('erros ao carregar peca e vendedor', async () => {
  buscarUsuarioPorId.mockRejectedValueOnce(new Error('vendedor indisponível'));
  const view = abrir();
  expect(await screen.findByText('vendedor indisponível')).toBeInTheDocument();
  view.unmount();
  pecas.buscarPecaPorId.mockRejectedValueOnce(new Error('peça não encontrada'));
  pecas.listarCategorias.mockResolvedValue(null);
  abrir();
  expect(await screen.findByText('peça não encontrada')).toBeInTheDocument();
});

test('mostra carregamento das recomendacoes', async () => {
  let resolver;
  pecas.buscarRecomendacoesPorPeca.mockReturnValue(new Promise((r) => { resolver = r; }));
  pecas.buscarFornecedoresRecomendados.mockReturnValue(new Promise(() => {}));
  abrir();
  expect(await screen.findByText(/Carregando recomendações|Carregando/)).toBeInTheDocument();
  await act(async () => resolver([]));
});
