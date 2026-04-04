/**
 * ProductCard.jsx
 *
 * Componente que representa um produto individual.
 *
 * Exibe informações como:
 * - Nome
 * - Ano
 * - Preço
 * - Categoria/tag (ex: Destaque, Novo, Raro)
 *
 * Pode futuramente incluir ações como:
 * - Ver detalhes
 * - Adicionar ao carrinho
 */
export default function ProductCard({ product }) {
  return (
    <article className="h-full overflow-hidden rounded-[24px] lg:rounded-[28px] bg-white shadow-[0_10px_30px_rgba(87,21,37,0.12)]">
      <div className="relative h-[200px] sm:h-[220px]">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover"
        />

        <span className="absolute left-3 top-3 lg:left-4 lg:top-4 rounded-full bg-[#8f1230] px-3 py-1.5 lg:px-4 lg:py-2 text-[13px] lg:text-[15px] font-semibold text-[#f1c75f] shadow-lg">
          {product.tag}
        </span>
      </div>

      <div className="p-5 lg:p-6">
        <h3 className="text-[18px] sm:text-[20px] lg:text-[22px] font-medium text-[#5e1425] leading-snug min-h-[48px] lg:min-h-[56px]">
          {product.name}
        </h3>

        <div className="mt-5 lg:mt-6 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[20px] lg:text-[22px] font-semibold text-[#8f1230]">
            {product.price}
          </div>

          <button className="rounded-full bg-[#8f1230] px-4 py-2.5 lg:px-5 lg:py-3 text-[14px] lg:text-[16px] font-medium text-[#f1c75f] hover:brightness-110 transition">
            Adicionar
          </button>
        </div>
      </div>
    </article>
  );
}