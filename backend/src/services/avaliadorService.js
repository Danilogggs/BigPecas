const { supabaseAdmin: db } = require('../config/supabaseClient');
const AppError = require('../utils/AppError');
const { validarRespostas } = require('./reviewValidation');
function result({ data, error }) {
  if (error) {
    if (error.code === 'P0001') throw new AppError(409, error.message);
    throw error;
  }
  return data;
}
module.exports = {
  async getPecasPendentes(_id, limit = 20, offset = 0, order = 'recent') {
    limit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 20)));
    offset = Math.max(0, Math.floor(Number(offset) || 0));
    return result(await db.from('pecas').select('*, users!pecas_fornecedor_id_fkey(full_name)')
      .eq('status_publicacao', 'pendente_validacao')
      .order('data_cadastro', { ascending: order === 'oldest' })
      .range(offset, offset + limit - 1));
  },
  async getValidacaoPeca(pecaId) {
    const peca = result(await db.from('pecas').select('*').eq('id', pecaId).maybeSingle());
    if (!peca) throw new AppError(404, 'Peça não encontrada.');
    const validacao = result(await db.from('avaliacoes_pecas').select('*').eq('peca_id', pecaId)
      .eq('revisao', peca.revisao_avaliacao).maybeSingle());
    const criterios = peca.status_publicacao === 'pendente_validacao'
      ? await this.getChecklistCriterios()
      : validacao?.criterios_snapshot || [];
    return { peca, validacao, criterios };
  },
  async getChecklistCriterios() {
    return result(await db.from('checklist_validacao_peca').select('*').eq('ativo', true).order('ordem').order('id'));
  },
  async decidir(pecaId, avaliadorId, respostas, comentarios, revisao, rejeitar) {
    validarRespostas(respostas);
    if (!Number.isSafeInteger(revisao) || revisao < 1) throw new AppError(400, 'Recarregue a avaliação.');
    if (typeof comentarios !== 'string' || comentarios.length > 5000 || (rejeitar && !comentarios.trim())) {
      throw new AppError(400, 'Informe um comentário válido; a reprovação exige motivo.');
    }
    return result(await db.rpc('decidir_avaliacao_peca', {
      p_peca: pecaId, p_avaliador: avaliadorId, p_revisao: revisao,
      p_respostas: respostas, p_comentarios: comentarios, p_rejeitar: rejeitar,
    }));
  },
  async getEstatisticas(avaliadorId) {
    const rows = result(await db.from('avaliacoes_pecas').select('status').eq('avaliador_id', avaliadorId));
    const pending = await db.from('pecas').select('id', { count: 'exact', head: true }).eq('status_publicacao', 'pendente_validacao');
    if (pending.error) throw pending.error;
    return { pendentes: pending.count, total: rows.length,
      aprovadas: rows.filter(r => r.status === 'aprovada').length,
      rejeitadas: rows.filter(r => r.status === 'rejeitada').length };
  },
};

