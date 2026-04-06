import { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import HeroBanner from '../components/HeroBanner';
import FeaturedProducts from '../components/FeaturedProducts';
import ProductCard from '../components/ProductCard';
import { products } from '../data/mockData';

const CREAM = '#F5EDD8';
const SPACING = {
  LG: '1.5rem',
  XXL: '2.5rem',
};

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNav, setActiveNav] = useState('catalog');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: CREAM }}>
          <HeroBanner />
          <FeaturedProducts items={products} />
          <div
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
          </div>
        </main>
      </div>
    </div>
  );
}

