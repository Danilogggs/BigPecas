import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { buscarPerfilUsuario } from '../services/usuarioService';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { cartItems } = useCart();

  const [localSearch, setLocalSearch] = useState(searchParams.get('nome') || '');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const dropdownRef = useRef(null);
  const cartCount = cartItems.reduce((s, it) => s + (it.quantidade || 0), 0);

  useEffect(() => { setLocalSearch(searchParams.get('nome') || ''); }, [searchParams]);

  useEffect(() => { setDropdownOpen(false); }, [location.pathname]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsAdmin(false);
      return undefined;
    }
    buscarPerfilUsuario()
      .then((profile) => { if (active) setIsAdmin(profile?.is_admin === true); })
      .catch(() => { if (active) setIsAdmin(false); });
    return () => { active = false; };
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
    { label: 'Catálogo',       path: '/buscaPecas' },
    { label: 'Vender peça',    path: '/cadastroPecas' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <header className="bp-header">
      {/* Logo */}
      <button className="bp-header__logo" onClick={() => navigate('/')}>
        <ShieldIcon className="bp-header__logo-icon" />
        <div className="bp-header__logo-text">
          <span>Big</span><span>Peças</span>
        </div>
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
          placeholder="Buscar peça, código ou modelo…"
        />
        <button type="submit" aria-label="Buscar">
          <SearchIcon />
        </button>
      </form>

      <div className="bp-header__spacer" />

      {/* Actions */}
      <div className="bp-header__actions">
        {/* Cart */}
        {user && (
          <button
            className="bp-header__cart"
            onClick={() => navigate('/carrinho')}
            title="Meu carrinho"
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
              aria-label="Abrir menu da conta"
            >
              <UserIcon />
              <ChevronIcon open={dropdownOpen} />
            </button>

            {dropdownOpen && (
              <div className="bp-header__dropdown" role="menu">
                {[
                  { label: 'Início',            path: '/' },
                  ...(isAdmin ? [{ label: 'Administração', path: '/admin' }] : []),
                  { label: 'Catálogo',           path: '/buscaPecas' },
                  { label: 'Vender peça',        path: '/cadastroPecas' },
                  { label: 'Editar perfil',      path: '/perfil' },
                  { label: 'Lista de Desejos',   path: '/wish' },
                  { label: 'Carrinho',           path: '/carrinho' },
                  { label: 'Chats',              path: '/chats' },
                  { label: 'Compras e vendas',   path: '/pedidos' },
                  { label: 'Configurações',      path: '/configuracoes' },
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
                  Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="bp-header__btn-login"
            onClick={() => navigate('/login')}
          >
            Entrar
          </button>
        )}
      </div>
    </header>
  );
}

/* ── Inline SVG icons ── */
function ShieldIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2Z" />
      <path d="M9 12l2 2 4-4" strokeWidth="2" />
    </svg>
  );
}

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
