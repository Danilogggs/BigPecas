/**
 * App.jsx
 *
 * Componente raiz da aplicação.
 *
 * Responsável por estruturar o layout geral e
 * configurar a navegação (rotas) entre páginas.
 *
 * Também integra componentes globais como Sidebar.
 */
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import HeroBanner from "./components/HeroBanner";
import FeaturedProducts from "./components/FeaturedProducts";
import { menuItems, products } from "./data/mockData";

export default function App() {
  return (
    <div className="min-h-screen bg-[#5d0f20] text-white font-sans">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar items={menuItems} />

        <main className="flex-1 bg-[#ece5d3] text-[#6e1a2b] overflow-x-hidden">
          <Header />
          <HeroBanner />
          <FeaturedProducts items={products} />
        </main>
      </div>
    </div>
  );
}