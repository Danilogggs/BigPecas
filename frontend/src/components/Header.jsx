import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { buscarPerfilUsuario } from '../services/usuarioService';
import { buscarContagemNotificacoesNaoLidas } from '../services/notificacoesService';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import CurrencySelector from './CurrencySelector';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { cartItems } = useCart();
  const { t } = useLanguage();

  const [localSearch, setLocalSearch] = useState(searchParams.get('nome') || '');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAvaliador, setIsAvaliador] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const dropdownRef = useRef(null);
  const cartCount = cartItems.reduce((s, it) => s + (it.quantidade || 0), 0);

  useEffect(() => { setLocalSearch(searchParams.get('nome') || ''); }, [searchParams]);

  useEffect(() => { setDropdownOpen(false); }, [location.pathname]);

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
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
      <div className="bp-header__actions">
        <LanguageSwitcher /><CurrencySelector />
        <button
          type="button"
          className="bp-header__notifications"
          onClick={() => navigate('/notificacoes')}
          title={t('notifications')}
          aria-label={t('notifications')}
        >
          <BellIcon />
          {notificacoesNaoLidas > 0 && (
            <span className="bp-header__notifications-badge">
              {notificacoesNaoLidas > 99 ? '99+' : notificacoesNaoLidas}
            </span>
          )}
        </button>
        {/* Cart */}
        {user && (
          <button
            className="bp-header__cart"
            onClick={() => navigate('/carrinho')}
            title={t('myCart')}
          >
            <CartIcon />
            {cartCount > 0 && (
              <span className="bp-header__cart-badge">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        )}

        {/* User menu or Entrar */}
        {user ? (
          <div className="bp-header__user" ref={dropdownRef}>
            <button
              className="bp-header__user-btn"
              onClick={() => setDropdownOpen((v) => !v)}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
              aria-label={t('accountMenu')}
            >
              <UserIcon />
              <ChevronIcon open={dropdownOpen} />
            </button>

            {dropdownOpen && (
              <div className="bp-header__dropdown" role="menu">
                {[
                  { label: t('home'),            path: '/' },
                  ...(isAdmin ? [{ label: t('administration'), path: '/admin' }] : []),
                  { label: t('catalog'),         path: '/buscaPecas' },
                  { label: t('sellPart'),        path: '/cadastroPecas' },
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
                    onClick={() => { navigate(path); setDropdownOpen(false); }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  className="bp-header__dropdown-item bp-header__dropdown-item--danger"
                  role="menuitem"
                  onClick={() => { logout(); navigate('/login'); setDropdownOpen(false); }}
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
