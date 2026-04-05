/**
 * UserMenu.jsx
 *
 * Componente responsável pelo menu do usuário (dropdown).
 *
 * Permite acessar ações como:
 * - Login
 * - Cadastro
 *
 * Futuramente poderá incluir:
 * - Perfil
 * - Pedidos
 * - Logout
 *
 * Também controla abertura/fechamento e clique fora do menu.
 */
import { useEffect, useRef, useState } from "react";

function ChevronDownIcon({ open = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-5 h-5"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" d="M5 19c1.8-3 4.1-4.5 7-4.5s5.2 1.5 7 4.5" />
    </svg>
  );
}

export default function UserMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleEsc(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative flex items-center gap-2 sm:gap-3 shrink-0 pr-1 sm:pr-2">
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex items-center gap-2 sm:gap-3 text-[#f7d784] hover:opacity-90 transition"
      >
        <span className="w-9 h-9 rounded-full border-2 border-[#f7d784] flex items-center justify-center overflow-hidden">
          <UserIcon />
        </span>

        <span className="hidden sm:flex items-center">
          <ChevronDownIcon open={menuOpen} />
        </span>
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-[52px] w-52 sm:w-56 rounded-2xl border border-[#c6939d] bg-[#f8f1e6] shadow-[0_18px_45px_rgba(0,0,0,0.22)] overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-[#e5d2c9] bg-[#f3e7d8]">
            <p className="text-sm font-semibold text-[#7b1024]">Minha conta</p>
            <p className="text-xs text-[#8a6c63]">
              Acesse ou crie sua conta
            </p>
          </div>

          <div className="p-2">
            <a
              href="http://localhost:5173/login"
              className="block w-full px-4 py-3 rounded-xl text-[#6e1a2b] hover:bg-[#efe2d5] transition font-medium no-underline"
            >
              Entrar
            </a>

            <a
              href="http://localhost:5173/cadastro"
              className="block w-full px-4 py-3 rounded-xl text-[#6e1a2b] hover:bg-[#efe2d5] transition font-medium no-underline"
            >
              Cadastrar-se
            </a>
          </div>
        </div>
      )}
    </div>
  );
}