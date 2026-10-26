import { AUTH_API_URL } from '../../../services/apiConfig';

const authHeaders = (token, json = false) => ({
  Authorization: `Bearer ${token}`,
  ...(json ? { 'Content-Type': 'application/json' } : {}),
});

async function request(token, path, options = {}) {
  const response = await fetch(`${AUTH_API_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(token, Boolean(options.body)), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a ação de auditoria.');
  return data;
}

const auditGateway = Object.freeze({
  recordNavigation: (token, event) => request(token, '/api/auditoria/eventos', {
    method: 'POST', body: JSON.stringify(event),
  }),
  listFunctionalities: (token) => request(token, '/api/admin/auditoria/funcionalidades'),
  saveFunctionalities: (token, functionalities) => request(token, '/api/admin/auditoria/funcionalidades', {
    method: 'PUT', body: JSON.stringify({ functionalities }),
  }),
  listLogs: (token, days) => request(token, `/api/admin/auditoria/logs?days=${days}`),
  async exportLogs(token, days, functionality = '') {
    const params = new URLSearchParams({ days: String(days) });
    if (functionality) params.set('functionality', functionality);
    const response = await fetch(`${AUTH_API_URL}/api/admin/auditoria/exportar?${params}`, {
      headers: authHeaders(token),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Não foi possível gerar a planilha.');
    }
    return response.blob();
  },
});

export default auditGateway;
