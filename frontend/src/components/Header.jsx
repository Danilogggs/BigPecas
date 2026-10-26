import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { buscarPerfilUsuario } from '../services/usuarioService';
import {
  buscarContagemNotificacoesNaoLidas,
  listarNotificacoes,
  marcarNotificacaoComoLida,
} from '../services/notificacoesService';
import { useLanguage } from '../contexts/LanguageContext';
import { formatarMoedaCarrinho } from '../features/carrinho/presentation/carrinhoPresentation';
import LanguageSwitcher from './LanguageSwitcher';
import CurrencySelector from './CurrencySelector';

const MAXIMO_NOTIFICACOES_MENU = 5;
const MAXIMO_ITENS_MINI_CARRINHO = 4;

function destinoNotificacao(notificacao) {
  if (notificacao.tipo === 'nova_peca_para_validar' && notificacao.peca_id) {
    return `/avaliador/validar/${notificacao.peca_id}`;
  }
  return notificacao.peca_id ? '/editar-pecas' : '/notificacoes';
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { cartItems } = useCart();
  const { t } = useLanguage();

  const [localSearch, setLocalSearch] = useState(searchParams.get('nome') || '');
  // Apenas um menu do header fica aberto por vez: 'notificacoes', 'carrinho' ou 'conta'.
  const [menuAberto, setMenuAberto] = useState(null);
  const [isAvaliador, setIsAvaliador] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const actionsRef = useRef(null);
  const cartCount = cartItems.reduce((s, it) => s + (it.quantidade || 0), 0);

  useEffect(() => { setLocalSearch(searchParams.get('nome') || ''); }, [searchParams]);

  useEffect(() => { setMenuAberto(null); }, [location.pathname]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsAdmin(false);
      setNotificacoesNaoLidas(0);
      return undefined;
    }
    buscarPerfilUsuario()
      .then((profile) => { if (active) { setIsAdmin(profile?.is_admin === true); setIsAvaliador(profile?.tipo_usuario === 'avaliador' || profile?.is_admin === true); } })
      .catch(() => { if (active) setIsAdmin(false); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    let active = true;

    if (!user) {
      setNotificacoesNaoLidas(0);
      return undefined;
    }

    const carregar = async () => {
      try {
        const count = await buscarContagemNotificacoesNaoLidas();
        if (active) setNotificacoesNaoLidas(count);
      } catch {
        if (active) setNotificacoesNaoLidas(0);
      }
    };

    carregar();
    const interval = window.setInterval(carregar, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    const fecharAoClicarFora = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) setMenuAberto(null);
    };
    const fecharComEsc = (e) => { if (e.key === 'Escape') setMenuAberto(null); };
    document.addEventListener('mousedown', fecharAoClicarFora);
    document.addEventListener('keydown', fecharComEsc);
    return () => {
      document.removeEventListener('mousedown', fecharAoClicarFora);
      document.removeEventListener('keydown', fecharComEsc);
    };
  }, []);

  const alternarMenu = (menu) => setMenuAberto((atual) => (atual === menu ? null : menu));
  const fecharMenu = () => setMenuAberto(null);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = localSearch.trim();
    navigate(q ? `/buscaPecas?nome=${encodeURIComponent(q)}` : '/buscaPecas');
  };

  const navLinks = [
    ...(isAvaliador ? [{ label: t('avaliarPecas'), path: '/avaliador' }] : []),
    { label: t('catalog'),       path: '/buscaPecas' },
    { label: t('sellPart'),      path: '/cadastroPecas' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <header className="bp-header">
      {/* Logo */}
      <button className="bp-header__logo" onClick={() => navigate('/')}>
        <img className="bp-header__logo-image" src="/logobigpecas_semtexto.png" alt="BigPeças" />
      </button>

      {/* Nav links */}
      <nav className="bp-header__nav">
        {navLinks.map(({ label, path }) => (
          <button
            key={path}
            className={`bp-header__nav-link ${isActive(path) ? 'active' : ''}`}
            onClick={() => navigate(path)}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Search */}
      <form className="bp-header__search" onSubmit={handleSearch}>
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
        />
        <button type="submit" aria-label={t('search')}>
          <SearchIcon />
        </button>
      </form>

      <div className="bp-header__spacer" />

      {/* Actions */}
      <div className="bp-header__actions" ref={actionsRef}>
        <div className={`bp-header__prefs ${user ? 'bp-header__prefs--collapsible' : ''}`}>
          <LanguageSwitcher /><CurrencySelector />
        </div>

        {user && (
          <NotificacoesMenu
            aberto={menuAberto === 'notificacoes'}
            onAlternar={() => alternarMenu('notificacoes')}
            onFechar={fecharMenu}
            naoLidas={notificacoesNaoLidas}
            setNaoLidas={setNotificacoesNaoLidas}
          />
        )}

        {user && (
          <MiniCarrinho
            aberto={menuAberto === 'carrinho'}
            onAlternar={() => alternarMenu('carrinho')}
            onFechar={fecharMenu}
            quantidadeTotal={cartCount}
          />
        )}

        {/* User menu or Entrar */}
        {user ? (
          <div className="bp-header__menu">
            <button
              className="bp-header__user-btn"
              onClick={() => alternarMenu('conta')}
              aria-expanded={menuAberto === 'conta'}
              aria-haspopup="menu"
              aria-label={t('accountMenu')}
            >
              <UserIcon />
              <ChevronIcon open={menuAberto === 'conta'} />
            </button>

            {menuAberto === 'conta' && (
              <div className="bp-header__dropdown" role="menu">
                {/* No celular o idioma e a moeda saem da barra e ficam aqui. */}
                <div className="bp-header__dropdown-prefs">
                  <LanguageSwitcher /><CurrencySelector />
                </div>
                {[
                  ...(isAdmin ? [{ label: t('administration'), path: '/admin' }] : []),
                  { label: t('catalog'),         path: '/buscaPecas' },
                  { label: t('sellPart'),        path: '/cadastroPecas' },
                  { label: t('yourParts'),       path: '/editar-pecas' },
                  { label: t('editProfile'),     path: '/perfil' },
                  { label: t('wishlist'),        path: '/wish' },
                  { label: t('cart'),            path: '/carrinho' },
                  { label: t('chats'),           path: '/chats' },
                  { label: t('orders'),          path: '/pedidos' },
                  { label: t('settings'),        path: '/configuracoes' },
                ].map(({ label, path }) => (
                  <button
                    key={path}
                    className="bp-header__dropdown-item"
                    role="menuitem"
                    onClick={() => { navigate(path); fecharMenu(); }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  className="bp-header__dropdown-item bp-header__dropdown-item--danger"
                  role="menuitem"
                  onClick={() => { logout(); navigate('/login'); fecharMenu(); }}
                >
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="bp-header__btn-login"
            onClick={() => navigate('/login')}
          >
            {t('login')}
          </button>
        )}
      </div>
    </header>
  );
}

function NotificacoesMenu({ aberto, onAlternar, onFechar, naoLidas, setNaoLidas }) {
  const navigate = useNavigate();
  const { t, formatDate } = useLanguage();
  const [notificacoes, setNotificacoes] = useState([]);
  const [estado, setEstado] = useState('carregando');

  useEffect(() => {
    if (!aberto) return undefined;
    let ativo = true;
    setEstado('carregando');
    listarNotificacoes()
      .then((lista) => {
        if (!ativo) return;
        setNotificacoes((Array.isArray(lista) ? lista : []).slice(0, MAXIMO_NOTIFICACOES_MENU));
        setEstado('pronto');
      })
      .catch(() => { if (ativo) setEstado('erro'); });
    return () => { ativo = false; };
  }, [aberto]);

  async function abrirNotificacao(notificacao) {
    onFechar();
    if (!notificacao.lida_em) {
      try {
        await marcarNotificacaoComoLida(notificacao.id);
        setNaoLidas((atual) => Math.max(0, atual - 1));
      } catch {
        // A navegacao segue mesmo se nao der para marcar como lida.
      }
    }
    navigate(destinoNotificacao(notificacao));
  }

  return (
    <div className="bp-header__menu">
      <button
        type="button"
        className="bp-header__icon-btn"
        onClick={onAlternar}
        aria-expanded={aberto}
        aria-haspopup="true"
        title={t('notifications')}
        aria-label={t('notifications')}
      >
        <BellIcon />
        {naoLidas > 0 && (
          <span className="bp-header__badge bp-header__badge--alert">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="bp-header__dropdown bp-header__dropdown--wide">
          <div className="bp-header__dropdown-title">{t('notifications')}</div>
          {estado === 'carregando' && <p className="bp-header__dropdown-empty">{t('loadingNotifications')}</p>}
          {estado === 'erro' && <p className="bp-header__dropdown-empty">{t('notificationsLoadFailed')}</p>}
          {estado === 'pronto' && notificacoes.length === 0 && (
            <p className="bp-header__dropdown-empty">{t('noNotifications')}</p>
          )}
          {estado === 'pronto' && notificacoes.map((notificacao) => (
            <button
              key={notificacao.id}
              type="button"
              className={`bp-header__dropdown-item bp-header__notification ${notificacao.lida_em ? '' : 'is-unread'}`}
              onClick={() => abrirNotificacao(notificacao)}
            >
              <strong>{notificacao.titulo}</strong>
              {notificacao.mensagem && <span>{notificacao.mensagem}</span>}
              {notificacao.criada_em && (
                <small>
                  {formatDate(notificacao.criada_em, {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </small>
              )}
            </button>
          ))}
          <button
            type="button"
            className="bp-header__dropdown-footer"
            onClick={() => { onFechar(); navigate('/notificacoes'); }}
          >
            {t('viewAllNotifications')}
          </button>
        </div>
      )}
    </div>
  );
}

function MiniCarrinho({ aberto, onAlternar, onFechar, quantidadeTotal }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { cartItems, removeFromCart, getTotal } = useCart();
  const visiveis = cartItems.slice(0, MAXIMO_ITENS_MINI_CARRINHO);
  const restantes = cartItems.length - visiveis.length;

  return (
    <div className="bp-header__menu">
      <button
        type="button"
        className="bp-header__icon-btn"
        onClick={onAlternar}
        aria-expanded={aberto}
        aria-haspopup="true"
        title={t('myCart')}
        aria-label={t('myCart')}
      >
        <CartIcon />
        {quantidadeTotal > 0 && (
          <span className="bp-header__badge">
            {quantidadeTotal > 99 ? '99+' : quantidadeTotal}
          </span>
        )}
      </button>

      {aberto && (
        <div className="bp-header__dropdown bp-header__dropdown--wide">
          <div className="bp-header__dropdown-title">{t('myCart')}</div>
          {cartItems.length === 0 ? (
            <p className="bp-header__dropdown-empty">{t('Seu carrinho está vazio')}</p>
          ) : (
            <>
              {visiveis.map((item) => (
                <div key={item.id} className="bp-header__mini-cart-item">
                  <button
                    type="button"
                    className="bp-header__mini-cart-link"
                    onClick={() => { onFechar(); navigate(`/pecas/${item.id}`); }}
                  >
                    {item.imagem
                      ? <img src={item.imagem} alt="" />
                      : <span className="bp-header__mini-cart-placeholder" aria-hidden="true" />}
                    <span className="bp-header__mini-cart-info">
                      <strong>{item.nome || t('partWithoutName')}</strong>
                      <small>{item.quantidade} × {formatarMoedaCarrinho(item.preco)}</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="bp-header__mini-cart-remove"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`${t('removeFromCart')}: ${item.nome || ''}`}
                    title={t('removeFromCart')}
                  >
                    ×
                  </button>
                </div>
              ))}
              {restantes > 0 && (
                <p className="bp-header__dropdown-empty">{t('moreCartItems', { count: restantes })}</p>
              )}
              <div className="bp-header__mini-cart-total">
                <span>{t('subtotal')}</span>
                <strong>{formatarMoedaCarrinho(getTotal())}</strong>
              </div>
            </>
          )}
          <button
            type="button"
            className="bp-header__dropdown-footer bp-header__dropdown-footer--primary"
            onClick={() => { onFechar(); navigate('/carrinho'); }}
          >
            {t('viewCart')}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Inline SVG icons ── */
function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 17a2 2 0 0 0 4 0" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
