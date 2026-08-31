const { supabaseAdmin: db } = require('../config/supabaseClient');
const AppError = require('../utils/AppError');
function amount(value) {
  if (value === '' || value == null || !Number.isFinite(Number(value)) || Number(value) < 0) throw new AppError(400, 'Valor monetário inválido.');
  return Number(value);
}
async function config() {
  const { data, error } = await db.from('taxas_cambio').select('*').not('unidades_por_brl', 'is', null);
  if (error) throw error;
  return data;
}
function rate(rows, currency) {
  const row = rows.find(r => r.moeda === currency);
  if (!row || !(Number(row.unidades_por_brl) > 0)) throw new AppError(400, 'Moeda não configurada.');
  return Number(row.unidades_por_brl);
}
module.exports = {
  config, amount,
  async convert(price, from, to) {
    const rows = await config();
    return Math.round(amount(price) / rate(rows, from) * rate(rows, to) * 100) / 100;
  },
  async getPecaPriceRanges(id) {
    const { data, error } = await db.from('precos_publicos_moeda').select('id, moeda_base, preco_base, moeda_exibicao, preco_exibicao').eq('id', id);
    if (error) throw error;
    if (!data?.length) throw new AppError(404, 'Peça não publicada ou não encontrada.');
    return data;
  },
  async categories(moeda = 'BRL') {
    const rows = await config(); const taxa = rate(rows, moeda);
    return [[0, 500], [500, 5000], [5000, null]].map(([min, max], id) => ({
      id, moeda, valor_minimo: Math.round(min * taxa * 100) / 100,
      valor_maximo: max == null ? null : Math.round(max * taxa * 100) / 100,
    }));
  },
  async filterByPriceRange(min, max, moeda = 'BRL', limit = 20, offset = 0) {
    rate(await config(), moeda);
    min = amount(min ?? 0); max = max == null || max === '' ? null : amount(max);
    if (max != null && max < min) throw new AppError(400, 'Faixa de preço inválida.');
    let query = db.from('precos_publicos_moeda').select('*').eq('moeda_exibicao', moeda).gte('preco_exibicao', min);
    if (max != null) query = query.lte('preco_exibicao', max);
    limit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 20)));
    offset = Math.max(0, Math.floor(Number(offset) || 0));
    const { data, error } = await query.order('preco_exibicao').order('id').range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  },
};

