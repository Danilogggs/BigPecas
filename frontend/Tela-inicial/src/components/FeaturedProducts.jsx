/**
 * FeaturedProducts.jsx
 *
 * Componente responsável por exibir a seção de produtos em destaque.
 *
 * Recebe uma lista de produtos e renderiza múltiplos ProductCard.
 */
import ProductCard from "./ProductCard";

function SectionHeader() {
  return (
    <div className="flex items-start justify-between gap-4 lg:gap-6 flex-wrap">
      <div>
        <h2 className="text-[28px] sm:text-[32px] md:text-[38px] lg:text-[42px] font-semibold text-[#7b1024]">
          Peças em Destaque
        </h2>

        <p className="mt-2 text-[#b08f72] text-[15px] sm:text-[16px] lg:text-[18px]">
          Seleção especial para restauradores exigentes
        </p>
      </div>

      <button className="rounded-full border border-[#a35d69] px-5 py-3 sm:px-6 sm:py-3.5 lg:px-8 lg:py-4 text-[15px] sm:text-[16px] lg:text-[18px] font-medium text-[#7b1024] hover:bg-white/50 transition">
        Ver todos ›
      </button>
    </div>
  );
}

export default function FeaturedProducts({ items }) {
  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
      <SectionHeader />

      <div className="mt-6 lg:mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
        {items.map((product) => (
          <ProductCard key={product.name} product={product} />
        ))}
      </div>
    </section>
  );
}