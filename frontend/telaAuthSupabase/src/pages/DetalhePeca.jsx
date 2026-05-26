import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../contexts/CartContext';
import {
  adicionarPecaWish,
  buscarFornecedoresRecomendados,
  buscarPecaPorId,
  buscarRecomendacoesPorPeca,
  buscarStatusWish,
  listarCategorias,
  listarMateriais,
  removerPecaWish,
} from '../services/pecasService';
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
  const { addToCart, removeFromCart, cartItems } = useCart();

  const [peca, setPeca] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [fornecedor, setFornecedor] = useState(null);
  const [loadingFornecedor, setLoadingFornecedor] = useState(false);
  const [fornecedorError, setFornecedorError] = useState('');
  const [fornecedorNotice, setFornecedorNotice] = useState('');
  const [recomendacoes, setRecomendacoes] = useState([]);
  const [loadingRecomendacoes, setLoadingRecomendacoes] = useState(false);
  const [fornecedoresRecomendados, setFornecedoresRecomendados] = useState([]);
  const [loadingFornecedoresRecomendados, setLoadingFornecedoresRecomendados] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [salvoNaWish, setSalvoNaWish] = useState(false);
  const [loadingWish, setLoadingWish] = useState(false);
  const [wishMessage, setWishMessage] = useState('');
  const [carrinhoMessage, setCarrinhoMessage] = useState('');
  const [itemNoCarrinho, setItemNoCarrinho] = useState(false);

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
    async function carregarStatusWish() {
      if (!peca?.id) {
        setSalvoNaWish(false);
        return;
      }

      try {
        const status = await buscarStatusWish(peca.id);
        setSalvoNaWish(Boolean(status?.in_wish));
      } catch (error) {
        console.error('Erro ao carregar status da lista de desejos:', error);
      }
    }

    carregarStatusWish();
  }, [peca?.id]);

  useEffect(() => {
    async function carregarRecomendacoes() {
      if (!id) return;

      setLoadingRecomendacoes(true);

      try {
        const data = await buscarRecomendacoesPorPeca(id, 4);
        setRecomendacoes(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erro ao carregar recomendações:', error);
        setRecomendacoes([]);
      } finally {
        setLoadingRecomendacoes(false);
      }
    }

    carregarRecomendacoes();
  }, [id]);

  useEffect(() => {
    async function carregarFornecedoresRecomendados() {
      setLoadingFornecedoresRecomendados(true);

      try {
        const data = await buscarFornecedoresRecomendados(4);
        setFornecedoresRecomendados(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erro ao carregar fornecedores recomendados:', error);
        setFornecedoresRecomendados([]);
      } finally {
        setLoadingFornecedoresRecomendados(false);
      }
    }

    carregarFornecedoresRecomendados();
  }, []);

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

  useEffect(() => {
    // Verificar se o item já está no carrinho
    const jaNoCarrinho = cartItems.some((item) => item.id === peca?.id);
    setItemNoCarrinho(jaNoCarrinho);
  }, [peca?.id, cartItems]);

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
    navigate(`/vendedores/${peca.fornecedor_id}`);
  }

  async function handleToggleWish() {
    if (!peca?.id || loadingWish) return;

    setLoadingWish(true);
    setWishMessage('');

    try {
      if (salvoNaWish) {
        await removerPecaWish(peca.id);
        setSalvoNaWish(false);
        setWishMessage('Peça removida da sua lista de desejos.');
      } else {
        await adicionarPecaWish(peca.id);
        setSalvoNaWish(true);
        setWishMessage('Peça adicionada à sua lista de desejos.');
      }
    } catch (error) {
      setWishMessage(parseUnexpectedError(error, 'Não foi possível atualizar sua lista de desejos agora.'));
    } finally {
      setLoadingWish(false);
    }
  }

  function handleAddToCart() {
    if (!peca) return;

    if (itemNoCarrinho) {
      // Remover do carrinho
      removeFromCart(peca.id);
      setCarrinhoMessage('✓ Peça removida do carrinho!');
    } else {
      // Validar se há estoque
      if (Number(peca.estoque_atual) <= 0) {
        setCarrinhoMessage('Desculpe, este item não está em estoque no momento.');
        return;
      }

      // Preparar dados do item para o carrinho
      const itemParaCarrinho = {
        id: peca.id,
        nome: peca.nome_peca,
        descricao: peca.descricao,
        preco: peca.preco,
        imagem: peca.imagem,
        estoque: peca.estoque_atual,
        sku: peca.sku,
      };

      // Adicionar ao carrinho
      addToCart(itemParaCarrinho);
      setCarrinhoMessage('✓ Peça adicionada ao carrinho com sucesso!');
    }

    // Limpar mensagem após 3 segundos
    setTimeout(() => {
      setCarrinhoMessage('');
    }, 3000);
  }

  function RecomendacoesSection() {
    if (loadingRecomendacoes) {
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
            Peças relacionadas
          </h2>

          <p style={{ margin: 0, color: '#6A5F58', lineHeight: 1.6 }}>
            Carregando recomendações...
          </p>
        </section>
      );
    }

    if (!recomendacoes.length) {
      return null;
    }

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
          Peças relacionadas
        </h2>

        <p
          style={{
            marginTop: 0,
            marginBottom: SPACING.LG,
            color: '#6A5F58',
            lineHeight: 1.6,
          }}
        >
          Sugestões baseadas em categoria, material, condição, fornecedor e faixa de preço.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: SPACING.LG,
          }}
        >
          {recomendacoes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/pecas/${item.id}`)}
              style={{
                textAlign: 'left',
                backgroundColor: '#FAF4E8',
                border: '1px solid #EAD8BE',
                borderRadius: BORDER_RADIUS.MD,
                padding: SPACING.MD,
                cursor: 'pointer',
              }}
            >
              {item.imagem && (
                <img
                  src={item.imagem}
                  alt={item.nome_peca || 'Imagem da peça recomendada'}
                  style={{
                    width: '100%',
                    height: 120,
                    objectFit: 'cover',
                    borderRadius: BORDER_RADIUS.MD,
                    marginBottom: SPACING.SM,
                  }}
                />
              )}

              <strong
                style={{
                  color: COLORS.DARK_TEXT,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                {item.nome_peca || 'Peça sem nome'}
              </strong>

              <span style={{ color: COLORS.BORDEAUX, fontWeight: 700 }}>
                {formatarPreco(item.preco)}
              </span>

              <div
                style={{
                  marginTop: 8,
                  color: '#8A6B58',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                Compatibilidade: {item.score_recomendacao} pts
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  function FornecedoresRecomendadosSection() {
    if (loadingFornecedoresRecomendados) {
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
            Fornecedores recomendados
          </h2>
          <p style={{ margin: 0, color: '#6A5F58', lineHeight: 1.6 }}>
            Carregando fornecedores...
          </p>
        </section>
      );
    }

    if (!fornecedoresRecomendados.length) {
      return null;
    }

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
          Fornecedores recomendados
        </h2>

        <p
          style={{
            marginTop: 0,
            marginBottom: SPACING.LG,
            color: '#6A5F58',
            lineHeight: 1.6,
          }}
        >
          Sugestões baseadas em quantidade de peças cadastradas, estoque disponível e completude do perfil.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: SPACING.LG,
          }}
        >
          {fornecedoresRecomendados.map((fornecedorItem) => {
            const nome =
              fornecedorItem.nome_loja ||
              fornecedorItem.full_name ||
              fornecedorItem.email ||
              'Vendedor BigPeças';

            return (
              <button
                key={fornecedorItem.id}
                type="button"
                onClick={() => navigate(`/vendedores/${fornecedorItem.id}`)}
                style={{
                  textAlign: 'left',
                  backgroundColor: '#FAF4E8',
                  border: '1px solid #EAD8BE',
                  borderRadius: BORDER_RADIUS.MD,
                  padding: SPACING.MD,
                  cursor: 'pointer',
                }}
              >
                <strong
                  style={{
                    color: COLORS.DARK_TEXT,
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  {nome}
                </strong>

                <div style={{ color: '#8A6B58', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {fornecedorItem.descricao_loja || 'Fornecedor com peças cadastradas no BigPeças.'}
                </div>

                <div
                  style={{
                    marginTop: SPACING.SM,
                    color: COLORS.BORDEAUX,
                    fontSize: '0.9rem',
                    fontWeight: 800,
                  }}
                >
                  {fornecedorItem.total_pecas} peças • {fornecedorItem.pecas_com_estoque} com estoque
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: '#8A6B58',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  Relevância: {fornecedorItem.score_recomendacao} pts
                </div>
              </button>
            );
          })}
        </div>
      </section>
    );
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

                  <div style={{ display: 'flex', gap: SPACING.MD, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      style={{
                        ...BUTTON_SECONDARY_STYLE,
                        alignSelf: 'flex-start',
                        backgroundColor: itemNoCarrinho ? COLORS.BORDEAUX : 'transparent',
                        color: itemNoCarrinho ? '#fff' : COLORS.BORDEAUX,
                      }}
                    >
                      {itemNoCarrinho ? '✗ Remover do carrinho' : '🛒︎ Adicionar ao carrinho'}
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleWish}
                      disabled={loadingWish}
                      style={{
                        ...BUTTON_SECONDARY_STYLE,
                        alignSelf: 'flex-start',
                        backgroundColor: salvoNaWish ? COLORS.BORDEAUX : 'transparent',
                        color: salvoNaWish ? '#fff' : COLORS.BORDEAUX,
                        opacity: loadingWish ? 0.65 : 1,
                        cursor: loadingWish ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {salvoNaWish ? '♥ Remover da lista de desejos' : '♡ Adicionar à lista de desejos'}
                    </button>
                  </div>

                  {wishMessage && (
                    <div
                      style={{
                        color: COLORS.BORDEAUX,
                        backgroundColor: '#FFF7D6',
                        border: '1px solid #F0C060',
                        borderRadius: BORDER_RADIUS.MD,
                        padding: SPACING.SM,
                        fontWeight: 700,
                      }}
                    >
                      {wishMessage}
                    </div>
                  )}

                  {carrinhoMessage && (
                    <div
                      style={{
                        color: COLORS.BORDEAUX,
                        backgroundColor: '#FFF7D6',
                        border: '1px solid #F0C060',
                        borderRadius: BORDER_RADIUS.MD,
                        padding: SPACING.SM,
                        fontWeight: 700,
                      }}
                    >
                      {carrinhoMessage}
                    </div>
                  )}
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

              <RecomendacoesSection />

              <FornecedoresRecomendadosSection />

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