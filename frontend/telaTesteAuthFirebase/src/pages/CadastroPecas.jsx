import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cadastrarPeca } from '../services/pecasService';
import { menuItems } from '../data/mockData';
import PageLayout from '../components/layouts/PageLayout';
import AppSidebar from '../components/AppSidebar';
import styles from './CadastroPecas.module.css';

export default function CadastroPecas() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('Catálogo');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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
    estoque_atual: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await cadastrarPeca(formData);
      setMessage({ type: 'success', text: response.message || 'Peça cadastrada com sucesso!' });
      setFormData({
        nome_peca: '', sku: '', oem_number: '', num_serie: '', categoria: '', material: '',
        condicao: 'NOS', peso_gramas: '', comprimento_mm: '', largura_mm: '', altura_mm: '',
        detalhes_gravacao: '', historico_proveniencia: '', preco: '', estoque_atual: '',
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Não foi possível cadastrar a peça. Revise os dados e tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className={styles.body}>
        <AppSidebar
          menuItems={menuItems}
          activeNav={activeNav}
          onNavChange={setActiveNav}
          infoTitle="Cadastro Rápido"
          infoText="Adicione novos itens ao catálogo de peças vintage."
          onInfoAction={() => navigate('/')}
        />

        <main className={styles.main}>
          <h1 className={styles.pageTitle}>Cadastrar Peça</h1>
          <p className={styles.pageSubtitle}>Adicione novos itens ao catálogo de peças vintage</p>

          {message.text && (
            <div className={message.type === 'success' ? styles.alertSuccess : styles.alertError}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Grid principal */}
            <div className={styles.gridTwo}>
              {[
                { label: 'Nome da Peça', name: 'nome_peca', required: true },
                { label: 'SKU', name: 'sku', required: true },
                { label: 'Número OEM', name: 'oem_number' },
                { label: 'Número de Série', name: 'num_serie' },
                { label: 'Categoria', name: 'categoria' },
                { label: 'Material', name: 'material' },
              ].map(({ label, name, required }) => (
                <div key={name}>
                  <label className={styles.label}>
                    {label} {required && <span className={styles.required}>*</span>}
                  </label>
                  <input
                    type="text"
                    name={name}
                    value={formData[name]}
                    onChange={handleInputChange}
                    required={required}
                    className={styles.input}
                  />
                </div>
              ))}

              {/* Condição */}
              <div>
                <label className={styles.label}>
                  Condição <span className={styles.required}>*</span>
                </label>
                <select
                  name="condicao"
                  value={formData.condicao}
                  onChange={handleInputChange}
                  className={styles.input}
                >
                  <option>NOS</option>
                  <option>EXCELENTE</option>
                  <option>BOM</option>
                  <option>ACEITÁVEL</option>
                </select>
              </div>

              {/* Preço */}
              <div>
                <label className={styles.label}>
                  Preço (R$) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  name="preco"
                  value={formData.preco}
                  onChange={handleInputChange}
                  required
                  step="0.01"
                  min="0"
                  className={styles.input}
                />
              </div>

              {/* Estoque */}
              <div>
                <label className={styles.label}>
                  Estoque Atual <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  name="estoque_atual"
                  value={formData.estoque_atual}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className={styles.input}
                />
              </div>
            </div>

            {/* Dimensões */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Dimensões (mm)</label>
              <div className={styles.gridThree}>
                {[
                  { name: 'comprimento_mm', placeholder: 'Comprimento' },
                  { name: 'largura_mm', placeholder: 'Largura' },
                  { name: 'altura_mm', placeholder: 'Altura' },
                ].map(({ name, placeholder }) => (
                  <input
                    key={name}
                    type="number"
                    name={name}
                    placeholder={placeholder}
                    value={formData[name]}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                ))}
              </div>
            </div>

            {/* Peso */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Peso (gramas)</label>
              <input
                type="number"
                name="peso_gramas"
                value={formData.peso_gramas}
                onChange={handleInputChange}
                className={styles.input}
                style={{ maxWidth: '240px' }}
              />
            </div>

            {/* Detalhes de gravação */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Detalhes de Gravação</label>
              <textarea
                name="detalhes_gravacao"
                value={formData.detalhes_gravacao}
                onChange={handleInputChange}
                className={styles.input}
                style={{ minHeight: '90px', resize: 'vertical' }}
              />
            </div>

            {/* Histórico */}
            <div className={styles.fieldGroup} style={{ marginBottom: 'var(--space-xxl)' }}>
              <label className={styles.label}>Histórico de Procedência</label>
              <textarea
                name="historico_proveniencia"
                value={formData.historico_proveniencia}
                onChange={handleInputChange}
                className={styles.input}
                style={{ minHeight: '90px', resize: 'vertical' }}
              />
            </div>

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Cadastrando...' : 'Cadastrar Peça'}
            </button>
          </form>
        </main>
      </div>
    </PageLayout>
  );
}
