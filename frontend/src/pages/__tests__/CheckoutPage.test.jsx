import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import CheckoutPage from '../CheckoutPage';
import { useCart } from '../../contexts/CartContext';
import { useOrders } from '../../contexts/OrderContext';
import { buscarEnderecoPorCep } from '../../services/freteService';
import { currentLocation, renderPage } from '../../../jest/helpers/render';

jest.mock('../../components/Header', () => () => <header>Cabeçalho</header>);
jest.mock('../../contexts/CartContext', () => ({ useCart: jest.fn() }));
jest.mock('../../contexts/OrderContext', () => ({ useOrders: jest.fn() }));
jest.mock('../../services/freteService', () => {
  const real = jest.requireActual('../../features/frete/domain/frete');
  return { ...real, buscarEnderecoPorCep: jest.fn() };
});

const clearCart = jest.fn();
const itens = [
  { id: 1, nome: 'Farol', preco: 150, quantidade: 2, imagem: 'f.png' },
  { id: 2, nome: 'Calota', preco: 50, quantidade: 1 },
];
const frete = { id: 'pac', transportadora: 'Correios (estimativa)', tipo: 'PAC', valor: 20, prazo_min: 4, prazo_max: 6 };
let orders;

function configurar(cartItems = itens) {
  useCart.mockReturnValue({ cartItems, clearCart, getTotal: () => cartItems.reduce((s, i) => s + i.preco * i.quantidade, 0) });
  orders = {
    criarPedido: jest.fn().mockResolvedValue({ id: 77 }),
    confirmarPagamentoPedido: jest.fn().mockResolvedValue({ id: 77, status: 'pago' }),
  };
  useOrders.mockReturnValue(orders);
}

beforeEach(() => {
  configurar();
  buscarEnderecoPorCep.mockResolvedValue({ logradouro: 'Rua XV', bairro: 'Centro', cidade: 'Curitiba', uf: 'PR' });
});

const campos = () => document.querySelectorAll('input.input-clean');
const abrir = (state = { frete, cep: '80000-000', cupom: { codigo: 'BIGPECAS10', tipo: 'percentual', valor: 0.1 } }, language) => renderPage(<CheckoutPage />, { route: '/checkout', path: '/checkout', state, language });

async function preencherEndereco() {
  const [nome, , telefone, , , numero, complemento] = campos();
  fireEvent.change(nome, { target: { value: 'Ana Souza' } });
  fireEvent.change(telefone, { target: { value: '41999999999' } });
  fireEvent.change(numero, { target: { value: '10' } });
  fireEvent.change(complemento, { target: { value: 'ap 1' } });
  await waitFor(() => expect(screen.getByDisplayValue('Curitiba')).toBeInTheDocument());
}

test('carrinho vazio e sem frete mostram orientacoes', () => {
  configurar([]);
  const vazio = abrir();
  fireEvent.click(screen.getByText('Explorar Peças'));
  expect(currentLocation(screen)).toBe('/buscaPecas');
  vazio.unmount();
  configurar();
  abrir({});
  fireEvent.click(screen.getByText('Voltar ao Carrinho'));
  expect(currentLocation(screen)).toBe('/carrinho');
});

test('fluxo completo com PIX: valida endereco, revisa e conclui', async () => {
  abrir();
  expect(screen.getByText('Cupom BIGPECAS10')).toBeInTheDocument();
  fireEvent.click(screen.getByText(/Continuar/));
  expect(document.querySelectorAll('.input-error').length).toBeGreaterThan(0);
  await preencherEndereco();
  fireEvent.click(screen.getByText(/Continuar/));
  expect(screen.getByText('Desc. Pagamento via PIX')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Boleto bancário', { exact: false }));
  fireEvent.click(screen.getByText('Pagamento via PIX', { selector: 'div' }));
  fireEvent.click(screen.getByText(/Continuar/));
  expect(screen.getByText('Rua XV, 10 - ap 1', { exact: false })).toBeInTheDocument();
  expect(screen.getByText('Entrega em até 6 dias úteis', { exact: false })).toBeInTheDocument();
  fireEvent.click(screen.getByText(/Voltar/, { selector: 'button' }));
  fireEvent.click(screen.getByText(/Continuar/));

  orders.confirmarPagamentoPedido.mockRejectedValueOnce(new Error('pagamento recusado'));
  fireEvent.click(screen.getByText(/Confirmar pagamento e concluir compra/));
  expect(await screen.findByText('pagamento recusado')).toBeInTheDocument();
  orders.confirmarPagamentoPedido.mockRejectedValueOnce({});
  fireEvent.click(screen.getByText(/Confirmar pagamento e concluir compra/));
  await waitFor(() => expect(orders.confirmarPagamentoPedido).toHaveBeenCalledTimes(2));
  fireEvent.click(await screen.findByText(/Confirmar pagamento e concluir compra/));
  expect((await screen.findAllByText('Compra concluída com sucesso')).length).toBeGreaterThan(0);
  expect(orders.criarPedido).toHaveBeenCalledTimes(1);
  expect(clearCart).toHaveBeenCalled();
  fireEvent.click(screen.getByText('Acompanhar pedido'));
  expect(currentLocation(screen)).toBe('/pedidos/77');
});

test('pagamento com cartao valida e formata dados', async () => {
  abrir({ frete: { ...frete, valor: 0 }, cep: '', cupom: { codigo: 'FRETE0', tipo: 'frete_gratis', valor: 1 } }, 'EN');
  fireEvent.change(campos()[1], { target: { value: '80000000' } });
  await preencherEndereco();
  fireEvent.click(screen.getByText(/Continue/));
  fireEvent.click(screen.getByText('Credit card', { exact: false }));
  fireEvent.click(screen.getByText(/Continue/));
  expect(document.querySelectorAll('.input-error').length).toBe(4);
  const [numero, nome, validade, cvv] = campos();
  fireEvent.change(numero, { target: { value: '4111111111111111' } });
  fireEvent.change(nome, { target: { value: 'ANA SOUZA' } });
  fireEvent.change(validade, { target: { value: '1230' } });
  fireEvent.change(cvv, { target: { value: '123x' } });
  expect(screen.getByDisplayValue('4111 1111 1111 1111')).toBeInTheDocument();
  expect(screen.getByDisplayValue('12/30')).toBeInTheDocument();
  fireEvent.change(document.querySelector('select'), { target: { value: '3' } });
  expect(screen.getAllByText(/^3x of/).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByText(/Continue/));
  expect(screen.getAllByText('Free').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByText(/Confirm payment and complete purchase/i));
  expect(await screen.findByText(/Continue shopping/i)).toBeInTheDocument();
  fireEvent.click(screen.getByText(/Continue shopping/i));
  expect(currentLocation(screen)).toBe('/buscaPecas');
});

test('cep nao encontrado e voltar ao carrinho pela etapa 1', async () => {
  buscarEnderecoPorCep.mockRejectedValueOnce(new Error('x'));
  abrir({ frete, cep: '80000-000' });
  expect(await screen.findByText(/CEP não encontrado/)).toBeInTheDocument();
  fireEvent.change(campos()[1], { target: { value: '123' } });
  fireEvent.change(campos()[3], { target: { value: 'pr' } });
  fireEvent.click(screen.getByText(/Voltar/, { selector: 'button' }));
  expect(currentLocation(screen)).toBe('/carrinho');
});

test('mostra processamento enquanto conclui', async () => {
  let concluir;
  abrir();
  await preencherEndereco();
  fireEvent.click(screen.getByText(/Continuar/));
  fireEvent.click(screen.getByText(/Continuar/));
  orders.criarPedido.mockReturnValueOnce(new Promise((resolve) => { concluir = resolve; }));
  fireEvent.click(screen.getByText(/Confirmar pagamento e concluir compra/));
  expect(screen.getByText('Processando...')).toBeInTheDocument();
  await act(async () => concluir({ id: 1 }));
  fireEvent.click(screen.getAllByText('Carrinho')[0]);
});
