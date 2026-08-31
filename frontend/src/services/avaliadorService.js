import { supabase } from './supabase';
import { API_BASE_URL } from './apiConfig';
export async function reviewRequest(path, method = 'GET', body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Faça login novamente.');
  const response = await fetch(API_BASE_URL + path, {
    method, headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || 'Não foi possível concluir a operação.');
  return data;
}
export default {
  getPecasPendentes: (limit = 20, offset = 0) => reviewRequest('/avaliador/pecas-pendentes?limit=' + limit + '&offset=' + offset),
  getValidacaoPeca: id => reviewRequest('/avaliador/validacao/' + id),
  getEstatisticas: () => reviewRequest('/avaliador/estatisticas'),
  getChecklistCriterios: () => reviewRequest('/avaliador/checklist-criterios'),
  submitValidacao: (id, respostas, comentarios, revisao) => reviewRequest('/avaliador/validacao/' + id, 'POST', { respostas, comentarios, revisao }),
  rejectValidacao: (id, motivo, respostas, revisao) => reviewRequest('/avaliador/validacao/' + id + '/rejeitar', 'POST', { motivo, respostas, revisao }),
};

