import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="border-b border-[#D8CFC2] bg-[#F4E9D8]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="no-underline">
          <p className="text-xs uppercase tracking-[0.35em] text-[#6A5F58] m-0">Retro Garage</p>
          <span className="font-serif text-2xl font-bold text-[#6B1E2D]">BigPeças</span>
        </Link>

        <nav className="hidden gap-8 text-sm font-medium md:flex text-[#4A3D36]">
          <Link to="/" className="transition hover:text-[#6B1E2D] no-underline text-[#4A3D36]">Início</Link>
          <a href="#catalogo" className="transition hover:text-[#6B1E2D] no-underline text-[#4A3D36]">Catálogo</a>
          <a href="#categorias" className="transition hover:text-[#6B1E2D] no-underline text-[#4A3D36]">Categorias</a>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="rounded-xl border border-[#6B1E2D] px-4 py-2 text-sm font-medium text-[#6B1E2D] transition hover:bg-[#6B1E2D] hover:text-white no-underline"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-xl bg-[#6B1E2D] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#541723]"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl border border-[#6B1E2D] px-4 py-2 text-sm font-medium text-[#6B1E2D] transition hover:bg-[#6B1E2D] hover:text-white no-underline"
              >
                Entrar
              </Link>
              <Link
                to="/cadastro"
                className="rounded-xl bg-[#6B1E2D] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#541723] no-underline"
              >
                Cadastrar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
