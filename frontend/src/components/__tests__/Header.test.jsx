import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import Header from '../Header';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { buscarPerfilUsuario } from '../../services/usuarioService';
import { buscarContagemNotificacoesNaoLidas, listarNotificacoes, marcarNotificacaoComoLida } from '../../services/notificacoesService';
import { currentLocation, renderPage } from '../../../jest/helpers/render';

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../contexts/CartContext', () => ({ useCart: jest.fn() }));
jest.mock('../../services/usuarioService', () => ({ buscarPerfilUsuario: jest.fn() }));
jest.mock('../../services/notificacoesService', () => ({
  buscarContagemNotificacoesNaoLidas: jest.fn(), listarNotificacoes: jest.fn(), marcarNotificacaoComoLida: jest.fn(),
}));

const logout = jest.fn();
const removeFromCart = jest.fn();
const itens = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, nome: i === 1 ? '' : `Item ${i + 1}`, preco: 10, quantidade: i === 0 ? 120 : 1, imagem: i === 0 ? 'a.png' : '' }));

function configurar({ user = { id: 1 }, cartItems = itens, perfil = { is_admin: true }, contagem = 3 } = {}) {
  useAuth.mockReturnValue({ user, logout });
  useCart.mockReturnValue({ cartItems, removeFromCart, getTotal: () => 50 });
  buscarPerfilUsuario.mockResolvedValue(perfil);
  buscarContagemNotificacoesNaoLidas.mockResolvedValue(contagem);
  listarNotificacoes.mockResolvedValue([
    { id: 1, titulo: 'Peça para validar', tipo: 'nova_peca_para_validar', peca_id: 9, mensagem: 'Nova peça', criada_em: '2026-01-31T10:00:00' },
    { id: 2, titulo: 'Peça aprovada', peca_id: 4, lida_em: '2026-01-01' },
    { id: 3, titulo: 'Aviso geral' },
  ]);
  marcarNotificacaoComoLida.mockResolvedValue({});
}

beforeEach(() => configurar());

test('visitante ve botao de entrar e busca pelo catalogo', () => {
  configurar({ user: null });
  renderPage(<Header />, { route: '/buscaPecas?nome=farol' });
  expect(screen.getByDisplayValue('farol')).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText('Buscar peça, código ou modelo…'), { target: { value: '  ' } });
  fireEvent.submit(screen.getByPlaceholderText('Buscar peça, código ou modelo…').closest('form'));
  expect(currentLocation(screen)).toBe('/buscaPecas');
  fireEvent.change(screen.getByPlaceholderText('Buscar peça, código ou modelo…'), { target: { value: 'roda aro' } });
  fireEvent.submit(screen.getByPlaceholderText('Buscar peça, código ou modelo…').closest('form'));
  expect(currentLocation(screen)).toBe('/buscaPecas?nome=roda%20aro');
  fireEvent.click(screen.getByText('Entrar'));
  expect(currentLocation(screen)).toBe('/login');
  fireEvent.click(screen.getByAltText('BigPeças'));
  expect(currentLocation(screen)).toBe('/');
  expect(buscarPerfilUsuario).not.toHaveBeenCalled();
});

test('usuario admin navega pelo menu da conta e sai', async () => {
  renderPage(<Header />, { route: '/avaliador/fila' });
  expect(await screen.findByText('3')).toBeInTheDocument();
  const nav = document.querySelector('.bp-header__nav');
  await waitFor(() => expect(within(nav).getAllByRole('button')).toHaveLength(3));
  expect(within(nav).getAllByRole('button')[0].className).toContain('active');
  fireEvent.click(within(nav).getByText('Catálogo'));
  expect(currentLocation(screen)).toBe('/buscaPecas');

  fireEvent.click(screen.getByLabelText('Abrir menu da conta'));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Administração' }));
  expect(currentLocation(screen)).toBe('/admin');
  fireEvent.click(screen.getByLabelText('Abrir menu da conta'));
  fireEvent.click(screen.getByLabelText('Abrir menu da conta'));
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Abrir menu da conta'));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Sair' }));
  expect(logout).toHaveBeenCalled();
  expect(currentLocation(screen)).toBe('/login');
});

test('menus fecham com Esc e clique fora; badges limitam em 99+', async () => {
  configurar({ contagem: 150 });
  renderPage(<Header />);
  await waitFor(() => expect(screen.getAllByText('99+')).toHaveLength(2));
  fireEvent.click(screen.getByLabelText('Abrir menu da conta'));
  fireEvent.keyDown(document, { key: 'a' });
  expect(screen.getByRole('menu')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Abrir menu da conta'));
  fireEvent.mouseDown(screen.getByRole('menu'));
  expect(screen.getByRole('menu')).toBeInTheDocument();
  fireEvent.mouseDown(document.body);
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

test('notificacoes: lista, marca como lida e navega para o destino', async () => {
  renderPage(<Header />);
  await screen.findByText('3');
  fireEvent.click(screen.getByLabelText('Notificações'));
  expect(await screen.findByText('Peça para validar')).toBeInTheDocument();
  expect(screen.getByText('Nova peça')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Peça para validar'));
  await waitFor(() => expect(currentLocation(screen)).toBe('/avaliador/validar/9'));
  expect(marcarNotificacaoComoLida).toHaveBeenCalledWith(1);
  expect(await screen.findByText('2')).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('Notificações'));
  fireEvent.click(await screen.findByText('Peça aprovada'));
  await waitFor(() => expect(currentLocation(screen)).toBe('/editar-pecas'));
  marcarNotificacaoComoLida.mockRejectedValueOnce(new Error('x'));
  fireEvent.click(screen.getByLabelText('Notificações'));
  fireEvent.click(await screen.findByText('Aviso geral'));
  await waitFor(() => expect(currentLocation(screen)).toBe('/notificacoes'));
  fireEvent.click(screen.getByLabelText('Notificações'));
  await screen.findByText('Aviso geral');
  fireEvent.click(screen.getByText('Ver todas as notificações'));
  expect(currentLocation(screen)).toBe('/notificacoes');
});

test('notificacoes: estados vazio, erro e resposta invalida', async () => {
  listarNotificacoes.mockResolvedValueOnce(null);
  buscarContagemNotificacoesNaoLidas.mockRejectedValue(new Error('x'));
  buscarPerfilUsuario.mockRejectedValue(new Error('x'));
  renderPage(<Header />);
  fireEvent.click(screen.getByLabelText('Notificações'));
  expect(await screen.findByText(/Nenhuma notificação/i)).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Notificações'));
  listarNotificacoes.mockRejectedValueOnce(new Error('x'));
  fireEvent.click(screen.getByLabelText('Notificações'));
  expect(await screen.findByText('Não foi possível carregar as notificações.')).toBeInTheDocument();
  expect(within(document.querySelector('.bp-header__nav')).getAllByRole('button')).toHaveLength(2);
});

test('mini carrinho mostra itens, remove e abre carrinho', async () => {
  configurar({ perfil: { tipo_usuario: 'avaliador' } });
  renderPage(<Header />);
  fireEvent.click(screen.getByLabelText('Meu carrinho'));
  expect(screen.getByText('Item 1')).toBeInTheDocument();
  expect(screen.getByText('Peça sem nome')).toBeInTheDocument();
  expect(screen.getByText('+ 2 outro(s) item(ns) no carrinho', { exact: false })).toBeInTheDocument();
  expect(screen.getByText(/R\$\s?50,00/)).toBeInTheDocument();
  fireEvent.click(screen.getAllByTitle('Remover do carrinho')[0]);
  expect(removeFromCart).toHaveBeenCalledWith(1);
  fireEvent.click(screen.getByText('Item 3'));
  expect(currentLocation(screen)).toBe('/pecas/3');
  fireEvent.click(screen.getByLabelText('Meu carrinho'));
  fireEvent.click(screen.getByText('Ver carrinho'));
  expect(currentLocation(screen)).toBe('/carrinho');
});

test('mini carrinho vazio e intervalo de contagem', async () => {
  jest.useFakeTimers();
  configurar({ cartItems: [], contagem: 0 });
  const { unmount } = renderPage(<Header />);
  fireEvent.click(screen.getByLabelText('Meu carrinho'));
  expect(screen.getByText('Seu carrinho está vazio')).toBeInTheDocument();
  await act(async () => { jest.advanceTimersByTime(30000); });
  expect(buscarContagemNotificacoesNaoLidas).toHaveBeenCalledTimes(2);
  unmount();
  jest.useRealTimers();
});
