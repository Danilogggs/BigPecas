/**
 * Sidebar.jsx
 *
 * Componente responsável pelo menu lateral da aplicação.
 * Exibe navegação principal (Catálogo, FAQ, Fornecedores)
 * e ações auxiliares como suporte ao usuário.
 *
 * Também pode ser integrado com rotas para navegação entre páginas.
 */
function Icon({ type, className = "w-5 h-5" }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    viewBox: "0 0 24 24",
    className,
  };

  if (type === "wrench") {
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-5.6 5.6a1.5 1.5 0 1 0 2.1 2.1l5.6-5.6a4 4 0 0 0 5.4-5.4l-2.2 2.2-2.1-.4-.4-2.1 2.6-2.2Z"
        />
      </svg>
    );
  }

  if (type === "bolt") {
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
        />
      </svg>
    );
  }

  if (type === "star") {
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z"
        />
      </svg>
    );
  }

  return null;
}

function SidebarLogo() {
  return (
    <div className="px-5 py-5 lg:px-8 lg:py-7 border-b border-[#8e2436] flex items-center gap-3 lg:gap-4 justify-center lg:justify-start">
      <span className="text-[#f3d27a]">
        <Icon type="wrench" className="w-5 h-5 lg:w-6 lg:h-6" />
      </span>
      <div className="text-[18px] sm:text-[20px] lg:text-[24px] tracking-[0.18em] lg:tracking-[0.22em] font-semibold text-[#e7be62] uppercase">
        BIGPEÇAS
      </div>
    </div>
  );
}

function SidebarMenuItem({ icon, label, active }) {
  return (
    <button
      className={`w-full rounded-[18px] lg:rounded-[24px] px-4 py-4 lg:px-6 lg:py-5 flex items-center justify-between text-left transition-all border ${
        active
          ? "bg-[#a04c5c] text-[#f1c75f] border-[#d9a24d] shadow-md"
          : "bg-transparent text-[#fff3f4] border-transparent hover:bg-[#8d2438]"
      }`}
    >
      <div className="flex items-center gap-3 lg:gap-4 text-[15px] lg:text-[17px] font-medium">
        <span className={active ? "text-[#f1c75f]" : "text-[#fff3f4]"}>
          <Icon type={icon} className="w-5 h-5" />
        </span>
        <span>{label}</span>
      </div>
      <span className="text-lg lg:text-xl opacity-80">›</span>
    </button>
  );
}

function SupportCard() {
  return (
    <div className="mx-4 mt-8 lg:mx-5 lg:mt-12 rounded-[24px] lg:rounded-[28px] bg-[#7a0f22] p-5 lg:p-7 border border-[#933244] shadow-lg">
      <h3 className="text-[#f0c154] text-[22px] sm:text-[24px] lg:text-[28px] font-semibold leading-tight mb-3 lg:mb-4">
        Precisa de ajuda?
      </h3>

      <p className="text-[#f6dfe3] text-[15px] sm:text-base lg:text-lg leading-relaxed mb-6 lg:mb-8">
        Fale com nossos especialistas em peças vintage.
      </p>

      <button className="w-full rounded-[18px] lg:rounded-[20px] bg-[#e6b956] hover:brightness-105 transition px-5 py-3 lg:px-6 lg:py-4 text-[#711328] font-semibold text-[16px] sm:text-[18px] lg:text-[20px] shadow-md">
        Contato
      </button>
    </div>
  );
}

export default function Sidebar({ items }) {
  return (
    <aside className="w-full lg:w-[320px] lg:min-w-[320px] bg-[#7b1024] border-b lg:border-b-0 lg:border-r border-[#8e2436] flex flex-col">
      <SidebarLogo />

      <div className="px-5 pt-6 pb-3 lg:px-7 lg:pt-12 lg:pb-4 text-[#e4c7cd] text-xs lg:text-sm font-semibold tracking-[0.18em] lg:tracking-[0.22em] uppercase text-center">
        Menu
      </div>

      <nav className="px-4 pb-4 lg:px-5 lg:pb-0 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3 lg:space-y-5 lg:gap-0">
        {items.map((item) => (
          <SidebarMenuItem key={item.label} {...item} />
        ))}
      </nav>

      <div className="hidden lg:block">
        <SupportCard />
      </div>

      <div className="hidden lg:block mt-auto p-4">
        <button className="rounded-xl bg-[#293241] text-white/90 px-5 py-3 text-sm shadow-md">
          Gerenciar cookies ou desativar
        </button>
      </div>
    </aside>
  );
}