/**
 * Home.jsx
 *
 * Página principal da aplicação.
 *
 * Responsável por compor os componentes da tela inicial:
 * - Header
 * - HeroBanner
 * - Produtos em destaque
 * - (futuramente) outras seções como FAQ
 */
import Header from "../components/Header";
import HeroBanner from "../components/HeroBanner";
import FeaturedProducts from "../components/FeaturedProducts";
import { products } from "../data/mockData";

export default function Home() {
  return (
    <main className="flex-1 bg-[#ece5d3] text-[#6e1a2b] overflow-hidden">
      <Header />
      <HeroBanner />
      <FeaturedProducts items={products} />
      <FAQPage />
    </main>
  );
}