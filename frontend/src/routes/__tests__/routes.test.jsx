import { screen } from '@testing-library/react';
import PrivateRoute from '../PrivateRoute';
import PublicRoute from '../PublicRoute';
import { useAuth } from '../../contexts/AuthContext';
import { currentLocation, renderPage } from '../../../jest/helpers/render';

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

describe('PrivateRoute', () => {
  test('mostra carregamento, redireciona visitante e libera usuario', () => {
    useAuth.mockReturnValue({ loading: true, user: null });
    const { unmount } = renderPage(<PrivateRoute><p>privado</p></PrivateRoute>, { route: '/x', path: '/x' });
    expect(screen.getByText('Verificando autenticação...')).toBeInTheDocument();
    unmount();

    useAuth.mockReturnValue({ loading: false, user: null });
    const visitante = renderPage(<PrivateRoute><p>privado</p></PrivateRoute>, { route: '/x', path: '/x' });
    expect(currentLocation(screen)).toBe('/login');
    visitante.unmount();

    useAuth.mockReturnValue({ loading: false, user: { id: 1 } });
    renderPage(<PrivateRoute><p>privado</p></PrivateRoute>, { route: '/x', path: '/x' });
    expect(screen.getByText('privado')).toBeInTheDocument();
  });
});

describe('PublicRoute', () => {
  test('mostra carregamento, redireciona usuario e libera visitante', () => {
    useAuth.mockReturnValue({ loading: true, user: null });
    const { unmount } = renderPage(<PublicRoute><p>publico</p></PublicRoute>, { route: '/login', path: '/login' });
    expect(screen.getByText('Verificando autenticação...')).toBeInTheDocument();
    unmount();

    useAuth.mockReturnValue({ loading: false, user: { id: 1 } });
    const logado = renderPage(<PublicRoute><p>publico</p></PublicRoute>, { route: '/login', path: '/login' });
    expect(currentLocation(screen)).toBe('/');
    logado.unmount();

    useAuth.mockReturnValue({ loading: false, user: null });
    renderPage(<PublicRoute><p>publico</p></PublicRoute>, { route: '/login', path: '/login' });
    expect(screen.getByText('publico')).toBeInTheDocument();
  });
});
