import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buscarPerfilUsuario, salvarPerfilUsuario } from '../services/usuarioService';

const INITIAL_FORM = {
  full_name: '',
  email: '',
  gender: '',
  cep: '',
  tipo_usuario: '',
  nome_loja: '',
  descricao_loja: '',
  telefone: '',
};

const REGEX = {
  nome: /^[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)+$/,
  cep: /^\d{5}-\d{3}$/,
  telefone: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  loja: /^[A-Za-zÀ-ÿ0-9\s.'-]{3,150}$/,
};

export default function ProfilePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const precisaDadosLoja = form.tipo_usuario === 'vendedor' || form.tipo_usuario === 'ambos';

  useEffect(() => {
    async function loadProfile() {
      try {
        const perfil = await buscarPerfilUsuario();

        setForm({
          full_name: perfil?.full_name || '',
          email: perfil?.email || '',
          gender: perfil?.gender || '',
          cep: perfil?.cep || '',
          tipo_usuario: perfil?.tipo_usuario || '',
          nome_loja: perfil?.nome_loja || '',
          descricao_loja: perfil?.descricao_loja || '',
          telefone: perfil?.telefone || '',
        });
      } catch (error) {
        setMessage({
          type: 'error',
          text: error?.message || 'Não foi possível carregar os dados do seu perfil agora.',
        });
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  function clearFieldError(fieldName) {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: '',
    }));
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      nome_loja: name === 'tipo_usuario' && value === 'comprador' ? '' : prev.nome_loja,
      descricao_loja: name === 'tipo_usuario' && value === 'comprador' ? '' : prev.descricao_loja,
    }));

    clearFieldError(name);
    setMessage({ type: '', text: '' });
  }

  function formatCep(value) {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  }

  function formatTelefone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length > 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    if (digits.length > 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    if (digits.length > 2) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }

    return digits;
  }

  function handleCepChange(e) {
    setForm((prev) => ({
      ...prev,
      cep: formatCep(e.target.value),
    }));

    clearFieldError('cep');
    setMessage({ type: '', text: '' });
  }

  function handleTelefoneChange(e) {
    setForm((prev) => ({
      ...prev,
      telefone: formatTelefone(e.target.value),
    }));

    clearFieldError('telefone');
    setMessage({ type: '', text: '' });
  }

  function validateForm() {
    const newErrors = {};

    if (!form.full_name.trim()) {
      newErrors.full_name = 'Informe seu nome completo.';
    } else if (!REGEX.nome.test(form.full_name.trim())) {
      newErrors.full_name = 'Digite nome e sobrenome usando apenas letras.';
    }

    if (!form.tipo_usuario.trim()) {
      newErrors.tipo_usuario = 'Selecione o tipo de usuário.';
    }

    if (!form.cep.trim()) {
      newErrors.cep = 'Informe seu CEP.';
    } else if (!REGEX.cep.test(form.cep.trim())) {
      newErrors.cep = 'Digite um CEP válido no formato 00000-000.';
    }

    if (!form.telefone.trim()) {
      newErrors.telefone = 'Informe seu telefone.';
    } else if (!REGEX.telefone.test(form.telefone.trim())) {
      newErrors.telefone = 'Digite um telefone válido com DDD. Ex: (41) 99999-9999.';
    }

    if (precisaDadosLoja && !form.nome_loja.trim()) {
      newErrors.nome_loja = 'Informe o nome da loja.';
    } else if (precisaDadosLoja && !REGEX.loja.test(form.nome_loja.trim())) {
      newErrors.nome_loja = 'O nome da loja deve ter pelo menos 3 caracteres válidos.';
    }

    if (precisaDadosLoja && !form.descricao_loja.trim()) {
      newErrors.descricao_loja = 'Informe a descrição da loja.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage({ type: '', text: '' });

    if (!validateForm()) {
      setMessage({
        type: 'error',
        text: 'Corrija os campos destacados antes de salvar.',
      });
      return;
    }

    setSaving(true);

    try {
      const perfilAtualizado = await salvarPerfilUsuario({
        full_name: form.full_name.trim(),
        gender: form.gender.trim(),
        cep: form.cep.trim(),
        tipo_usuario: form.tipo_usuario.trim(),
        nome_loja: precisaDadosLoja ? form.nome_loja.trim() : '',
        descricao_loja: precisaDadosLoja ? form.descricao_loja.trim() : '',
        telefone: form.telefone.trim(),
      });

      setForm({
        full_name: perfilAtualizado?.full_name || form.full_name,
        email: perfilAtualizado?.email || form.email,
        gender: perfilAtualizado?.gender || form.gender,
        cep: perfilAtualizado?.cep || form.cep,
        tipo_usuario: perfilAtualizado?.tipo_usuario || form.tipo_usuario,
        nome_loja: perfilAtualizado?.nome_loja || form.nome_loja,
        descricao_loja: perfilAtualizado?.descricao_loja || form.descricao_loja,
        telefone: perfilAtualizado?.telefone || form.telefone,
      });

      setErrors({});
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error?.message || 'Não foi possível salvar os dados do seu perfil agora.',
      });
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    fontSize: '15px',
  };

  function getInputStyle(fieldName, disabled = false) {
    return {
      ...inputStyle,
      backgroundColor: disabled ? '#f3f4f6' : '#fff',
      border: errors[fieldName] ? '1.5px solid #B91C1C' : '1px solid #d1d5db',
      boxShadow: errors[fieldName] ? '0 0 0 3px rgba(185, 28, 28, 0.10)' : 'none',
    };
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    color: '#7B1D2E',
    fontWeight: 600,
  };

  const fieldErrorStyle = {
    color: '#B91C1C',
    fontSize: '0.82rem',
    marginTop: '6px',
    fontWeight: 600,
  };

  function FieldError({ name }) {
    if (!errors[name]) return null;
    return <div style={fieldErrorStyle}>{errors[name]}</div>;
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#7B1D2E' }}>
        Carregando perfil...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f3ead7',
        padding: '40px 20px',
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '32px',
            fontWeight: 700,
            color: '#7B1D2E',
          }}
        >
          Editar Perfil
        </h1>

        <p
          style={{
            marginTop: '8px',
            marginBottom: '24px',
            color: '#8b6b5c',
          }}
        >
          Atualize suas informações básicas.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Nome completo *</label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              style={getInputStyle('full_name')}
            />
            <FieldError name="full_name" />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>E-mail</label>
            <input
              type="email"
              name="email"
              value={form.email}
              disabled
              style={getInputStyle('email', true)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Gênero</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                style={getInputStyle('gender')}
              >
                <option value="">Prefiro não informar</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Não-binário">Não-binário</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Tipo de usuário *</label>
              <select
                name="tipo_usuario"
                value={form.tipo_usuario}
                onChange={handleChange}
                style={getInputStyle('tipo_usuario')}
              >
                <option value="">Selecione</option>
                <option value="comprador">Comprador</option>
                <option value="vendedor">Vendedor</option>
                <option value="ambos">Comprador e vendedor</option>
              </select>
              <FieldError name="tipo_usuario" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>CEP *</label>
              <input
                type="text"
                name="cep"
                value={form.cep}
                onChange={handleCepChange}
                placeholder="00000-000"
                maxLength={9}
                style={getInputStyle('cep')}
              />
              <FieldError name="cep" />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Telefone *</label>
              <input
                type="text"
                name="telefone"
                value={form.telefone}
                onChange={handleTelefoneChange}
                placeholder="(00) 00000-0000"
                maxLength={15}
                style={getInputStyle('telefone')}
              />
              <FieldError name="telefone" />
            </div>
          </div>

          {precisaDadosLoja && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Nome da loja *</label>
                <input
                  type="text"
                  name="nome_loja"
                  value={form.nome_loja}
                  onChange={handleChange}
                  style={getInputStyle('nome_loja')}
                />
                <FieldError name="nome_loja" />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Descrição da loja *</label>
                <textarea
                  name="descricao_loja"
                  value={form.descricao_loja}
                  onChange={handleChange}
                  rows={4}
                  style={{
                    ...getInputStyle('descricao_loja'),
                    resize: 'vertical',
                  }}
                />
                <FieldError name="descricao_loja" />
              </div>
            </>
          )}

          {message.text && (
            <p
              style={{
                marginTop: '8px',
                marginBottom: '16px',
                color: message.type === 'success' ? '#166534' : '#7B1D2E',
                fontWeight: 500,
              }}
            >
              {message.text}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                border: 'none',
                borderRadius: '9999px',
                padding: '12px 24px',
                backgroundColor: '#F0C060',
                color: '#3a1a16',
                fontWeight: 700,
                fontSize: '15px',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              style={{
                border: '1px solid #7B1D2E33',
                borderRadius: '9999px',
                padding: '12px 24px',
                backgroundColor: '#FFFFFF',
                color: '#7B1D2E',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              Voltar para dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}