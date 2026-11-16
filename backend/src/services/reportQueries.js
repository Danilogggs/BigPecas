const AppError = require('../utils/AppError');

async function consultarRelatorio(supabase, nome, parametros) {
  const { data, error } = await supabase.rpc(nome, parametros);
  if (error?.code === 'PGRST202' || error?.code === '42883') {
    throw new AppError(503, 'Relatórios em atualização neste ambiente. Tente novamente em instantes.');
  }
  if (error) throw error;
  if (!data) throw new AppError(503, 'O banco não retornou o relatório.');
  return data;
}

module.exports = { consultarRelatorio };
