import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import auditGateway from '../infrastructure/auditGateway';

const ROUTES = [
  [/^\/cadastroPecas/, 'cadastro_peca'], [/^\/pedidos/, 'pedidos'],
  [/^\/checkout/, 'checkout'], [/^\/carrinho/, 'carrinho'],
  [/^\/wish/, 'favoritos'], [/^\/chat/, 'chat'], [/^\/chats/, 'chat'],
  [/^\/notificacoes/, 'notificacoes'], [/^\/configuracoes/, 'configuracoes'],
  [/^\/perfil/, 'perfil'], [/^\/vendedores/, 'perfil'],
  [/^\/avaliador/, 'avaliador'], [/^\/admin\/auditoria/, 'auditoria'],
  [/^\/admin/, 'admin'], [/^\/cadastro-usuario/, 'usuarios'],
  [/^\/pecas/, 'catalogo'], [/^\/buscaPecas/, 'catalogo'],
  [/^\/editar-pecas/, 'cadastro_peca'], [/^\/(?:home)?$/, 'home'],
];

const functionalityFor = (path) => ROUTES.find(([pattern]) => pattern.test(path))?.[1] || 'catalogo';

export default function AuditNavigationTracker() {
  const location = useLocation();
  const { user, getToken } = useAuth();
  const previousPath = useRef(null);

  useEffect(() => {
    const currentPath = `${location.pathname}${location.search}`;
    const fromPath = previousPath.current;
    previousPath.current = currentPath;
    if (!user || fromPath === currentPath) return;

    getToken().then((token) => token && auditGateway.recordNavigation(token, {
      functionality: functionalityFor(location.pathname),
      action: `Acessou ${location.pathname}`,
      page_path: currentPath,
      from_path: fromPath,
    })).catch(() => {});
  }, [location.pathname, location.search, user, getToken]);

  return null;
}
