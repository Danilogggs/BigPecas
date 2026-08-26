import { AUTH_API_URL } from '../../../services/apiConfig';

const headersComToken = (token, json = false) => ({
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  Authorization: `Bearer ${token}`,
});

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
});

export default adminGateway;
