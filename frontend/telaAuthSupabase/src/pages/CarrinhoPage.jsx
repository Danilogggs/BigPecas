import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../contexts/CartContext';
import { TrashIcon } from '../components/Icons';

const BORDEAUX = '#7B1D2E';
const CREAM = '#F5EDD8';
const HIGHLIGHT = '#F0C060';
const SPACING = {
  SM: '0.5rem',
  MD: '1rem',
  LG: '1.5rem',
};

export default function CarrinhoPage() {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQuantity, getTotal } = useCart();

  const handleQuantityChange = (itemId, newQuantity, maxEstoque) => {
    const parsedQuantity = parseInt(newQuantity, 10);
    if (parsedQuantity > 0 && parsedQuantity <= maxEstoque) {
      updateQuantity(itemId, parsedQuantity, maxEstoque);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: CREAM }}>
      <Header />
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: `${SPACING.LG}`,
        }}
      >
        {/* Título */}
        <div style={{ marginBottom: SPACING.LG }}>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: BORDEAUX,
              marginBottom: SPACING.MD,
            }}
          >
            Carrinho de Compras
          </h1>
        </div>

        {cartItems.length === 0 ? (
          // Carrinho vazio
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '1rem',
              padding: SPACING.LG,
              textAlign: 'center',
              border: `2px solid ${BORDEAUX}22`,
            }}
          >
            <p
              style={{
                fontSize: '1.1rem',
                color: BORDEAUX,
                marginBottom: SPACING.MD,
              }}
            >
              Seu carrinho está vazio
            </p>
            <button
              onClick={() => navigate('/buscaPecas')}
              style={{
                backgroundColor: BORDEAUX,
                color: CREAM,
                padding: `${SPACING.MD} ${SPACING.LG}`,
                borderRadius: '0.5rem',
                border: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HIGHLIGHT)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BORDEAUX)}
            >
              Continuar Comprando
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 350px',
              gap: SPACING.LG,
              alignItems: 'start',
            }}
          >
            {/* Lista de itens */}
            <div>
              <div
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '1rem',
                  overflow: 'hidden',
                  border: `2px solid ${BORDEAUX}22`,
                }}
              >
                {cartItems.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr 150px 100px 50px',
                      gap: SPACING.MD,
                      alignItems: 'center',
                      padding: SPACING.LG,
                      borderBottom:
                        index < cartItems.length - 1 ? `1px solid ${BORDEAUX}11` : 'none',
                    }}
                  >
                    {/* Imagem */}
                    <div
                      style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '0.5rem',
                        backgroundColor: '#f0f0f0',
                        overflow: 'hidden',
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate(`/pecas/${item.id}`)}
                    >
                      {item.imagem ? (
                        <img
                          src={item.imagem}
                          alt={item.nome}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ccc',
                            fontSize: '0.875rem',
                          }}
                        >
                          Sem imagem
                        </div>
                      )}
                    </div>

                    {/* Informações */}
                    <div>
                      <h3
                        style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: BORDEAUX,
                          marginBottom: SPACING.SM,
                          cursor: 'pointer',
                          textDecoration: 'none',
                        }}
                        onClick={() => navigate(`/pecas/${item.id}`)}
                      >
                        {item.nome}
                      </h3>
                      <p
                        style={{
                          fontSize: '0.875rem',
                          color: '#666',
                          marginBottom: SPACING.SM,
                        }}
                      >
                        {item.descricao || 'Sem descrição'}
                      </p>
                      <p
                        style={{
                          fontSize: '0.875rem',
                          color: '#999',
                        }}
                      >
                        Estoque disponível: {item.estoque}
                      </p>
                    </div>

                    {/* Preço */}
                    <div style={{ textAlign: 'center' }}>
                      <p
                        style={{
                          fontSize: '0.875rem',
                          color: '#666',
                          marginBottom: SPACING.SM,
                        }}
                      >
                        Unitário
                      </p>
                      <p
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          color: BORDEAUX,
                        }}
                      >
                        R$ {item.preco.toFixed(2)}
                      </p>
                    </div>

                    {/* Quantidade */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.SM }}>
                      <label
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#666',
                        }}
                      >
                        Quantidade
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={item.estoque}
                        value={item.quantidade}
                        onChange={(e) =>
                          handleQuantityChange(item.id, e.target.value, item.estoque)
                        }
                        style={{
                          padding: SPACING.SM,
                          borderRadius: '0.375rem',
                          border: `1px solid ${BORDEAUX}33`,
                          fontSize: '0.875rem',
                          textAlign: 'center',
                          fontWeight: 600,
                          color: BORDEAUX,
                        }}
                      />
                    </div>

                    {/* Botão deletar */}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        backgroundColor: '#ff4444',
                        color: '#fff',
                        padding: SPACING.SM,
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#cc0000')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ff4444')}
                      title="Remover item"
                    >
                      <TrashIcon size={18} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Botão para continuar comprando */}
              <button
                onClick={() => navigate('/buscaPecas')}
                style={{
                  marginTop: SPACING.LG,
                  padding: `${SPACING.MD} ${SPACING.LG}`,
                  backgroundColor: 'transparent',
                  color: BORDEAUX,
                  border: `2px solid ${BORDEAUX}`,
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = BORDEAUX;
                  e.currentTarget.style.color = CREAM;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = BORDEAUX;
                }}
              >
                + Adicionar Mais Itens
              </button>
            </div>

            {/* Resumo do pedido */}
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '1rem',
                padding: SPACING.LG,
                border: `2px solid ${BORDEAUX}22`,
                height: 'fit-content',
              }}
            >
              <h2
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: BORDEAUX,
                  marginBottom: SPACING.MD,
                }}
              >
                Resumo do Pedido
              </h2>

              <div
                style={{
                  marginBottom: SPACING.MD,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: SPACING.SM,
                    fontSize: '0.875rem',
                  }}
                >
                  <span style={{ color: '#666' }}>Subtotal:</span>
                  <span style={{ color: BORDEAUX, fontWeight: 600 }}>
                    R$ {getTotal().toFixed(2)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: SPACING.SM,
                    fontSize: '0.875rem',
                  }}
                >
                  <span style={{ color: '#666' }}>Frete:</span>
                  <span style={{ color: BORDEAUX, fontWeight: 600 }}>A calcular</span>
                </div>
              </div>

              <div
                style={{
                  borderTop: `1px solid ${BORDEAUX}22`,
                  paddingTop: SPACING.MD,
                  marginBottom: SPACING.LG,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: BORDEAUX }}>Total:</span>
                  <span style={{ color: HIGHLIGHT }}>R$ {getTotal().toFixed(2)}</span>
                </div>
              </div>

              <button
                style={{
                  width: '100%',
                  padding: `${SPACING.MD}`,
                  backgroundColor: BORDEAUX,
                  color: CREAM,
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  marginBottom: SPACING.MD,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HIGHLIGHT)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BORDEAUX)}
              >
                Finalizar Compra
              </button>

              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#999',
                  textAlign: 'center',
                }}
              >
                {cartItems.length} item{cartItems.length > 1 ? 's' : ''} no carrinho
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
