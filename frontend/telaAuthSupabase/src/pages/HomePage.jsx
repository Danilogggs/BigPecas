import { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import HeroBanner from '../components/HeroBanner';
import FeaturedProducts from '../components/FeaturedProducts';
import ProductCard from '../components/ProductCard';
import BenefitsSection from '../components/BenefitsSection';
import HowItWorks from '../components/HowItWorks';
import Testimonials from '../components/Testimonials';
import FinalCTA from '../components/FinalCTA';
import Footer from '../components/Footer';
import QuickFilters from '../components/QuickFilters';
import { products } from '../data/mockData';

const CREAM = '#F5EDD8';
const BORDEAUX = '#7B1D2E';
const DARK_TEXT = '#2C1A17';
const SPACING = {
  MD: '1rem',
  LG: '1.5rem',
  XL: '2rem',
  XXL: '2.5rem',
};

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNav, setActiveNav] = useState('catalog');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: CREAM }}>
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />

        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'linear-gradient(180deg, #F5EDD8 0%, #FFF8EA 45%, #F5EDD8 100%)',
          }}
        >
          <HeroBanner />

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: SPACING.LG,
              padding: `${SPACING.XL} ${SPACING.XXL} 0`,
            }}
          >
            {[
              ['Catálogo organizado', 'Peças cadastradas com filtros rápidos'],
              ['Busca prática', 'Pesquise por nome, categoria e preço'],
              ['Vendedores ativos', 'Anuncie e edite suas próprias peças'],
            ].map(([title, desc]) => (
              <div
                key={title}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid rgba(123, 29, 46, 0.12)',
                  borderRadius: '1rem',
                  padding: SPACING.LG,
                  boxShadow: '0 14px 35px rgba(123, 29, 46, 0.08)',
                }}
              >
                <strong style={{ display: 'block', color: BORDEAUX, marginBottom: '0.35rem' }}>{title}</strong>
                <span style={{ color: DARK_TEXT, fontSize: '0.9rem', lineHeight: 1.5 }}>{desc}</span>
              </div>
            ))}
          </section>

          <FeaturedProducts items={products} />

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: SPACING.LG,
              paddingLeft: SPACING.XXL,
              paddingRight: SPACING.XXL,
              paddingBottom: SPACING.XXL,
            }}
          >
            {products.map((item) => (
              <ProductCard key={item.name} product={item} />
            ))}
          </section>

          <QuickFilters />
          <BenefitsSection />
          <HowItWorks />
          <Testimonials />
          <FinalCTA />
        </main>
      </div>

      <Footer />
    </div>
  );
}
