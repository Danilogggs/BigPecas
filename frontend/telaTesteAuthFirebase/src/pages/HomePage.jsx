import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const categories = [
  { name: 'Motor', icon: '⚙️' },
  { name: 'Freios', icon: '🔧' },
  { name: 'Suspensão', icon: '🔩' },
  { name: 'Interior', icon: '🪑' },
  { name: 'Lataria', icon: '🚗' },
  { name: 'Elétrica', icon: '⚡' },
];

const featuredParts = [
  { name: 'Farol Opala 78', category: 'Iluminação', price: 'R$ 420', condition: 'Restaurado' },
  { name: 'Volante Fusca', category: 'Interior', price: 'R$ 310', condition: 'Original' },
  { name: 'Grade Chevette', category: 'Acabamento', price: 'R$ 260', condition: 'Bom estado' },
  { name: 'Retrovisor Maverick', category: 'Exterior', price: 'R$ 380', condition: 'Revisado' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAF6EF] text-[#1C1C1C]">
      <Navbar />

      <main>
        {/* Hero */}
        <section
          id="inicio"
          className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"
        >
          <div>
            <p className="mb-3 inline-block rounded-full bg-[#C2A878]/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#7C6540]">
              Catálogo de peças usadas
            </p>
            <h2 className="max-w-2xl font-serif text-4xl font-bold leading-tight text-[#2C1A17] md:text-5xl">
              Encontre peças de carros antigos com visual clássico e confiança na compra.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#6A5F58] md:text-lg">
              Um sistema pensado para vender peças automotivas usadas com organização, credibilidade e
              um estilo que remete à elegância dos carros antigos.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#catalogo"
                className="rounded-2xl bg-[#6B1E2D] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#541723] no-underline"
              >
                Ver catálogo
              </a>
              <a
                href="#categorias"
                className="rounded-2xl border border-[#C2A878] bg-white px-6 py-3 text-sm font-semibold text-[#2C1A17] transition hover:bg-[#F4E9D8] no-underline"
              >
                Buscar por categoria
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ['2.500+', 'Peças cadastradas'],
                ['320+', 'Modelos atendidos'],
                ['98%', 'Avaliação positiva'],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[#D8CFC2] bg-white p-4 shadow-sm"
                >
                  <p className="text-2xl font-bold text-[#6B1E2D]">{value}</p>
                  <p className="mt-1 text-sm text-[#6A5F58]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Search panel */}
          <div className="rounded-[28px] border border-[#D8CFC2] bg-white p-5 shadow-xl shadow-[#2C1A17]/10">
            <div className="rounded-[24px] bg-[#2C1A17] p-5 text-[#F4E9D8]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#C2A878]">Painel principal</p>
                  <h3 className="mt-1 font-serif text-2xl font-semibold">Busca rápida</h3>
                </div>
                <span className="rounded-full bg-[#6B1E2D] px-3 py-1 text-xs font-medium">Online</span>
              </div>

              <div className="space-y-3">
                <input
                  className="w-full rounded-xl border border-[#4A342E] bg-[#3A2521] px-4 py-3 text-sm text-[#F4E9D8] outline-none placeholder:text-[#BCAEA2]"
                  placeholder="Pesquisar peça, modelo ou código"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select className="rounded-xl border border-[#4A342E] bg-[#3A2521] px-4 py-3 text-sm text-[#F4E9D8] outline-none">
                    <option>Categoria</option>
                    <option>Motor</option>
                    <option>Interior</option>
                    <option>Lataria</option>
                  </select>
                  <select className="rounded-xl border border-[#4A342E] bg-[#3A2521] px-4 py-3 text-sm text-[#F4E9D8] outline-none">
                    <option>Condição</option>
                    <option>Original</option>
                    <option>Restaurado</option>
                    <option>Usado</option>
                  </select>
                </div>
                <button className="w-full rounded-xl bg-[#C2A878] px-4 py-3 text-sm font-semibold text-[#2C1A17] transition hover:opacity-90">
                  Buscar peças
                </button>
              </div>

              <div className="mt-6 rounded-2xl bg-[#F4E9D8] p-4 text-[#2C1A17]">
                <p className="text-xs uppercase tracking-[0.25em] text-[#6A5F58]">Exemplo de resultado</p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Carburador Weber 460</p>
                    <p className="text-sm text-[#6A5F58]">Chevette • Revisado • Estoque 3</p>
                  </div>
                  <p className="text-lg font-bold text-[#6B1E2D]">R$ 590</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section id="categorias" className="mx-auto max-w-7xl px-6 pb-6">
          <div className="rounded-[28px] border border-[#D8CFC2] bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#7C6540]">Categorias</p>
                <h3 className="mt-1 font-serif text-3xl font-semibold text-[#2C1A17]">
                  Navegue pelo catálogo
                </h3>
              </div>
              <button className="rounded-xl border border-[#6B1E2D] px-4 py-2 text-sm font-medium text-[#6B1E2D] transition hover:bg-[#6B1E2D] hover:text-white">
                Ver todas
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {categories.map(({ name, icon }) => (
                <div
                  key={name}
                  className="rounded-2xl border border-[#D8CFC2] bg-[#FAF6EF] p-5 text-center transition hover:-translate-y-1 hover:border-[#C2A878] hover:shadow-md cursor-pointer"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#6B1E2D]/10 text-2xl">
                    {icon}
                  </div>
                  <p className="font-semibold text-[#2C1A17]">{name}</p>
                  <p className="mt-1 text-sm text-[#6A5F58]">Peças selecionadas</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured parts */}
        <section id="catalogo" className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#7C6540]">Destaques</p>
              <h3 className="mt-1 font-serif text-3xl font-semibold text-[#2C1A17]">
                Peças em evidência
              </h3>
            </div>
            <p className="max-w-md text-sm text-[#6A5F58]">
              Peças usadas com visual limpo, preço destacado e sensação de catálogo premium.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featuredParts.map((part) => (
              <article
                key={part.name}
                className="overflow-hidden rounded-[24px] border border-[#D8CFC2] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-44 items-center justify-center bg-[#F4E9D8]">
                  <div className="h-24 w-24 rounded-full border-4 border-[#C2A878] bg-[#6B1E2D]/10" />
                </div>
                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#7C6540]">{part.category}</p>
                      <h4 className="mt-1 text-lg font-semibold text-[#2C1A17]">{part.name}</h4>
                    </div>
                    <span className="rounded-full bg-[#F4E9D8] px-3 py-1 text-xs font-medium text-[#6B1E2D] whitespace-nowrap">
                      {part.condition}
                    </span>
                  </div>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-2xl font-bold text-[#6B1E2D]">{part.price}</p>
                    <p className="text-sm text-[#6A5F58]">Usada</p>
                  </div>
                  <button className="w-full rounded-xl bg-[#2C1A17] px-4 py-3 text-sm font-semibold text-[#F4E9D8] transition hover:bg-[#6B1E2D]">
                    Ver detalhes
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-6 pb-14 pt-4">
          <div className="rounded-[30px] bg-[#6B1E2D] px-8 py-10 text-white shadow-xl">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#E6D4B3]">
                  Pronto para começar?
                </p>
                <h3 className="mt-2 font-serif text-3xl font-bold md:text-4xl">
                  Cadastre-se e anuncie suas peças para clientes que entendem do assunto.
                </h3>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#F3E7E0] md:text-base">
                  Crie sua conta gratuitamente e tenha acesso a todas as funcionalidades do catálogo BigPeças.
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Link
                  to="/cadastro"
                  className="rounded-2xl bg-[#C2A878] px-6 py-3 text-sm font-semibold text-[#2C1A17] transition hover:opacity-90 no-underline whitespace-nowrap"
                >
                  Criar conta grátis
                </Link>
                <Link
                  to="/login"
                  className="rounded-2xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 no-underline whitespace-nowrap"
                >
                  Já tenho conta
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#D8CFC2] bg-[#F4E9D8] px-6 py-8">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#6A5F58]">Retro Garage</p>
            <span className="font-serif text-xl font-bold text-[#6B1E2D]">BigPeças</span>
          </div>
          <p className="text-sm text-[#6A5F58]">© 2025 BigPeças. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
