import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardNav() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function navLinkClass(path) {
    const active = location.pathname === path;
    return `px-3 py-2 rounded-xl text-sm font-medium no-underline transition ${
      active
        ? 'bg-[#6B1E2D] text-white'
        : 'text-[#6A5F58] hover:text-[#6B1E2D] hover:bg-[#6B1E2D]/10'
    }`;
  }

  return (
    <header className="border-b border-[#D8CFC2] bg-[#F4E9D8]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="no-underline">
          <p className="text-xs uppercase tracking-[0.35em] text-[#6A5F58] m-0">Retro Garage</p>
          <span className="font-serif text-2xl font-bold text-[#6B1E2D]">BigPeças</span>
        </Link>

        <nav className="hidden gap-2 md:flex">
          <Link to="/dashboard" className={navLinkClass('/dashboard')}>Dashboard</Link>
          <Link to="/catalogo" className={navLinkClass('/catalogo')}>Catálogo</Link>
          <Link to="/cadastroPecas" className={navLinkClass('/cadastroPecas')}>Cadastrar Peça</Link>
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[#6A5F58] sm:block">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-[#6B1E2D] px-4 py-2 text-sm font-medium text-[#6B1E2D] transition hover:bg-[#6B1E2D] hover:text-white"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
