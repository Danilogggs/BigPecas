/**
 * Header.jsx
 *
 * Componente do topo da aplicação.
 * Contém a barra de busca e o acesso ao menu do usuário.
 *
 * Responsável por interações globais como busca e acesso à conta.
 */
import UserMenu from "./UserMenu";

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-5 h-5"
    >
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m20 20-3.5-3.5" />
    </svg>
  );
}

export default function Header() {
  return (
    <header className="min-h-[76px] lg:h-[84px] bg-[#7b1024] flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8 gap-3 sm:gap-4 lg:gap-6 overflow-visible relative z-30">
      <div className="flex-1 max-w-full lg:max-w-[760px] relative">
        <input
          placeholder="Buscar peças, modelos..."
          className="w-full h-12 sm:h-13 lg:h-14 rounded-full bg-[#9a4f5f] border border-[#bb7583] pl-5 sm:pl-6 lg:pl-8 pr-14 lg:pr-16 text-white placeholder:text-[#eed5da] outline-none text-[15px] sm:text-[16px] lg:text-[18px]"
        />
        <span className="absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 text-[#e5b452]">
          <SearchIcon />
        </span>
      </div>

      <UserMenu />
    </header>
  );
}