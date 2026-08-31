import { AUTH_API_URL } from '../../../services/apiConfig';

const headersComToken = (token, json = false) => ({
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  Authorization: `Bearer ${token}`,
});

async function requisicao(token, path, options = {}) {
  const response = await fetch(`${AUTH_API_URL}/api/admin${path}`, {
    ...options,
    headers: { ...headersComToken(token, Boolean(options.body)), ...options.headers },
  });
  const resultado = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(resultado.error || 'Não foi possível concluir esta ação.');
  return resultado;
}

const adminGateway = Object.freeze({
  async carregar(token, mensagens) {
    const [meResponse, dashboardResponse, preferencesResponse] = await Promise.all([
      fetch(`${AUTH_API_URL}/api/admin/me`, { headers: headersComToken(token) }),
      fetch(`${AUTH_API_URL}/api/admin/dashboard`, { headers: headersComToken(token) }),
      fetch(`${AUTH_API_URL}/api/admin/preferencias`, { headers: headersComToken(token) }),
    ]);
    if (meResponse.status === 403) throw new Error(mensagens.semPermissao);
    if (!meResponse.ok || !dashboardResponse.ok || !preferencesResponse.ok) {
      throw new Error(mensagens.indisponivel);
    }
    const [me, dashboard, preferences] = await Promise.all([
      meResponse.json(), dashboardResponse.json(), preferencesResponse.json(),
    ]);
    return { admin: me.admin, dashboard, widgets: preferences?.config?.widgets };
  },

  async salvarPreferencias(token, widgets, mensagemErro) {
    const response = await fetch(`${AUTH_API_URL}/api/admin/preferencias`, {
      method: 'PUT',
      headers: headersComToken(token, true),
      body: JSON.stringify({ widgets }),
    });
    if (!response.ok) throw new Error(mensagemErro);
    return response.json();
  },

  async criarContaAdmin(token, dados) {
    const response = await fetch(`${AUTH_API_URL}/api/admin/usuarios/admin`, {
      method: 'POST',
      headers: headersComToken(token, true),
      body: JSON.stringify(dados),
    });
    const resultado = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(resultado.error || 'Não foi possível criar a conta administrativa.');
    return resultado;
  },

  listarUsuarios: (token, busca = '') => requisicao(token, `/usuarios?search=${encodeURIComponent(busca)}&limit=100`),
  carregarDadosGerenciais: (token) => requisicao(token, '/analytics'),
  atualizarAdmin: (token, id, is_admin) => requisicao(token, `/usuarios/${id}/admin`, { method: 'PATCH', body: JSON.stringify({ is_admin }) }),
  editarUsuario: (token, id, dados) => requisicao(token, `/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }),
  removerUsuario: (token, id) => requisicao(token, `/usuarios/${id}`, { method: 'DELETE' }),
  removerUsuarioPermanente: (token, id) => requisicao(token, `/usuarios/${id}/permanente`, { method: 'DELETE' }),
  listarPecas: (token, busca = '') => requisicao(token, `/pecas?search=${encodeURIComponent(busca)}&limit=100`),
  editarPeca: (token, id, dados) => requisicao(token, `/pecas/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }),
  removerPeca: (token, id) => requisicao(token, `/pecas/${id}`, { method: 'DELETE' }),
  removerPecaPermanente: (token, id) => requisicao(token, `/pecas/${id}/permanente`, { method: 'DELETE' }),
  listarPedidos: (token, status = '') => requisicao(token, `/pedidos?limit=100${status ? `&status=${status}` : ''}`),
  atualizarPedido: (token, id, status) => requisicao(token, `/pedidos/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  listarAvaliacoes: (token, tipo) => requisicao(token, `/avaliacoes/${tipo}?limit=100`),
  editarAvaliacao: (token, tipo, id, dados) => requisicao(token, `/avaliacoes/${tipo}/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }),
  removerAvaliacao: (token, tipo, id) => requisicao(token, `/avaliacoes/${tipo}/${id}`, { method: 'DELETE' }),
});

export default adminGateway;
