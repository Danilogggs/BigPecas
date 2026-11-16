import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import CarrinhoPage from '../CarrinhoPage';
import { useCart } from '../../contexts/CartContext';
import { aplicarCupom, calcularFrete } from '../../services/freteService';
import { currentLocation, renderPage } from '../../../jest/helpers/render';

jest.mock('../../components/Header', () => () => <header>Cabeçalho</header>);
jest.mock('../../contexts/CartContext', () => ({ useCart: jest.fn() }));
jest.mock('../../services/freteService', () => {
  const real = jest.requireActual('../../features/frete/domain/frete');
  return { ...real, calcularFrete: jest.fn(), aplicarCupom: jest.fn() };
});

const removeFromCart = jest.fn();
const updateQuantity = jest.fn();
const itens = [
  { id: 1, nome: 'Farol', preco: 150, quantidade: 2, estoque: 5, imagem: 'f.png', descricao: 'Farol original do Opala' },
  { id: 2, nome: 'Calota', preco: 50, quantidade: 1, estoque: 0, sku: 'C-1' },
  { id: 3, nome: 'Friso', preco: 30, quantidade: 1, estoque: 2 },
];
const opcoes = [
  { id: 'pac', transportadora: 'Correios (estimativa)', tipo: 'PAC', valor: 20, prazo_min: 4, prazo_max: 6, prazo_texto: 'Entrega em até 6 dias úteis' },
  { id: 'sedex', transportadora: 'Correios', tipo: 'SEDEX', valor: 0, prazo_min: 1, prazo_max: 1, logo: 'l.png' },
];

function configurar(cartItems = itens) {
  useCart.mockReturnValue({ cartItems, removeFromCart, updateQuantity, getTotal: () => cartItems.reduce((s, i) => s + i.preco * i.quantidade, 0) });
}

beforeEach(() => {
  configurar();
  calcularFrete.mockResolvedValue({ cep: '80000000', endereco: { cidade: 'Curitiba', uf: 'PR' }, opcoes });
  aplicarCupom.mockImplementation(jest.requireActual('../../features/frete/domain/frete').validarCupom);
});

const cep = () => screen.getByPlaceholderText(/00000-000|CEP/i);

test('calcula frete, escolhe opcao, aplica cupom e vai ao checkout', async () => {
  renderPage(<CarrinhoPage />);
  expect(screen.getByText('Farol original do Opala')).toBeInTheDocument();
  expect(screen.getByText('SKU: C-1')).toBeInTheDocument();
  expect(screen.getByText('Peça automotiva')).toBeInTheDocument();
  expect(screen.getByText('5 em estoque')).toBeInTheDocument();
  expect(screen.getByText('Sem estoque')).toBeInTheDocument();

  fireEvent.click(screen.getByText(/Finalizar Compra/));
  expect(await screen.findByText('Selecione uma opção de frete antes de finalizar.')).toBeInTheDocument();

  fireEvent.change(cep(), { target: { value: '123' } });
  fireEvent.click(screen.getByText('Calcular frete'));
  fireEvent.change(cep(), { target: { value: '80000000' } });
  fireEvent.keyDown(cep(), { key: 'a' });
  fireEvent.keyDown(cep(), { key: 'Enter' });
  expect(await screen.findByText('Entrega em até 6 dias úteis')).toBeInTheDocument();
  expect(screen.getByText('Entrega em 1 dia útil')).toBeInTheDocument();
  expect(calcularFrete).toHaveBeenCalledWith('80000000', itens);
  fireEvent.click(screen.getByAltText('Correios'));

  fireEvent.click(screen.getByText('Aplicar'));
  await waitFor(() => expect(screen.queryByText('Aplicando...')).not.toBeInTheDocument());
  aplicarCupom.mockImplementationOnce(() => { const erro = new Error('x'); erro.codigo = 'minimumSubtotalForCoupon'; erro.minimo = 500; throw erro; });
  fireEvent.change(screen.getByPlaceholderText('Digite o código'), { target: { value: 'PRIMEIRA20' } });
  fireEvent.keyDown(screen.getByPlaceholderText('Digite o código'), { key: 'Enter' });
  expect(await screen.findByText(/Subtotal mínimo de R\$\s?500,00/)).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText('Digite o código'), { target: { value: 'XYZ' } });
  fireEvent.click(screen.getByText('Aplicar'));
  expect(await screen.findByText('Cupom inválido ou expirado.')).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText('Digite o código'), { target: { value: 'bigpecas10' } });
  fireEvent.click(screen.getByText('Aplicar'));
  await screen.findByText('Remover');
  fireEvent.click(screen.getByText('Remover'));
  fireEvent.change(screen.getByPlaceholderText('Digite o código'), { target: { value: 'FRETE0' } });
  fireEvent.keyDown(screen.getByPlaceholderText('Digite o código'), { key: 'Enter' });
  await screen.findByText('Remover');
  expect(screen.getAllByText('Grátis').length).toBeGreaterThan(0);

  fireEvent.click(screen.getByText(/Finalizar Compra/));
  expect(currentLocation(screen)).toBe('/checkout');
});

test('quantidade, remocao, navegacao e erros de frete', async () => {
  renderPage(<CarrinhoPage />, { language: 'EN' });
  expect(screen.getByText('Car part')).toBeInTheDocument();
  expect(screen.getByText('5 in stock')).toBeInTheDocument();
  const inputs = document.querySelectorAll('input[type="number"]');
  fireEvent.change(inputs[0], { target: { value: '4' } });
  expect(updateQuantity).toHaveBeenCalledWith(1, 4, 5);
  fireEvent.change(inputs[0], { target: { value: '0' } });
  fireEvent.change(inputs[0], { target: { value: 'x' } });
  fireEvent.change(inputs[0], { target: { value: '99' } });
  expect(updateQuantity).toHaveBeenLastCalledWith(1, 5, 5);
  const botoesQtd = document.querySelectorAll('.qty-btn');
  fireEvent.click(botoesQtd[0]);
  fireEvent.click(botoesQtd[1]);
  fireEvent.click(screen.getAllByTitle(/Remove/i)[0]);
  expect(removeFromCart).toHaveBeenCalledWith(1);
  fireEvent.click(screen.getByText('Calota'));
  expect(currentLocation(screen)).toBe('/pecas/2');
});

test('falhas no calculo de frete e resposta sem opcoes', async () => {
  calcularFrete.mockRejectedValueOnce(new Error('CEP não atendido')).mockRejectedValueOnce({}).mockResolvedValueOnce({ cep: '1', opcoes: [] });
  renderPage(<CarrinhoPage />);
  fireEvent.change(cep(), { target: { value: '80000-000' } });
  fireEvent.click(screen.getByText('Calcular frete'));
  expect(await screen.findByText('CEP não atendido')).toBeInTheDocument();
  fireEvent.click(await screen.findByText('Calcular frete'));
  await waitFor(() => expect(calcularFrete).toHaveBeenCalledTimes(2));
  fireEvent.click(await screen.findByText('Calcular frete'));
  await waitFor(() => expect(calcularFrete).toHaveBeenCalledTimes(3));
  fireEvent.click(screen.getByText('+ Adicionar mais peças'));
  expect(currentLocation(screen)).toBe('/buscaPecas');
});

test('link para descobrir o CEP abre em nova aba', () => {
  const open = jest.spyOn(window, 'open').mockImplementation(() => null);
  renderPage(<CarrinhoPage />);
  fireEvent.click(screen.getByText('Não sei meu CEP'));
  expect(open).toHaveBeenCalled();
});

test('calculo aguarda e mostra carregamento', async () => {
  let resolver;
  calcularFrete.mockReturnValueOnce(new Promise((r) => { resolver = r; }));
  renderPage(<CarrinhoPage />);
  fireEvent.change(cep(), { target: { value: '80000-000' } });
  fireEvent.click(screen.getByText('Calcular frete'));
  expect(screen.getAllByText('Calculando...').length).toBeGreaterThan(0);
  await act(async () => resolver({ cep: '8', opcoes }));
});
