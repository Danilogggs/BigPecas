import Money from '../components/Money';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { buscarPerfilFornecedor } from '../services/pecasService';
import { buscarAvaliacoesFornecedor } from '../services/avaliacoesService';
import {
  BORDER_RADIUS,
  BUTTON_PRIMARY_STYLE,
  BUTTON_SECONDARY_STYLE,
  COLORS,
  SHADOWS,
  SPACING,
} from '../styles/theme';
import { parseUnexpectedError } from '../utils/friendlyErrors';
import { useLanguage } from '../contexts/LanguageContext';

function formatarPreco(valor) {
  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return valor ? `R$ ${valor}` : 'Preço não informado';
  }

  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function InfoCard({ label, value }) {
  return (
    <div
      style={{
        backgroundColor: '#FAF4E8',
        border: '1px solid #EAD8BE',
        borderRadius: BORDER_RADIUS.MD,
        padding: SPACING.MD,
      }}
    >
      <div
        style={{
          color: 'var(--bp-text-muted)',
          fontSize: '0.78rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <strong style={{ color: COLORS.DARK_TEXT, fontSize: '1.05rem' }}>
        {value}
      </strong>
    </div>
  );
}

function PecaCard({ peca, onClick }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        backgroundColor: '#FAF4E8',
        border: '1px solid #EAD8BE',
        borderRadius: BORDER_RADIUS.MD,
        padding: SPACING.MD,
        cursor: 'pointer',
      }}
    >
      {peca.imagem ? (
        <img
          src={peca.imagem}
          alt={peca.nome_peca || t('partImage')}
          style={{
            width: '100%',
            height: 140,
            objectFit: 'cover',
            borderRadius: BORDER_RADIUS.MD,
            marginBottom: SPACING.SM,
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: 140,
            borderRadius: BORDER_RADIUS.MD,
            marginBottom: SPACING.SM,
            backgroundColor: '#EFE2C6',
            color: COLORS.BORDEAUX,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          {t('Sem imagem')}
        </div>
      )}

      <strong style={{ color: COLORS.DARK_TEXT, display: 'block', marginBottom: 6 }}>
        {peca.nome_peca || t('Peça sem nome')}
      </strong>

      <span style={{ color: COLORS.BORDEAUX, fontWeight: 800 }}>
        <Money value={peca.preco_base ?? peca.preco} currency={peca.moeda_base || "BRL"} />
      </span>

      <div style={{ marginTop: 8, color: 'var(--bp-text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>
        {t('Estoque: {value}', { value: peca.estoque_atual ?? 0 })}
      </div>
    </button>
  );
}

export default function FornecedorPerfil() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [fornecedor, setFornecedor] = useState(null);
  const [pecas, setPecas] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [resumoAvaliacoes, setResumoAvaliacoes] = useState({ total: 0, media: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function carregarPerfil() {
      setLoading(true);
      setErrorMessage('');

      try {
        const [data, dadosAvaliacoes] = await Promise.all([
          buscarPerfilFornecedor(id),
          buscarAvaliacoesFornecedor(id).catch(() => null),
        ]);
        setFornecedor(data?.fornecedor || null);
        setPecas(Array.isArray(data?.pecas) ? data.pecas : []);
        setAvaliacoes(Array.isArray(dadosAvaliacoes?.avaliacoes) ? dadosAvaliacoes.avaliacoes : []);
        setResumoAvaliacoes(dadosAvaliacoes?.resumo || { total: 0, media: 0 });
      } catch (error) {
        setFornecedor(null);
        setPecas([]);
        setAvaliacoes([]);
        setResumoAvaliacoes({ total: 0, media: 0 });
        setErrorMessage(parseUnexpectedError(error, t('sellerProfileLoadFailed')));
      } finally {
        setLoading(false);
      }
    }

    carregarPerfil();
  }, [id]);

  const nomeExibicao = useMemo(() => {
    return fornecedor?.nome_loja || fornecedor?.full_name || fornecedor?.email || 'Vendedor BigPeças';
  }, [fornecedor]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.CREAM }}>
      <style>{`
        @media (max-width: 860px) {
          .perfil-vendedor-hero {
            grid-template-columns: 1fr !important;
          }

          .perfil-vendedor-stats {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <Header />

      <main style={{ padding: SPACING.XL }}>
        <div
          style={{
            maxWidth: 1160,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.LG,
          }}
        >
          <div style={{ display: 'flex', gap: SPACING.SM, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => navigate(-1)} style={BUTTON_SECONDARY_STYLE}>
              {t('Voltar')}
            </button>
            <button type="button" onClick={() => navigate('/buscaPecas')} style={BUTTON_SECONDARY_STYLE}>
              {t('Ver catálogo')}
            </button>
            <button type="button" onClick={() => navigate(`/chat/${id}`)} style={BUTTON_PRIMARY_STYLE}>
              {t('Abrir chat')}
            </button>
          </div>

          {loading && (
            <div style={{ color: COLORS.BORDEAUX, fontWeight: 800 }}>
              {t('Carregando perfil do vendedor...')}
            </div>
          )}

          {errorMessage && (
            <div
              style={{
                backgroundColor: COLORS.ERROR,
                color: COLORS.ERROR_DARK,
                padding: SPACING.MD,
                borderRadius: BORDER_RADIUS.MD,
                border: `2px solid ${COLORS.ERROR_BORDER}`,
              }}
            >
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && fornecedor && (
            <>
              <section
                className="perfil-vendedor-hero"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 0.8fr',
                  gap: SPACING.LG,
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--bp-surface)',
                    borderRadius: BORDER_RADIUS.LG,
                    boxShadow: SHADOWS.SM,
                    border: '1px solid rgba(123, 29, 46, 0.12)',
                    padding: SPACING.XL,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      backgroundColor: '#F8E9C5',
                      color: COLORS.BORDEAUX,
                      borderRadius: BORDER_RADIUS.FULL,
                      padding: '0.35rem 0.8rem',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      marginBottom: SPACING.MD,
                    }}
                  >
                    {t('Vendedor recomendado')}
                  </span>

                  <h1
                    style={{
                      color: COLORS.BORDEAUX,
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: '2.2rem',
                      lineHeight: 1.15,
                      margin: 0,
                    }}
                  >
                    {nomeExibicao}
                  </h1>

                  <p style={{ color: 'var(--bp-text-muted)', lineHeight: 1.7, marginTop: SPACING.MD }}>
                    {fornecedor.descricao_loja ||
                      t('Este vendedor ainda não adicionou uma descrição pública para a loja.')}
                  </p>

                  <div style={{ display: 'flex', gap: SPACING.SM, flexWrap: 'wrap', marginTop: SPACING.LG }}>
                    {fornecedor.email && (
                      <span style={{ color: 'var(--bp-text-muted)', fontWeight: 700 }}>
                        Email: {fornecedor.email}
                      </span>
                    )}
                    {fornecedor.telefone && (
                      <span style={{ color: 'var(--bp-text-muted)', fontWeight: 700 }}>
                        Telefone: {fornecedor.telefone}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="perfil-vendedor-stats"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: SPACING.MD,
                  }}
                >
                  <InfoCard label={t('Peças cadastradas')} value={fornecedor.total_pecas ?? 0} />
                  <InfoCard label={t('Peças com estoque')} value={fornecedor.pecas_com_estoque ?? 0} />
                  <InfoCard label={t('Pontuação')} value={`${fornecedor.score_recomendacao ?? 0} pts`} />
                </div>
              </section>

              <section
                style={{
                  backgroundColor: 'var(--bp-surface)',
                  borderRadius: BORDER_RADIUS.LG,
                  boxShadow: SHADOWS.SM,
                  border: '1px solid rgba(123, 29, 46, 0.12)',
                  padding: SPACING.XL,
                }}
              >
                <h2
                  style={{
                    color: COLORS.BORDEAUX,
                    fontSize: '1.2rem',
                    margin: `0 0 ${SPACING.SM}`,
                  }}
                >
                  {t('Peças deste vendedor')}
                </h2>

                <p style={{ marginTop: 0, marginBottom: SPACING.LG, color: 'var(--bp-text-muted)', lineHeight: 1.6 }}>
                  {t('Catálogo de peças cadastradas por este fornecedor no BigPeças.')}
                </p>

                {pecas.length === 0 ? (
                  <div style={{ color: 'var(--bp-text-muted)', fontWeight: 700 }}>
                    {t('Este vendedor ainda não possui peças cadastradas.')}
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                      gap: SPACING.LG,
                    }}
                  >
                    {pecas.map((peca) => (
                      <PecaCard
                        key={peca.id}
                        peca={peca}
                        onClick={() => navigate(`/pecas/${peca.id}`)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section
                style={{
                  backgroundColor: 'var(--bp-surface)',
                  borderRadius: BORDER_RADIUS.LG,
                  boxShadow: SHADOWS.SM,
                  border: '1px solid rgba(123, 29, 46, 0.12)',
                  padding: SPACING.XL,
                }}
              >
                <h2 style={{ color: COLORS.BORDEAUX, fontSize: '1.1rem', margin: `0 0 ${SPACING.SM}` }}>
                  {t('Avaliações do vendedor')}
                </h2>
                {resumoAvaliacoes.total > 0 ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: SPACING.LG }}>
                      <strong style={{ color: '#C69216', fontSize: '1.35rem' }}>
                        ★ {Number(resumoAvaliacoes.media).toFixed(1)}
                      </strong>
                      <span style={{ color: 'var(--bp-text-muted)' }}>
                        {resumoAvaliacoes.total} {resumoAvaliacoes.total === 1 ? 'avaliação verificada' : 'avaliações verificadas'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gap: SPACING.SM }}>
                      {avaliacoes.map((avaliacao) => (
                        <article
                          key={avaliacao.id}
                          style={{ padding: SPACING.MD, border: '1px solid #EAD8BE', borderRadius: BORDER_RADIUS.MD, background: '#FAF4E8' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <strong style={{ color: '#C69216' }}>
                              {'★'.repeat(avaliacao.nota)}{'☆'.repeat(5 - avaliacao.nota)}
                            </strong>
                            <span style={{ color: '#21734A', fontSize: '0.78rem', fontWeight: 800 }}>
                              {t('Compra verificada')}
                            </span>
                          </div>
                          {avaliacao.comentario && (
                            <p style={{ margin: `${SPACING.SM} 0 0`, color: 'var(--bp-text-muted)', lineHeight: 1.6 }}>
                              {avaliacao.comentario}
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={{ margin: 0, color: 'var(--bp-text-muted)', lineHeight: 1.7 }}>
                    Este vendedor ainda não recebeu avaliações de compras entregues.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
