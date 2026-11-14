import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { act } from 'react';
import AuditNavigationTracker from '../AuditNavigationTracker';
import auditGateway from '../../infrastructure/auditGateway';
import { useAuth } from '../../../../contexts/AuthContext';

jest.mock('../../../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../infrastructure/auditGateway', () => ({ __esModule: true, default: { recordNavigation: jest.fn() } }));

let navegar;
function Capturar() { navegar = useNavigate(); return null; }
const montar = (path = '/') => render(<MemoryRouter initialEntries={[path]}><AuditNavigationTracker /><Capturar /></MemoryRouter>);

beforeEach(() => { auditGateway.recordNavigation.mockResolvedValue({}); });

test.each([
  ['/', 'home'], ['/cadastroPecas', 'cadastro_peca'], ['/pedidos/1', 'pedidos'], ['/admin/auditoria', 'auditoria'],
  ['/admin', 'admin'], ['/qualquer', 'catalogo'], ['/chats', 'chat'],
])('registra navegacao em %s como %s', async (path, functionality) => {
  useAuth.mockReturnValue({ user: { id: 1 }, getToken: jest.fn().mockResolvedValue('tk') });
  montar(path);
  await waitFor(() => expect(auditGateway.recordNavigation).toHaveBeenCalledWith('tk', expect.objectContaining({ functionality, page_path: path, from_path: null })));
});

test('nao registra sem usuario, sem token ou na mesma rota', async () => {
  useAuth.mockReturnValue({ user: null, getToken: jest.fn() });
  montar('/');
  expect(auditGateway.recordNavigation).not.toHaveBeenCalled();

  const getToken = jest.fn().mockResolvedValue(null);
  useAuth.mockReturnValue({ user: { id: 1 }, getToken });
  montar('/carrinho');
  await waitFor(() => expect(getToken).toHaveBeenCalled());
  expect(auditGateway.recordNavigation).not.toHaveBeenCalled();
});

test('informa rota anterior e ignora falhas', async () => {
  useAuth.mockReturnValue({ user: { id: 1 }, getToken: jest.fn().mockResolvedValue('tk') });
  auditGateway.recordNavigation.mockRejectedValue(new Error('offline'));
  montar('/wish');
  await waitFor(() => expect(auditGateway.recordNavigation).toHaveBeenCalledTimes(1));
  act(() => navegar('/checkout?x=1'));
  await waitFor(() => expect(auditGateway.recordNavigation).toHaveBeenLastCalledWith('tk', expect.objectContaining({ functionality: 'checkout', from_path: '/wish', page_path: '/checkout?x=1' })));
});
