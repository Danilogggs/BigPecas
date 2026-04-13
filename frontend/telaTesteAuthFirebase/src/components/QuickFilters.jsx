import { useNavigate } from 'react-router-dom';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  BORDER_RADIUS,
  SHADOWS,
} from '../styles/theme';

export default function QuickFilters() {
  const navigate = useNavigate();

  // 🔥 CATEGORIAS (botões grandes)
  const categorias = [
    { id: 1, nome: 'Motor', icon: '⚙️' },
    { id: 2, nome: 'Lataria', icon: '🚗' },
    { id: 3, nome: 'Elétrica', icon: '🔌' },
    { id: 4, nome: 'Interior', icon: '🪑' },
    { id: 5, nome: 'Suspensão', icon: '🛞' },
    { id: 6, nome: 'Freios', icon: '🛑' },
  ];

  // ⚡ FILTROS RÁPIDOS (menores)
  const quickFilters = [
    { label: '🔥 Mais baratos', extra: '&ordem=asc&sort=preco' },
    { label: '💰 Mais caros', extra: '&ordem=desc&sort=preco' },
    { label: '🚀 Recentes', extra: '&sort=data_cadastro' },
    { label: 'Até R$500', extra: '&max_preco=500' },
    { label: 'Peças raras', query: 'raro' },
  ];

  // 🔗 Navegação inteligente
  const buildUrl = ({ categoria_id, query, extra }) => {
    let url = '/buscapecas';
    const params = new URLSearchParams();

    if (categoria_id) params.append('categoria_id', categoria_id);
    if (query) params.append('nome', query);

    if (extra) {
      extra.replace('&', '').split('&').forEach((p) => {
        const [k, v] = p.split('=');
        params.append(k, v);
      });
    }

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    return url;
  };

  return (
    <div style={{ padding: SPACING.XXL }}>

      {/* 🔥 CATEGORIAS GRANDES */}
      <h2 style={{ ...TYPOGRAPHY.H2, color: COLORS.DARK_TEXT, color: COLORS.BORDEAUX, fontFamily: "'Georgia', serif", }}>
        Explore por categoria
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: SPACING.LG,
          marginTop: SPACING.LG,
        }}
      >
        {categorias.map((cat) => (
          <div
            key={cat.id}
            onClick={() =>
              navigate(buildUrl({ categoria_id: cat.id }))
            }
            style={{
              padding: SPACING.XL,
              borderRadius: BORDER_RADIUS.LG,
              backgroundColor: '#fff',
              border: `2px solid ${COLORS.BORDEAUX}22`,
              boxShadow: SHADOWS.SM,
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = SHADOWS.MD;
              e.currentTarget.style.borderColor = COLORS.BORDEAUX;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = SHADOWS.SM;
              e.currentTarget.style.borderColor = `${COLORS.BORDEAUX}22`;
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: SPACING.SM }}>
              {cat.icon}
            </div>

            <p
              style={{
                ...TYPOGRAPHY.LABEL,
                color: COLORS.DARK_TEXT,
                fontSize: '1rem',
              }}
            >
              {cat.nome}
            </p>
          </div>
        ))}
      </div>

    
    </div>
  );
}