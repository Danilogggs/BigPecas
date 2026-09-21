const AppError = require('../../../utils/AppError');

function normalizarOem(valor = '') {
  return String(valor).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function validarENormalizarOem(valor) {
  if (typeof valor !== 'string' || !/^[A-Za-z0-9\s\-/]{2,50}$/.test(valor.trim())) {
    throw new AppError(400, 'Informe um número OEM válido.');
  }

  const oem = normalizarOem(valor);
  if (oem.length < 2 || oem.length > 50) {
    throw new AppError(400, 'Informe um número OEM válido.');
  }
  return oem;
}

module.exports = { normalizarOem, validarENormalizarOem };
