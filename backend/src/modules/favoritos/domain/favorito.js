const AppError = require('../../../utils/AppError');

function validarIdPeca(valor) {
  if (!/^\d+$/.test(String(valor)) || Number(valor) < 1) {
    throw new AppError(400, 'Informe uma peça válida.');
  }
  return Number(valor);
}

function obterEmailIdentidade(identidade = {}) {
  return identidade.user?.email
    || identidade.user?.user?.email
    || identidade.authUser?.email
    || identidade.usuario?.email
    || null;
}

function ordenarPecasPorFavoritos(pecas = [], itens = []) {
  const ordem = new Map(itens.map((item, index) => [String(item.peca_id), index]));
  return [...pecas].sort((a, b) => (
    (ordem.get(String(a.id)) ?? 999999) - (ordem.get(String(b.id)) ?? 999999)
  ));
}

module.exports = { obterEmailIdentidade, ordenarPecasPorFavoritos, validarIdPeca };
