import React, { useState } from 'react';
import { cadastrarPeca } from '../services/pecasService';

const BORDEAUX = '#7B1D2E';
const CREAM = '#F5EDD8';

export default function CadastroPecas() {
  const [formData, setFormData] = useState({
    nome_peca: '',
    sku: '',
    oem_number: '',
    num_serie: '',
    categoria: '',
    material: '',
    condicao: 'NOS',
    peso_gramas: '',
    comprimento_mm: '',
    largura_mm: '',
    altura_mm: '',
    detalhes_gravacao: '',
    historico_proveniencia: '',
    preco: '',
    estoque_atual: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(`Campo ${name} alterado para:`, value);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await cadastrarPeca(formData);
      setMessage({ type: 'success', text: response.message || 'Peça cadastrada com sucesso!' });
      // Limpa o formulário
      setFormData({
        nome_peca: '',
        sku: '',
        oem_number: '',
        num_serie: '',
        categoria: '',
        material: '',
        condicao: 'NOS',
        peso_gramas: '',
        comprimento_mm: '',
        largura_mm: '',
        altura_mm: '',
        detalhes_gravacao: '',
        historico_proveniencia: '',
        preco: '',
        estoque_atual: ''
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Erro ao cadastrar peça' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: CREAM, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: BORDEAUX,
          padding: '1rem 2rem',
          color: CREAM,
          textShadow: '1px 1px 4px rgba(0,0,0,0.35)'
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
          Cadastrar Peça
        </h1>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.9 }}>
          Adicione novos itens ao catálogo de peças vintage
        </p>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
        {/* Message Alert */}
        {message.text && (
          <div
            style={{
              padding: '1rem',
              marginBottom: '1.5rem',
              borderRadius: '0.625rem',
              backgroundColor: message.type === 'success' ? '#D1FAE5' : '#FEE2E2',
              color: message.type === 'success' ? '#065F46' : '#7F1D1D',
              border: `2px solid ${message.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`,
              fontSize: '0.95rem'
            }}
          >
            {message.text}
          </div>
        )}

        {/* Form Container */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '1rem',
            border: `2px solid ${BORDEAUX}22`,
            padding: '2rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* Section: Informações Básicas */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: BORDEAUX, marginBottom: '1rem', fontWeight: 600 }}>
                Informações Básicas
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <input
                  type="text"
                  name="nome_peca"
                  placeholder="Nome da Peça *"
                  value={formData.nome_peca}
                  onChange={handleInputChange}
                  required
                  style={{
                    padding: '0.75rem',
                    border: `2px solid #DDD`,
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    backgroundColor: '#FAFAFA'
                  }}
                />
                <input
                  type="text"
                  name="sku"
                  placeholder="SKU (Código interno)"
                  value={formData.sku}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid #DDD`,
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    backgroundColor: '#FAFAFA'
                  }}
                />
                <input
                  type="text"
                  name="oem_number"
                  placeholder="OEM Number (Número original)"
                  value={formData.oem_number}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid #DDD`,
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    backgroundColor: '#FAFAFA'
                  }}
                />
                <input
                  type="text"
                  name="num_serie"
                  placeholder="Número de série"
                  value={formData.num_serie}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid #DDD`,
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    backgroundColor: '#FAFAFA'
                  }}
                />
              </div>
            </div>

            {/* Section: Categorização */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: BORDEAUX, marginBottom: '1rem', fontWeight: 600 }}>
                Categorização
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid #DDD`,
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    backgroundColor: '#FAFAFA'
                  }}
                >
                  <option value="">Selecione categoria...</option>
                  <option value="1">Motor</option>
                  <option value="2">Lataria</option>
                  <option value="3">Elétrica</option>
                  <option value="4">Interior</option>
                  <option value="5">Suspensão</option>
                  <option value="6">Freios</option>
                </select>
                <select
                  name="material"
                  value={formData.material}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid #DDD`,
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    backgroundColor: '#FAFAFA'
                  }}
                >
                  <option value="">Selecione material...</option>
                  <option value="1">Aço</option>
                  <option value="2">Antimônio</option>
                  <option value="3">Baquelite</option>
                  <option value="4">Cromo</option>
                  <option value="5">Alumínio</option>
                  <option value="6">Borracha</option>
                </select>
              </div>
            </div>

            {/* Section: Condição e Preço */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: BORDEAUX, marginBottom: '1rem', fontWeight: 600 }}>
                Condição e Preço
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <select
                  name="condicao"
                  value={formData.condicao}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid #DDD`,
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    backgroundColor: '#FAFAFA'
                  }}
                >
                  <option value="NOS">NOS (Estoque Antigo Novo)</option>
                  <option value="Original Usada">Original Usada</option>
                  <option value="Restaurada">Restaurada</option>
                  <option value="Reprodução de Época">Reprodução de Época</option>
                </select>
                <input
                  type="number"
                  name="preco"
                  placeholder="Preço (R$) *"
                  value={formData.preco}
                  onChange={handleInputChange}
                  step="0.01"
                  required
                  style={{
                    padding: '0.75rem',
                    border: `2px solid #DDD`,
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    backgroundColor: '#FAFAFA'
                  }}
                />
              </div>
            </div>

            {/* Section: Dimensões */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: BORDEAUX, marginBottom: '1rem', fontWeight: 600 }}>
                Dimensões (Frete)
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem' }}>
                <input
                  type="number"
                  name="peso_gramas"
                  placeholder="Peso (g)"
                  value={formData.peso_gramas}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid #DDD`,
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    backgroundColor: '#FAFAFA'
                  }}
                />
                <input
                  type="number"
                  name="comprimento_mm"
                  placeholder="Comprimento (mm)"
                  value={formData.comprimento_mm}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid #DDD`,
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    backgroundColor: '#FAFAFA'
                  }}
                />
                <input
                  type="number"
                  name="largura_mm"
                  placeholder="Largura (mm)"
                  value={formData.largura_mm}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid #DDD`,
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    backgroundColor: '#FAFAFA'
                  }}
                />
                <input
                  type="number"
                  name="altura_mm"
                  placeholder="Altura (mm)"
                  value={formData.altura_mm}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid #DDD`,
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    backgroundColor: '#FAFAFA'
                  }}
                />
              </div>
            </div>

            {/* Section: Autenticidade */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: BORDEAUX, marginBottom: '1rem', fontWeight: 600 }}>
                Detalhes de Autenticidade
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                <textarea
                  name="detalhes_gravacao"
                  placeholder="Detalhes de gravação (ex: Logo Ford timbrado no verso)"
                  value={formData.detalhes_gravacao}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid #DDD`,
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    backgroundColor: '#FAFAFA',
                    minHeight: '80px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <textarea
                  name="historico_proveniencia"
                  placeholder="Histórico e procedência da peça"
                  value={formData.historico_proveniencia}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid #DDD`,
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    backgroundColor: '#FAFAFA',
                    minHeight: '80px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* Section: Estoque */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: BORDEAUX, marginBottom: '1rem', fontWeight: 600 }}>
                Estoque
              </h2>
              <input
                type="number"
                name="estoque_atual"
                placeholder="Quantidade em estoque"
                value={formData.estoque_atual}
                onChange={handleInputChange}
                style={{
                  padding: '0.75rem',
                  border: `2px solid #DDD`,
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  backgroundColor: '#FAFAFA',
                  width: '100%'
                }}
              />
            </div>

            {/* Submit Button */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="reset"
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.625rem',
                  border: `2px solid ${BORDEAUX}`,
                  backgroundColor: 'transparent',
                  color: BORDEAUX,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = `${BORDEAUX}22`}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Limpar
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.75rem 2rem',
                  borderRadius: '0.625rem',
                  backgroundColor: BORDEAUX,
                  color: CREAM,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  border: 'none',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => !loading && (e.target.style.opacity = 0.9)}
                onMouseLeave={(e) => !loading && (e.target.style.opacity = 1)}
              >
                {loading ? 'Salvando...' : '✓ Cadastrar Peça'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}