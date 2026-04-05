import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cadastrarPeca } from '../services/pecasService';
import DashboardNav from '../components/DashboardNav';

const inputClass =
  'w-full rounded-xl border border-[#D8CFC2] px-4 py-3 text-sm text-[#2C1A17] bg-[#FAF6EF] outline-none focus:border-[#6B1E2D] transition';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#6A5F58] mb-1">
        {label}
        {required && <span className="text-[#6B1E2D] ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="font-serif text-lg font-semibold text-[#6B1E2D] border-b border-[#D8CFC2] pb-2 mb-5">
      {children}
    </h3>
  );
}

const emptyForm = {
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
};

export default function CadastroPecas() {
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await cadastrarPeca(formData);
      setMessage({ type: 'success', text: response.message || 'Peça cadastrada com sucesso!' });
      setFormData(emptyForm);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Erro ao cadastrar peça.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF6EF]">
      <DashboardNav />

      <div className="bg-[#F4E9D8] border-b border-[#D8CFC2] px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#7C6540]">Catálogo</p>
            <h1 className="font-serif text-2xl font-bold text-[#2C1A17] m-0">Cadastrar Peça</h1>
          </div>
          <Link
            to="/dashboard"
            className="text-sm text-[#6A5F58] hover:text-[#6B1E2D] no-underline transition"
          >
            ← Voltar ao dashboard
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {message.text && (
          <div
            className={`rounded-xl px-4 py-3 text-sm font-medium mb-6 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-[28px] border border-[#D8CFC2] shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Informações Básicas */}
            <section>
              <SectionTitle>Informações Básicas</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nome da peça" required>
                  <input
                    className={inputClass}
                    type="text"
                    name="nome_peca"
                    placeholder="Ex: Carburador Weber 460"
                    value={formData.nome_peca}
                    onChange={handleChange}
                    required
                  />
                </Field>
                <Field label="SKU (código interno)">
                  <input
                    className={inputClass}
                    type="text"
                    name="sku"
                    placeholder="Ex: CARB-W460-001"
                    value={formData.sku}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="OEM Number">
                  <input
                    className={inputClass}
                    type="text"
                    name="oem_number"
                    placeholder="Número original do fabricante"
                    value={formData.oem_number}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Número de série">
                  <input
                    className={inputClass}
                    type="text"
                    name="num_serie"
                    placeholder="Número de série da peça"
                    value={formData.num_serie}
                    onChange={handleChange}
                  />
                </Field>
              </div>
            </section>

            {/* Categorização */}
            <section>
              <SectionTitle>Categorização</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Categoria">
                  <select
                    className={inputClass}
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                  >
                    <option value="">Selecione a categoria...</option>
                    <option value="1">Motor</option>
                    <option value="2">Lataria</option>
                    <option value="3">Elétrica</option>
                    <option value="4">Interior</option>
                    <option value="5">Suspensão</option>
                    <option value="6">Freios</option>
                  </select>
                </Field>
                <Field label="Material">
                  <select
                    className={inputClass}
                    name="material"
                    value={formData.material}
                    onChange={handleChange}
                  >
                    <option value="">Selecione o material...</option>
                    <option value="1">Aço</option>
                    <option value="2">Antimônio</option>
                    <option value="3">Baquelite</option>
                    <option value="4">Cromo</option>
                    <option value="5">Alumínio</option>
                    <option value="6">Borracha</option>
                  </select>
                </Field>
              </div>
            </section>

            {/* Condição e Preço */}
            <section>
              <SectionTitle>Condição e Preço</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Condição">
                  <select
                    className={inputClass}
                    name="condicao"
                    value={formData.condicao}
                    onChange={handleChange}
                  >
                    <option value="NOS">NOS (Estoque Antigo Novo)</option>
                    <option value="Original Usada">Original Usada</option>
                    <option value="Restaurada">Restaurada</option>
                    <option value="Reprodução de Época">Reprodução de Época</option>
                  </select>
                </Field>
                <Field label="Preço (R$)" required>
                  <input
                    className={inputClass}
                    type="number"
                    name="preco"
                    placeholder="0,00"
                    value={formData.preco}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    required
                  />
                </Field>
              </div>
            </section>

            {/* Dimensões */}
            <section>
              <SectionTitle>Dimensões para Frete</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { name: 'peso_gramas', label: 'Peso (g)' },
                  { name: 'comprimento_mm', label: 'Comprimento (mm)' },
                  { name: 'largura_mm', label: 'Largura (mm)' },
                  { name: 'altura_mm', label: 'Altura (mm)' },
                ].map(({ name, label }) => (
                  <Field key={name} label={label}>
                    <input
                      className={inputClass}
                      type="number"
                      name={name}
                      placeholder="0"
                      value={formData[name]}
                      onChange={handleChange}
                      min="0"
                    />
                  </Field>
                ))}
              </div>
            </section>

            {/* Autenticidade */}
            <section>
              <SectionTitle>Detalhes de Autenticidade</SectionTitle>
              <div className="grid gap-5">
                <Field label="Detalhes de gravação">
                  <textarea
                    className={`${inputClass} min-h-[80px] resize-vertical`}
                    name="detalhes_gravacao"
                    placeholder="Ex: Logo Ford timbrado no verso, número de série gravado a laser..."
                    value={formData.detalhes_gravacao}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Histórico e procedência">
                  <textarea
                    className={`${inputClass} min-h-[80px] resize-vertical`}
                    name="historico_proveniencia"
                    placeholder="Ex: Peça retirada de Chevette 1980, procedência confirmada..."
                    value={formData.historico_proveniencia}
                    onChange={handleChange}
                  />
                </Field>
              </div>
            </section>

            {/* Estoque */}
            <section>
              <SectionTitle>Estoque</SectionTitle>
              <div className="max-w-xs">
                <Field label="Quantidade em estoque">
                  <input
                    className={inputClass}
                    type="number"
                    name="estoque_atual"
                    placeholder="0"
                    value={formData.estoque_atual}
                    onChange={handleChange}
                    min="0"
                  />
                </Field>
              </div>
            </section>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#D8CFC2]">
              <button
                type="button"
                onClick={() => setFormData(emptyForm)}
                className="rounded-xl border border-[#6B1E2D] px-5 py-2.5 text-sm font-medium text-[#6B1E2D] transition hover:bg-[#6B1E2D]/10"
              >
                Limpar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-[#6B1E2D] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#541723] disabled:opacity-60"
              >
                {loading ? 'Salvando...' : 'Cadastrar Peça'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
