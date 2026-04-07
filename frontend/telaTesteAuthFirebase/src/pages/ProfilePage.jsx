import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buscarPerfilUsuario, cadastrarUsuario } from '../services/usuarioService';

export default function ProfilePage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        nome: '',
        email: '',
        genero: '',
        cep: '',
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        async function loadProfile() {
            try {
                const perfil = await buscarPerfilUsuario();

                setForm({
                    nome: perfil?.nome || '',
                    email: perfil?.email || '',
                    genero: perfil?.genero || '',
                    cep: perfil?.cep || '',
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

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    }

    function formatCep(value) {
        const digits = value.replace(/\D/g, '').slice(0, 8);
        if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
        return digits;
    }

    function handleCepChange(e) {
        setForm((prev) => ({
            ...prev,
            cep: formatCep(e.target.value),
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (!form.nome.trim()) {
            setMessage({ type: 'error', text: 'Informe seu nome completo.' });
            return;
        }

        setSaving(true);

        try {
            const perfilAtualizado = await cadastrarUsuario({
                nome: form.nome.trim(),
                email: form.email.trim(),
                genero: form.genero.trim(),
                cep: form.cep.trim(),
            });

            setForm({
                nome: perfilAtualizado?.nome || form.nome,
                email: perfilAtualizado?.email || form.email,
                genero: perfilAtualizado?.genero || form.genero,
                cep: perfilAtualizado?.cep || form.cep,
            });

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

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#7B1D2E', fontWeight: 600 }}>
                            Nome completo
                        </label>
                        <input
                            type="text"
                            name="nome"
                            value={form.nome}
                            onChange={handleChange}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                border: '1px solid #d1d5db',
                                fontSize: '15px',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#7B1D2E', fontWeight: 600 }}>
                            E-mail
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            disabled
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                border: '1px solid #d1d5db',
                                backgroundColor: '#f3f4f6',
                                fontSize: '15px',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#7B1D2E', fontWeight: 600 }}>
                            Gênero
                        </label>
                        <input
                            type="text"
                            name="genero"
                            value={form.genero}
                            onChange={handleChange}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                border: '1px solid #d1d5db',
                                fontSize: '15px',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#7B1D2E', fontWeight: 600 }}>
                            CEP
                        </label>
                        <input
                            type="text"
                            name="cep"
                            value={form.cep}
                            onChange={handleCepChange}
                            placeholder="00000-000"
                            maxLength={9}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                border: '1px solid #d1d5db',
                                fontSize: '15px',
                            }}
                        />
                    </div>

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
                            onMouseEnter={(e) => {
                                if (!saving) {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(240, 192, 96, 0.28)';
                                    e.currentTarget.style.filter = 'brightness(0.98)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 6px 14px rgba(240, 192, 96, 0.18)';
                                e.currentTarget.style.filter = 'brightness(1)';
                            }}
                            style={{
                                border: 'none',
                                borderRadius: '9999px',
                                padding: '14px 24px',
                                background: 'linear-gradient(135deg, #F0C060 0%, #E8B64B 100%)',
                                color: '#7B1D2E',
                                fontWeight: 700,
                                fontSize: '15px',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                boxShadow: '0 6px 14px rgba(240, 192, 96, 0.18)',
                                transition: 'all 0.2s ease',
                                opacity: saving ? 0.75 : 1,
                            }}
                        >
                            {saving ? 'Salvando...' : 'Salvar alterações'}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#7B1D2E';
                                e.currentTarget.style.color = '#FFFFFF';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 10px 20px rgba(123, 29, 46, 0.20)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#FFFFFF';
                                e.currentTarget.style.color = '#7B1D2E';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            style={{
                                border: '1.5px solid #7B1D2E',
                                borderRadius: '9999px',
                                padding: '14px 24px',
                                backgroundColor: '#FFFFFF',
                                color: '#7B1D2E',
                                fontWeight: 700,
                                fontSize: '15px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            Voltar para home
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}