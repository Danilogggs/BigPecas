import { useState, useRef, useEffect } from "react";
import { User, ChevronDown, Search, ShoppingCart, LogOut, Edit3, ChevronRight, Star, Wrench, Zap } from "lucide-react";

const BORDEAUX = "#7B1D2E";
const CREAM = "#F5EDD8";

const catalogItems = [
  {
    id: 1,
    name: "Motor V8 Recondicionado",
    year: "1968",
    price: "R$ 12.500,00",
    img: "https://images.unsplash.com/photo-1765211002533-abda20c22651?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwY2xhc3NpYyUyMGNhciUyMGVuZ2luZSUyMHBhcnRzfGVufDF8fHx8MTc3NDMwMDcyNHww&ixlib=rb-4.1.0&q=80&w=400",
    badge: "Destaque",
  },
  {
    id: 2,
    name: "Roda Cromada Clássica",
    year: "1972",
    price: "R$ 1.890,00",
    img: "https://images.unsplash.com/photo-1772391579024-fc09e103be4b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwY2FyJTIwd2hlZWwlMjBjaHJvbWUlMjByaW18ZW58MXx8fHwxNzc0MzAwNzI4fDA&ixlib=rb-4.1.0&q=80&w=400",
    badge: "Novo",
  },
  {
    id: 3,
    name: "Painel Original Restaurado",
    year: "1965",
    price: "R$ 3.200,00",
    img: "https://images.unsplash.com/photo-1601304713917-557bbfcdb7c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbnRpcXVlJTIwY2FyJTIwZGFzaGJvYXJkJTIwc3RlZXJpbmclMjB3aGVlbHxlbnwxfHx8fDE3NzQzMDA3Mjh8MA&ixlib=rb-4.1.0&q=80&w=400",
    badge: "Raro",
  },
  {
    id: 4,
    name: "Kit Restauração Completo",
    year: "1970",
    price: "R$ 8.750,00",
    img: "https://images.unsplash.com/photo-1591278169757-deac26e49555?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjByZXRybyUyMGNhciUyMHJlc3RvcmF0aW9uJTIwZ2FyYWdlfGVufDF8fHx8MTc3NDMwMDcyNXww&ixlib=rb-4.1.0&q=80&w=400",
    badge: "Kit",
  },
];

const navItems = [
  { label: "Catálogo", icon: <Wrench size={16} /> },
  { label: "FAQ", icon: <Zap size={16} /> },
  { label: "Fornecedores", icon: <Star size={16} /> },
];

const dropdownItems = [
  { label: "Editar Perfil", icon: <Edit3 size={15} /> },
  { label: "Meu Carrinho", icon: <ShoppingCart size={15} /> },
  { label: "Sair", icon: <LogOut size={15} /> },
];

export default function App() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Catálogo");
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: CREAM }}>
      {/* ── HEADER ── */}
      <header
        className="flex items-center px-6 py-0 select-none shrink-0"
        style={{ backgroundColor: BORDEAUX, minHeight: 64 }}
      >
        {/* Logo – 20% */}
        <div
          className="flex items-center gap-2 shrink-0"
          style={{ width: "20%" }}
        >
          <span
            className="tracking-widest uppercase"
            style={{
              color: "#F5EDD8",
              fontFamily: "'Georgia', serif",
              fontSize: "1.55rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textShadow: "1px 1px 4px rgba(0,0,0,0.35)",
              whiteSpace: "nowrap",
            }}
          >
            🔧 Big<span style={{ color: "#F0C060" }}>Peças</span>
          </span>
        </div>

        {/* Search bar – 25% */}
        <div className="flex items-center shrink-0" style={{ width: "25%" }}>
          <div
            className="flex items-center w-full rounded-full overflow-hidden"
            style={{ backgroundColor: "rgba(255,255,255,0.13)", border: "1.5px solid rgba(255,255,255,0.3)" }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar peças, modelos..."
              className="flex-1 bg-transparent outline-none px-4 py-2 text-sm placeholder:text-white/60"
              style={{ color: "#fff" }}
            />
            <button
              className="px-3 py-2 flex items-center justify-center transition-opacity hover:opacity-80"
              style={{ color: "#F0C060" }}
            >
              <Search size={17} />
            </button>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all"
            style={{
              backgroundColor: dropdownOpen ? "rgba(255,255,255,0.15)" : "transparent",
              color: "#F5EDD8",
            }}
          >
            <ChevronDown
              size={17}
              style={{
                transition: "transform 0.25s",
                transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                color: "#F0C060",
              }}
            />
            <User size={26} strokeWidth={1.6} />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 rounded-xl overflow-hidden shadow-2xl z-50"
              style={{
                minWidth: 190,
                backgroundColor: "#fff",
                border: `1.5px solid ${BORDEAUX}22`,
                top: "100%",
              }}
            >
              {dropdownItems.map((item, i) => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors text-left"
                  style={{
                    color: item.label === "Sair" ? "#B91C1C" : "#3B1A22",
                    borderBottom: i < dropdownItems.length - 1 ? "1px solid #F3E8D8" : "none",
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#FFF5E8")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                  onClick={() => setDropdownOpen(false)}
                >
                  <span style={{ color: item.label === "Sair" ? "#B91C1C" : BORDEAUX }}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar – 20% */}
        <aside
          className="flex flex-col shrink-0 pt-6 pb-10"
          style={{ width: "20%", backgroundColor: BORDEAUX }}
        >
          <p
            className="px-6 pb-3 uppercase tracking-widest text-xs"
            style={{ color: "rgba(255,255,255,0.45)", fontWeight: 600 }}
          >
            Menu
          </p>
          <nav className="flex flex-col gap-1 px-3">
            {navItems.map((item) => {
              const isActive = activeNav === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveNav(item.label)}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left group"
                  style={{
                    backgroundColor: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                    color: isActive ? "#F0C060" : "#F5EDD8",
                    fontWeight: isActive ? 600 : 400,
                    borderLeft: isActive ? "3px solid #F0C060" : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </span>
                  <ChevronRight size={14} style={{ opacity: isActive ? 1 : 0.4 }} />
                </button>
              );
            })}
          </nav>

          {/* Decorative divider */}
          <div className="mx-6 my-6" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }} />

          {/* Info card */}
          <div
            className="mx-3 rounded-xl px-4 py-4"
            style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
          >
            <p className="text-xs mb-1" style={{ color: "#F0C060", fontWeight: 700 }}>
              Precisa de ajuda?
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
              Fale com nossos especialistas em peças vintage.
            </p>
            <button
              className="mt-3 w-full py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#F0C060", color: BORDEAUX, fontWeight: 700 }}
            >
              Contato
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: CREAM }}>
          {/* Hero banner */}
          <div
            className="relative flex items-center px-10 py-10 overflow-hidden"
            style={{
              background: `linear-gradient(120deg, ${BORDEAUX}EE 0%, ${BORDEAUX}99 60%, transparent 100%)`,
              minHeight: 200,
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1591278169757-deac26e49555?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjByZXRybyUyMGNhciUyMHJlc3RvcmF0aW9uJTIwZ2FyYWdlfGVufDF8fHx8MTc3NDMwMDcyNXww&ixlib=rb-4.1.0&q=80&w=1080')`,
              }}
            />
            <div className="relative z-10">
              <h1
                className="mb-2"
                style={{
                  color: "#F0C060",
                  fontFamily: "'Georgia', serif",
                  fontSize: "1.8rem",
                  fontWeight: 700,
                }}
              >
                Peças Originais para Clássicos
              </h1>
              <p className="text-sm max-w-md" style={{ color: "rgba(255,255,255,0.85)" }}>
                Encontre as melhores peças para restaurar o seu automóvel vintage com qualidade e procedência garantida.
              </p>
              <button
                className="mt-5 px-6 py-2.5 rounded-full text-sm transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: "#F0C060", color: BORDEAUX, fontWeight: 700 }}
              >
                Ver Catálogo Completo
              </button>
            </div>
          </div>

          {/* Section title */}
          <div className="flex items-center justify-between px-8 pt-8 pb-3">
            <div>
              <h2
                style={{
                  color: BORDEAUX,
                  fontFamily: "'Georgia', serif",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                }}
              >
                Peças em Destaque
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "#9B7B6A" }}>
                Seleção especial para restauradores exigentes
              </p>
            </div>
            <button
              className="flex items-center gap-1 text-xs px-4 py-2 rounded-full transition-all hover:opacity-80"
              style={{ color: BORDEAUX, border: `1.5px solid ${BORDEAUX}`, fontWeight: 600 }}
            >
              Ver todos <ChevronRight size={13} />
            </button>
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 px-8 pb-10">
            {catalogItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl overflow-hidden shadow-sm flex flex-col transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                style={{ backgroundColor: "#fff", border: "1px solid #EAD8BE" }}
              >
                {/* Image */}
                <div className="relative" style={{ height: 160 }}>
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  <span
                    className="absolute top-2 left-2 text-xs px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: BORDEAUX, color: "#F0C060", fontWeight: 700 }}
                  >
                    {item.badge}
                  </span>
                </div>
                {/* Info */}
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-xs mb-1" style={{ color: "#9B7B6A" }}>
                    Ano: {item.year}
                  </p>
                  <p
                    className="text-sm flex-1"
                    style={{ color: "#3B1A22", fontWeight: 600, lineHeight: 1.4 }}
                  >
                    {item.name}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span
                      style={{ color: BORDEAUX, fontWeight: 700, fontSize: "0.95rem" }}
                    >
                      {item.price}
                    </span>
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all hover:opacity-80"
                      style={{ backgroundColor: BORDEAUX, color: "#F0C060", fontWeight: 600 }}
                    >
                      <ShoppingCart size={12} />
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
