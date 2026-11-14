import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import PedidosPage from '../PedidosPage';
import { useOrders } from '../../contexts/OrderContext';
import { normalizarPedido } from '../../features/pedidos/domain/pedido';
import { avaliarFornecedor, avaliarProduto, buscarAvaliacoesPedido } from '../../services/avaliacoesService';
import { currentLocation, renderPage } from '../../../jest/helpers/render';

jest.mock('../../contexts/OrderContext', () => ({ useOrders: jest.fn() }));
jest.mock('../../features/pedidos/presentation/SalesReport', () => () => <section>Relatório de vendas</section>);
jest.mock('../../features/pedidos/presentation/PedidosShell', () => ({ children }) => <main>{children}</main>);
jest.mock('../../services/avaliacoesService', () => ({
  buscarAvaliacoesPedido: jest.fn(), avaliarFornecedor: jest.fn(), avaliarProduto: jest.fn(),
}));

const compras = [
  normalizarPedido({
    id: 1, status: 'enviado', criado_em: '2026-01-31T12:00:00', subtotal: 300, desconto: 30, valor_frete: 0, total: 270,
    forma_pagamento: { id: 'pix', nome: 'PIX' }, codigo_rastreio: 'BR123',
    endereco: { nome: 'Ana', logradouro: 'Rua A', numero: '10', complemento: 'ap 2', bairro: 'Centro', cidade: 'Curitiba', uf: 'PR', cep: '80000-000' },
    itens: [{ id: 1, nome: 'Farol', preco: 100, quantidade: 1, fornecedor_nome: 'Loja A', imagem: 'a.png' }, { id: 2, nome_peca: 'Roda', preco: 100, quantidade: 1, fornecedor_nome: 'Loja B' }, { id: 3, preco: 100 }],
    historico: [{ status: 'pago', data: '2026-01-30T12:00:00' }, { status: 'enviado', data: '2026-01-31T12:00:00' }],
  }),
  normalizarPedido({ id: 2, status: 'entregue', criado_em: '2026-01-20T12:00:00', total: 50, valor_frete: 15, itens: [{ id: 5, nome: 'Calota', preco: 35, quantidade: 1 }] }),
  normalizarPedido({ id: 3, status: 'misterioso', criado_em: '2026-01-10T12:00:00', total: 10, itens: [] }),
];
const vendas = [
  normalizarPedido({ id: 9, status: 'pago', visao: 'venda', pode_atualizar_status: true, criado_em: '2026-01-31T12:00:00', valor_venda: 500, comprador: { nome: 'Caio' }, endereco: { logradouro: 'Rua B' }, itens: [{ id: 7, nome: 'Motor', preco: 500, quantidade: 1 }] }),
  normalizarPedido({ id: 10, status: 'aguardando_pagamento', visao: 'venda', pode_atualizar_status: true, criado_em: '2026-01-31T12:00:00', valor_venda: 80, itens: [{ id: 8, nome: 'Friso', preco: 80, quantidade: 1 }] }),
];

let orders;
function configurar(overrides = {}) {
  orders = {
    compras, vendas, perfilHistorico: { pode_vender: true }, loadingOrders: false, historicoCarregado: true, ordersError: '',
    buscarPedido: jest.fn((id, visao) => (visao === 'venda' ? vendas : compras).find((pedido) => String(pedido.id) === String(id)) || null),
    atualizarStatusPedido: jest.fn().mockResolvedValue({}),
    confirmarRecebimentoPedido: jest.fn().mockResolvedValue({}),
    carregarPedidos: jest.fn(),
    ...overrides,
  };
  useOrders.mockReturnValue(orders);
}

const rotas = (route, language) => renderPage(<PedidosPage />, { route, path: '/pedidos/:id?', language });

beforeEach(() => {
  configurar();
  buscarAvaliacoesPedido.mockResolvedValue({
    fornecedores: [{ fornecedor_id: 1, fornecedor_nome: 'Loja A', avaliacao: null }, { fornecedor_id: 2, fornecedor_nome: 'Loja B', avaliacao: { nota: 4, comentario: 'bom' } }],
    produtos: [{ venda_id: 1, peca_id: 5, nome: 'Calota', fornecedor_nome: 'Loja A', imagem: 'c.png', avaliacao: null }, { venda_id: 2, nome: 'Outra', fornecedor_nome: 'Loja B', avaliacao: { nota: 5 } }],
  });
  avaliarFornecedor.mockResolvedValue({});
  avaliarProduto.mockResolvedValue({});
});

test('historico de compras com filtros, resumo localizado e navegacao', () => {
  rotas('/pedidos');
  expect(screen.getByText('Farol, Roda e mais 1')).toBeInTheDocument();
  expect(screen.getByText(/R\$\s?330,00/)).toBeInTheDocument();
  expect(screen.getByText('Vendedor: Loja A, Loja B')).toBeInTheDocument();
  expect(screen.getAllByText('Vendedor: BigPeças').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByText('Cancelado', { selector: 'button, button *' }).closest('button'));
  expect(screen.getByText('Nenhum registro com este status')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Todas', { exact: false }).closest('button'));
  fireEvent.click(screen.getByText('Farol, Roda e mais 1').closest('button'));
  expect(currentLocation(screen)).toBe('/pedidos/1');
});

test('historico de vendas em ingles', () => {
  rotas('/pedidos?visao=vendas', 'EN');
  expect(screen.getByText('Relatório de vendas')).toBeInTheDocument();
  expect(screen.getByText('Customer: Caio')).toBeInTheDocument();
  expect(screen.getByText('R$580.00')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Motor').closest('button'));
  expect(currentLocation(screen)).toBe('/pedidos/9?visao=vendas');
});

test('abas, atualizacao, estados de carregamento, erro e vazio', () => {
  const { unmount } = rotas('/pedidos');
  fireEvent.click(screen.getAllByRole('tab')[1]);
  expect(currentLocation(screen)).toBe('/pedidos?visao=vendas');
  fireEvent.click(screen.getAllByRole('tab')[0]);
  expect(currentLocation(screen)).toBe('/pedidos');
  fireEvent.click(screen.getByText('Início'));
  expect(currentLocation(screen)).toBe('/');
  unmount();

  configurar({ loadingOrders: true });
  let view = rotas('/pedidos');
  expect(screen.getByRole('status')).toBeInTheDocument();
  view.unmount();

  configurar({ ordersError: 'Falhou' });
  view = rotas('/pedidos');
  fireEvent.click(within(screen.getByRole('alert')).getByRole('button'));
  expect(orders.carregarPedidos).toHaveBeenCalled();
  view.unmount();

  configurar({ compras: [], vendas: [], perfilHistorico: { pode_vender: false } });
  view = rotas('/pedidos');
  expect(screen.getAllByRole('tab')).toHaveLength(1);
  fireEvent.click(screen.getByText('Explorar peças'));
  expect(currentLocation(screen)).toBe('/buscaPecas');
  view.unmount();

  configurar({ compras: [], vendas: [], perfilHistorico: { pode_vender: false } });
  rotas('/pedidos?visao=vendas');
  expect(currentLocation(screen)).toBe('/pedidos');
});

test('vendedor sem vendas ve estado vazio especifico', () => {
  configurar({ vendas: [] });
  rotas('/pedidos?visao=vendas');
  expect(screen.getByText('Nenhuma venda realizada ainda')).toBeInTheDocument();
});

test('pedido inexistente mostra aviso e volta ao historico', () => {
  rotas('/pedidos/999?visao=vendas');
  fireEvent.click(screen.getByRole('button'));
  expect(currentLocation(screen)).toBe('/pedidos?visao=vendas');
});

test('detalhe da compra: confirma recebimento, endereco e resumo', async () => {
  rotas('/pedidos/1');
  expect(screen.getByText('BR123')).toBeInTheDocument();
  expect(screen.getByText('Pedido despachado. Acompanhe pelo código de rastreio.')).toBeInTheDocument();
  expect(screen.getByText('Grátis')).toBeInTheDocument();
  expect(screen.getByText('Pagamento via PIX')).toBeInTheDocument();
  expect(screen.getByText(/Avaliações ainda bloqueadas/)).toBeInTheDocument();
  fireEvent.click(screen.getByText('Confirmar recebimento'));
  await waitFor(() => expect(orders.confirmarRecebimentoPedido).toHaveBeenCalledWith(1));
  orders.confirmarRecebimentoPedido.mockRejectedValueOnce(new Error('não confirmou'));
  fireEvent.click(screen.getByText('Confirmar recebimento'));
  expect(await screen.findByRole('alert')).toHaveTextContent('não confirmou');
  orders.confirmarRecebimentoPedido.mockRejectedValueOnce({});
  fireEvent.click(screen.getByText('Confirmar recebimento'));
  await waitFor(() => expect(screen.getByRole('alert')).not.toHaveTextContent('não confirmou'));
  fireEvent.click(screen.getByText('Comprar novamente'));
  expect(currentLocation(screen)).toBe('/buscaPecas');
});

test('detalhe da venda: avanca status e trata falha', async () => {
  const view = rotas('/pedidos/9?visao=vendas', 'FR');
  expect(screen.getByText('Paiement confirmé. Commande en préparation pour l’expédition.')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Marquer comme expédié'));
  await waitFor(() => expect(orders.atualizarStatusPedido).toHaveBeenCalledWith(9, 'enviado'));
  orders.atualizarStatusPedido.mockRejectedValueOnce({});
  fireEvent.click(screen.getByText('Marquer comme expédié'));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  fireEvent.click(screen.getAllByText(/Retour à l’historique|Retour/)[0]);
  expect(currentLocation(screen)).toBe('/pedidos?visao=vendas');
  view.unmount();

  rotas('/pedidos/10?visao=vendas', 'PTBR');
  orders.atualizarStatusPedido.mockRejectedValueOnce(new Error('sem permissão'));
  fireEvent.click(screen.getByText('Confirmar pagamento'));
  expect(await screen.findByRole('alert')).toHaveTextContent('sem permissão');
  fireEvent.click(screen.getAllByText(/Voltar ao histórico/)[1]);
  expect(currentLocation(screen)).toBe('/pedidos?visao=vendas');
});

test('pedido entregue permite avaliar vendedor e produto', async () => {
  rotas('/pedidos/2');
  expect(await screen.findByText('Loja B')).toBeInTheDocument();
  expect(screen.getByLabelText('4 de 5 estrelas')).toBeInTheDocument();
  const botoes = screen.getAllByText('Avaliar');
  fireEvent.click(botoes[0]);
  fireEvent.click(screen.getByText('Fechar'));
  fireEvent.click(screen.getAllByText('Avaliar')[0]);
  const form = document.querySelector('.review-form');
  fireEvent.click(within(form).getAllByLabelText('3 estrelas')[0]);
  fireEvent.click(within(form).getAllByLabelText('1 estrela')[1]);
  fireEvent.change(within(form).getByRole('textbox'), { target: { value: 'Ótimo' } });
  fireEvent.submit(form);
  await waitFor(() => expect(avaliarFornecedor).toHaveBeenCalledWith(expect.objectContaining({ pedido_id: 2, fornecedor_id: 1, nota: 3, qualidade_peca: 1, comentario: 'Ótimo' })));

  fireEvent.click((await screen.findAllByText('Avaliar'))[1]);
  avaliarProduto.mockRejectedValueOnce(new Error('falhou envio'));
  fireEvent.submit(document.querySelector('.review-form'));
  expect(await screen.findByText('falhou envio')).toBeInTheDocument();
  avaliarProduto.mockRejectedValueOnce({});
  fireEvent.submit(document.querySelector('.review-form'));
  await waitFor(() => expect(avaliarProduto).toHaveBeenCalledTimes(2));
  fireEvent.click(within(document.querySelector('.review-form')).getByText('Cancelar'));
  fireEvent.click((await screen.findAllByText('Avaliar')).at(-1));
  fireEvent.submit(document.querySelector('.review-form'));
  await waitFor(() => expect(avaliarProduto).toHaveBeenLastCalledWith({ pedido_id: 2, venda_id: 1, peca_id: 5, nota: 5, comentario: '' }));
});

test('falha ao carregar avaliacoes permite tentar novamente', async () => {
  buscarAvaliacoesPedido.mockRejectedValueOnce(new Error('sem avaliações')).mockRejectedValueOnce({});
  rotas('/pedidos/2');
  expect(await screen.findByText('sem avaliações')).toBeInTheDocument();
  await act(async () => { fireEvent.click(within(screen.getByRole('alert')).getByRole('button')); });
  await waitFor(() => expect(buscarAvaliacoesPedido).toHaveBeenCalledTimes(2));
});

test('pedido de status desconhecido sem historico', () => {
  rotas('/pedidos/3');
  expect(screen.getAllByText(/desconhecido|Status/i).length).toBeGreaterThan(0);
});
