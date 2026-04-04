/**
 * HeroBanner.jsx
 *
 * Componente de destaque da página inicial.
 *
 * Apresenta a proposta principal do sistema (BIGPEÇAS),
 * com imagem de fundo, título, descrição e chamada para ação.
 */
import bannerImg from "../assets/banner.png";

export default function HeroBanner() {
  return (
    <section className="relative h-[320px] sm:h-[380px] lg:h-[440px] overflow-hidden">
      <img
        src={bannerImg}
        alt="Carro clássico"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-[rgba(123,16,36,0.45)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(123,16,36,0.60)] via-[rgba(123,16,36,0.28)] to-[rgba(236,229,211,0.12)]" />

      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-[760px] px-5 sm:px-8 lg:px-12">
          <h1 className="text-[30px] sm:text-[38px] lg:text-[58px] leading-[1.05] font-semibold text-white max-w-[640px]">
            Peças Originais para Clássicos
          </h1>

          <p className="mt-4 sm:mt-5 lg:mt-6 max-w-[650px] text-[15px] sm:text-[18px] lg:text-[20px] leading-relaxed text-[#fff3f1]">
            Encontre as melhores peças para restaurar o seu automóvel vintage com
            qualidade e procedência garantida.
          </p>

          <button className="mt-6 lg:mt-8 rounded-full bg-[#e6b956] px-5 py-3 sm:px-6 sm:py-3.5 lg:px-8 lg:py-4 text-[#73152b] text-[15px] sm:text-[16px] lg:text-[18px] font-semibold shadow-lg hover:brightness-105 transition">
            Ver Catálogo Completo
          </button>
        </div>
      </div>
    </section>
  );
}