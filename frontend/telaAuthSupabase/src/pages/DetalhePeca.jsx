import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { buscarPecaPorId, listarCategorias, listarMateriais } from '../services/pecasService';
import { buscarUsuarioPorId } from '../services/usuarioService';
import {
  BORDER_RADIUS,
  BUTTON_PRIMARY_STYLE,
  BUTTON_SECONDARY_STYLE,
  COLORS,
  SHADOWS,
  SPACING,
} from '../styles/theme';
import { parseUnexpectedError } from '../utils/friendlyErrors';

function formatarPreco(valor) {
  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return valor ? `R$ ${valor}` : 'Preco nao informado';
  }

  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatarData(valor) {
  if (!valor) return 'Nao informada';

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return 'Nao informada';

  return data.toLocaleDateString('pt-BR');
}

function buscarNome(lista, id, fallback) {
  const item = lista.find((opcao) => String(opcao.id) === String(id));
  return item?.nome || fallback;
}

function InfoItem({ label, value }) {
  return (
    <div
      style={{
        padding: SPACING.MD,
        backgroundColor: '#FAF4E8',
        borderRadius: BORDER_RADIUS.MD,
        border: '1px solid #EAD8BE',
      }}
    >
      <div
        style={{
          color: '#8A6B58',
          fontSize: '0.78rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          marginBottom: '0.3rem',
        }}
      >
        {label}
      </div>
      <div style={{ color: COLORS.DARK_TEXT, fontWeight: 700, lineHeight: 1.4 }}>
        {value || 'Nao informado'}
      </div>
    </div>
  );
}

function TextSection({ title, children }) {
  return (
    <section
      style={{
        backgroundColor: '#fff',
        borderRadius: BORDER_RADIUS.LG,
        boxShadow: SHADOWS.SM,
        border: '1px solid rgba(123, 29, 46, 0.12)',
        padding: SPACING.XL,
      }}
    >
      <h2
        style={{
          color: COLORS.BORDEAUX,
          fontSize: '1.1rem',
          margin: `0 0 ${SPACING.SM}`,
        }}
      >
        {title}
      </h2>
      <p style={{ margin: 0, color: '#6A5F58', lineHeight: 1.7 }}>
        {children || 'Nao informado'}
      </p>
    </section>
  );
}

function VendedorSection({ nome, fornecedorId, loading, error, onClick, notice }) {
  const textoNome = loading ? 'Carregando...' : error || nome || 'Vendedor nao informado';

  return (
    <section
      style={{
        backgroundColor: '#fff',
        borderRadius: BORDER_RADIUS.LG,
        boxShadow: SHADOWS.SM,
        border: '1px solid rgba(123, 29, 46, 0.12)',
        padding: SPACING.XL,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: SPACING.LG,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2
            style={{
              color: COLORS.BORDEAUX,
              fontSize: '1.1rem',
              margin: `0 0 ${SPACING.SM}`,
            }}
          >
            Vendedor
          </h2>
          <p style={{ margin: 0, color: '#6A5F58', lineHeight: 1.6 }}>
            {textoNome}
          </p>
        </div>

        <button
          type="button"
          onClick={onClick}
          disabled={!fornecedorId || loading}
          style={{
            ...BUTTON_SECONDARY_STYLE,
            opacity: !fornecedorId || loading ? 0.65 : 1,
            cursor: !fornecedorId || loading ? 'not-allowed' : 'pointer',
          }}
        >
          Ver vendedor
        </button>
      </div>

      <div
        style={{
          marginTop: SPACING.LG,
          paddingTop: SPACING.LG,
          borderTop: '1px solid #F0E1C8',
          display: 'flex',
          justifyContent: 'space-between',
          gap: SPACING.MD,
          flexWrap: 'wrap',
          color: '#8A6B58',
          fontSize: '0.9rem',
          fontWeight: 700,
        }}
      >
        <span>Avaliacao do vendedor</span>
        <span>Em breve</span>
      </div>

      {notice && (
        <div
          style={{
            marginTop: SPACING.MD,
            color: COLORS.BORDEAUX,
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          {notice}
        </div>
      )}
    </section>
  );
}

export default function DetalhePeca() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [peca, setPeca] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [fornecedor, setFornecedor] = useState(null);
  const [loadingFornecedor, setLoadingFornecedor] = useState(false);
  const [fornecedorError, setFornecedorError] = useState('');
  const [fornecedorNotice, setFornecedorNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function carregarDetalhes() {
      setLoading(true);
      setErrorMessage('');

      try {
        const [pecaData, categoriasData, materiaisData] = await Promise.all([
          buscarPecaPorId(id),
          listarCategorias(),
          listarMateriais(),
        ]);

        setPeca(pecaData);
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
        setMateriais(Array.isArray(materiaisData) ? materiaisData : []);
      } catch (error) {
        setErrorMessage(parseUnexpectedError(error, 'Nao foi possivel carregar os detalhes da peca.'));
      } finally {
        setLoading(false);
      }
    }

    carregarDetalhes();
  }, [id]);

  useEffect(() => {
    async function carregarFornecedor() {
      if (!peca?.fornecedor_id) {
        setFornecedor(null);
        setFornecedorError('');
        setFornecedorNotice('');
        return;
      }

      setLoadingFornecedor(true);
      setFornecedorError('');
      setFornecedorNotice('');

      try {
        const usuario = await buscarUsuarioPorId(peca.fornecedor_id);
        setFornecedor(usuario?.profile || usuario);
      } catch (error) {
        setFornecedor(null);
        setFornecedorError(parseUnexpectedError(error, 'Nao foi possivel carregar o dono da peca.'));
      } finally {
        setLoadingFornecedor(false);
      }
    }

    carregarFornecedor();
  }, [peca?.fornecedor_id]);

  const categoriaNome = useMemo(() => {
    if (peca?.categoria?.nome) return peca.categoria.nome;
    return buscarNome(categorias, peca?.categoria_id, 'Categoria nao informada');
  }, [categorias, peca]);

  const materialNome = useMemo(() => {
    if (peca?.material?.nome) return peca.material.nome;
    return buscarNome(materiais, peca?.material_id, 'Material nao informado');
  }, [materiais, peca]);

  const nomeFornecedor = useMemo(() => {
    return fornecedor?.full_name || fornecedor?.nome || fornecedor?.nome_loja || fornecedor?.email || '';
  }, [fornecedor]);

  function handleFornecedorClick() {
    if (!peca?.fornecedor_id) return;
    setFornecedorNotice('Perfil publico e avaliacoes do vendedor serao exibidos aqui em breve.');
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.CREAM }}>
      <style>{`
        @media (max-width: 860px) {
          .detalhe-peca-hero {
            grid-template-columns: 1fr !important;
          }

          .detalhe-peca-info-grid {
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
            <button
              type="button"
              onClick={() => navigate('/buscaPecas')}
              style={BUTTON_SECONDARY_STYLE}
            >
              Voltar para busca
            </button>
          </div>

          {loading && (
            <div style={{ color: COLORS.BORDEAUX, fontWeight: 700 }}>
              Carregando detalhes da peca...
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

          {!loading && !errorMessage && peca && (
            <>
              <section
                className="detalhe-peca-hero"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(300px, 0.85fr) minmax(320px, 1.15fr)',
                  gap: SPACING.XL,
                  alignItems: 'stretch',
                }}
              >
                <div
                  style={{
                    minHeight: 360,
                    backgroundColor: '#EFE2C6',
                    borderRadius: BORDER_RADIUS.LG,
                    overflow: 'hidden',
                    border: '1px solid rgba(123, 29, 46, 0.12)',
                    boxShadow: SHADOWS.SM,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {peca.imagem ? (
                    <img
                      src={peca.imagem}
                      alt={peca.nome_peca || 'Imagem da peca'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        color: COLORS.BORDEAUX,
                        fontWeight: 800,
                        textAlign: 'center',
                        padding: SPACING.XL,
                      }}
                    >
                      Sem imagem cadastrada
                    </div>
                  )}
                </div>

                <div
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: BORDER_RADIUS.LG,
                    boxShadow: SHADOWS.SM,
                    border: '1px solid rgba(123, 29, 46, 0.12)',
                    padding: SPACING.XL,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: SPACING.LG,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: SPACING.MD,
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                      }}
                    >
                      <h1
                        style={{
                          color: COLORS.BORDEAUX,
                          fontFamily: "'Georgia', serif",
                          fontSize: '2rem',
                          lineHeight: 1.15,
                          margin: 0,
                        }}
                      >
                        {peca.nome_peca || 'Peca sem nome'}
                      </h1>

                      <span
                        style={{
                          backgroundColor: '#F8E9C5',
                          color: COLORS.BORDEAUX,
                          borderRadius: BORDER_RADIUS.FULL,
                          padding: '0.35rem 0.8rem',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {peca.condicao || 'N/I'}
                      </span>
                    </div>

                    <p style={{ margin: `${SPACING.SM} 0 0`, color: '#7A5C4B' }}>
                      {categoriaNome} / {materialNome}
                    </p>
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid #F0E1C8',
                      borderBottom: '1px solid #F0E1C8',
                      padding: `${SPACING.LG} 0`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: SPACING.LG,
                      flexWrap: 'wrap',
                    }}
                  >
                    <strong style={{ color: COLORS.BORDEAUX, fontSize: '1.7rem' }}>
                      {formatarPreco(peca.preco)}
                    </strong>

                    <span
                      style={{
                        color: Number(peca.estoque_atual) > 0 ? COLORS.SUCCESS_DARK : '#991B1B',
                        backgroundColor: Number(peca.estoque_atual) > 0 ? COLORS.SUCCESS : COLORS.ERROR,
                        borderRadius: BORDER_RADIUS.FULL,
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                      }}
                    >
                      Estoque: {peca.estoque_atual ?? 0}
                    </span>
                  </div>

                  <div
                    className="detalhe-peca-info-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: SPACING.MD,
                    }}
                  >
                    <InfoItem label="SKU" value={peca.sku} />
                    <InfoItem label="OEM" value={peca.oem_number} />
                    <InfoItem label="Numero de serie" value={peca.num_serie} />
                    <InfoItem label="Cadastro" value={formatarData(peca.data_cadastro || peca.created_at)} />
                  </div>

                  <button
                    type="button"
                    style={{ ...BUTTON_PRIMARY_STYLE, alignSelf: 'flex-start' }}
                  >
                    Adicionar ao carrinho
                  </button>
                </div>
              </section>

              <VendedorSection
                nome={nomeFornecedor}
                fornecedorId={peca.fornecedor_id}
                loading={loadingFornecedor}
                error={fornecedorError}
                onClick={handleFornecedorClick}
                notice={fornecedorNotice}
              />

              <section
                className="detalhe-peca-info-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: SPACING.MD,
                }}
              >
                <InfoItem label="Peso" value={peca.peso_gramas ? `${peca.peso_gramas} g` : ''} />
                <InfoItem label="Comprimento" value={peca.comprimento_mm ? `${peca.comprimento_mm} mm` : ''} />
                <InfoItem label="Largura" value={peca.largura_mm ? `${peca.largura_mm} mm` : ''} />
                <InfoItem label="Altura" value={peca.altura_mm ? `${peca.altura_mm} mm` : ''} />
              </section>

              <TextSection title="Detalhes de gravacao">
                {peca.detalhes_gravacao}
              </TextSection>

              <TextSection title="Historico de procedencia">
                {peca.historico_proveniencia}
              </TextSection>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
