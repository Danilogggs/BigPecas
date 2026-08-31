const AppError = require('../utils/AppError');

function validarRespostas(respostas) {
  if (!Array.isArray(respostas) || respostas.length > 200) {
    throw new AppError(400, 'Envie as respostas do checklist.');
  }
  const ids = new Set();
  for (const resposta of respostas) {
    const id = String(resposta?.criterio_id);
    if (!/^[1-9]\d*$/.test(id) || ids.has(id) || typeof resposta.resposta !== 'boolean') {
      throw new AppError(400, 'Checklist inválido: use critérios únicos e respostas booleanas.');
    }
    if (resposta.observacao != null && (typeof resposta.observacao !== 'string' || resposta.observacao.length > 2000)) {
      throw new AppError(400, 'Observação inválida.');
    }
    ids.add(id);
  }
  return respostas;
}

function validarCriterio(body) {
  if (typeof body.nome_criterio !== 'string' || !body.nome_criterio.trim() || body.nome_criterio.length > 300 ||
      typeof body.obrigatorio !== 'boolean' || typeof body.ativo !== 'boolean' ||
      !Number.isSafeInteger(body.ordem) || body.ordem < 0 ||
      (body.descricao != null && (typeof body.descricao !== 'string' || body.descricao.length > 2000))) {
    throw new AppError(400, 'Informe texto, ordem inteira não negativa, ativação e obrigatoriedade válidos.');
  }
  return { nome_criterio: body.nome_criterio.trim(), descricao: body.descricao || '',
    obrigatorio: body.obrigatorio, ativo: body.ativo, ordem: body.ordem, atualizado_em: new Date().toISOString() };
}

module.exports = { validarRespostas, validarCriterio };
