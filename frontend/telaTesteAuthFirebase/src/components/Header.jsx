import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SearchIcon, UserIcon, ChevronDownIcon } from './Icons';
import styles from './Header.module.css';

export default function Header() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [localSearch, setLocalSearch] = useState(searchParams.get('nome') || '');

  useEffect(() => {
    setLocalSearch(searchParams.get('nome') || '');
  }, [searchParams]);

  const { user, logout } = useAuth();
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
      navigate(`/buscapecas?nome=${encodeURIComponent(localSearch)}`);
    } else {
      navigate('/buscaPecas');
    }
  };

  return (
    <header className={styles.header}>
      {/* Logo */}
      <button className={styles.logoBtn} onClick={() => navigate('/')}>
        <span className={styles.logoEyebrow}>Retro Garage</span>
        <span className={styles.logoName}>BigPeças</span>
      </button>

      {/* Nav */}
      <nav className={styles.nav}>
        {[
          { label: 'Início', path: '/' },
          { label: 'Catálogo', path: '/buscaPecas' },
        ].map(({ label, path }) => (
          <button key={path} className={styles.navLink} onClick={() => navigate(path)}>
            {label}
          </button>
        ))}
      </nav>

      {/* Search */}
      <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
        <input
          type="text"
          className={styles.searchInput}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Buscar peças, modelos..."
        />
        <button type="submit" className={styles.searchBtn}>
          <SearchIcon size={16} />
        </button>
      </form>

      <div className={styles.spacer} />

      {/* User menu */}
      <div className={styles.userMenu} ref={dropdownRef}>
        <button
          className={`${styles.userBtn} ${dropdownOpen ? styles.userBtnOpen : ''}`}
          onClick={() => setDropdownOpen((v) => !v)}
        >
          <UserIcon size={20} />
          <ChevronDownIcon
            size={14}
            className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ''}`}
          />
        </button>

        {dropdownOpen && (
          <div className={styles.dropdown}>
            {user ? (
              <>
                <button
                  className={styles.dropdownItem}
                  onClick={() => { navigate('/dashboard'); setDropdownOpen(false); }}
                >
                  Dashboard
                </button>
                <button
                  className={styles.dropdownItem}
                  onClick={() => { navigate('/perfil'); setDropdownOpen(false); }}
                >
                  Editar perfil
                </button>
                <button
                  className={`${styles.dropdownItem} ${styles.danger}`}
                  onClick={() => { logout(); navigate('/login'); setDropdownOpen(false); }}
                >
                  Sair
                </button>
              </>
            ) : (
              <button
                className={styles.dropdownItem}
                onClick={() => { navigate('/login'); setDropdownOpen(false); }}
              >
                Entrar
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
