import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { SearchIcon, UserIcon, ChevronDownIcon } from './Icons';

const BORDEAUX = '#7B1D2E';
const CREAM = '#F5EDD8';
const HIGHLIGHT = '#F0C060';
const SPACING = {
  SM: '0.5rem',
  MD: '1rem',
  LG: '1.5rem',
};

export default function Header() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [localSearch, setLocalSearch] = useState(searchParams.get('nome') || '');

  useEffect(() => {
    setLocalSearch(searchParams.get('nome') || '');
  }, [searchParams]);

  const { user, logout } = useAuth();
  const { cartItems } = useCart();
  const cartCount = cartItems.reduce((s, it) => s + (it.quantidade || 0), 0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (localSearch.trim()) {
      navigate(`/buscaPecas?nome=${encodeURIComponent(localSearch)}`);
    } else {
      navigate('/buscaPecas');
    }
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${SPACING.LG}`,
        backgroundColor: BORDEAUX,
        minHeight: 76,
        gap: SPACING.LG,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        style={{
          width: '20%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span
          style={{
            fontSize: '1.3rem',
            fontWeight: 700,
            color: HIGHLIGHT,
            fontFamily: "'Georgia', serif",
            letterSpacing: '-0.5px',
          }}
        >
          BigPeças
        </span>
      </button>

      {/* Search bar */}
      <div style={{ width: '25%' }}>
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255,255,255,0.13)',
            border: '1.5px solid rgba(255,255,255,0.3)',
            overflow: 'hidden',
          }}
        >
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Buscar peças, modelos..."
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              outline: 'none',
              border: 'none',
              padding: `${SPACING.SM} ${SPACING.MD}`,
              fontSize: '0.875rem',
              color: '#fff',
            }}
          />
          <button
            type="submit"
            style={{
              padding: `${SPACING.SM} ${SPACING.MD}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              color: HIGHLIGHT,
              cursor: 'pointer',
            }}
          >
            <SearchIcon size={17} />
          </button>
        </form>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Cart Quick Access */}
      {user && (
        <button
          onClick={() => navigate('/carrinho')}
          title="Meu carrinho"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: '9999px',
            backgroundColor: 'rgba(255,255,255,0.13)',
            border: '1.5px solid rgba(255,255,255,0.3)',
            color: CREAM,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.22)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.13)';
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {cartCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                backgroundColor: HIGHLIGHT,
                color: BORDEAUX,
                borderRadius: '9999px',
                minWidth: 20,
                height: 20,
                padding: '0 5px',
                fontSize: '0.7rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${BORDEAUX}`,
              }}
            >
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>
      )}

      {/* User menu */}
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: `${SPACING.SM} ${SPACING.MD}`,
            borderRadius: '9999px',
            backgroundColor: dropdownOpen ? 'rgba(255,255,255,0.15)' : 'transparent',
            border: 'none',
            color: CREAM,
            cursor: 'pointer',
            transition: 'all 0.25s',
          }}
        >
          <ChevronDownIcon
            size={17}
            color={HIGHLIGHT}
            style={{
              transition: 'transform 0.25s',
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
          <UserIcon size={26} />
        </button>

        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: SPACING.SM,
              minWidth: 190,
              backgroundColor: '#fff',
              border: `1.5px solid ${BORDEAUX}22`,
              borderRadius: '0.75rem',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              zIndex: 50,
            }}
          >
            {user ? (
              <>
                <button
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: SPACING.MD,
                    padding: `${SPACING.MD} ${SPACING.LG}`, fontSize: '0.875rem', color: BORDEAUX,
                    border: 'none', cursor: 'pointer', backgroundColor: 'transparent', textAlign: 'left',
                    fontWeight: 500, borderBottom: '1px solid #F3E8D8',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF5E8')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => { navigate('/'); setDropdownOpen(false); }}
                >
                  Início
                </button>
                <button
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: SPACING.MD,
                    padding: `${SPACING.MD} ${SPACING.LG}`, fontSize: '0.875rem', color: BORDEAUX,
                    border: 'none', cursor: 'pointer', backgroundColor: 'transparent', textAlign: 'left',
                    fontWeight: 500, borderBottom: '1px solid #F3E8D8',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF5E8')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => { navigate('/perfil'); setDropdownOpen(false); }}
                >
                  Editar perfil
                </button>


                <button
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: SPACING.MD,
                    padding: `${SPACING.MD} ${SPACING.LG}`, fontSize: '0.875rem', color: BORDEAUX,
                    border: 'none', cursor: 'pointer', backgroundColor: 'transparent', textAlign: 'left',
                    fontWeight: 500, borderBottom: '1px solid #F3E8D8',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF5E8')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => { navigate('/wish'); setDropdownOpen(false); }}
                >
                  Lista de Desejos
                </button>

                <button
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: SPACING.MD,
                    padding: `${SPACING.MD} ${SPACING.LG}`, fontSize: '0.875rem', color: BORDEAUX,
                    border: 'none', cursor: 'pointer', backgroundColor: 'transparent', textAlign: 'left',
                    fontWeight: 500, borderBottom: '1px solid #F3E8D8',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF5E8')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => { navigate('/carrinho'); setDropdownOpen(false); }}
                >
                  Carrinho
                </button>

                <button
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: SPACING.MD,
                    padding: `${SPACING.MD} ${SPACING.LG}`, fontSize: '0.875rem', color: BORDEAUX,
                    border: 'none', cursor: 'pointer', backgroundColor: 'transparent', textAlign: 'left',
                    fontWeight: 500, borderBottom: '1px solid #F3E8D8',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF5E8')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => { navigate('/pedidos'); setDropdownOpen(false); }}
                >
                  Meus Pedidos
                </button>

                <button
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: SPACING.MD,
                    padding: `${SPACING.MD} ${SPACING.LG}`, fontSize: '0.875rem', color: '#B91C1C',
                    border: 'none', cursor: 'pointer', backgroundColor: 'transparent', textAlign: 'left',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF5E8')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => { logout(); navigate('/login'); setDropdownOpen(false); }}
                >
                  Sair
                </button>
              </>
            ) : (
              <button
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: SPACING.MD,
                  padding: `${SPACING.MD} ${SPACING.LG}`, fontSize: '0.875rem', color: BORDEAUX,
                  border: 'none', cursor: 'pointer', backgroundColor: 'transparent', textAlign: 'left',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF5E8')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                onClick={() => { navigate('/login'); setDropdownOpen(false); }}
              >
                Login
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}