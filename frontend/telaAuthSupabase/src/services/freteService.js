/**
 * freteService.js
 * Serviço de cálculo de frete com simulação realista por CEP.
 * Mock que reproduz integração com Correios / transportadoras.
 */

const TRANSPORTADORAS = [
  {
    id: 'sedex',
    transportadora: 'Correios',
    tipo: 'SEDEX',
    descricao: 'Entrega expressa',
    fatorPreco: 0.045,
    fatorPrazo: 0.6,
    prazoBase: 2,
    icone: '⚡',
  },
  {
    id: 'pac',
    transportadora: 'Correios',
    tipo: 'PAC',
    descricao: 'Entrega econômica',
    fatorPreco: 0.025,
    fatorPrazo: 1.4,
    prazoBase: 5,
    icone: '📦',
  },
  {
    id: 'jadlog',
    transportadora: 'Jadlog',
    tipo: 'Package',
    descricao: 'Entrega rastreada',
    fatorPreco: 0.035,
    fatorPrazo: 1.0,
    prazoBase: 3,
    icone: '🚚',
  },
  {
    id: 'transp-express',
    transportadora: 'BigLog Express',
    tipo: 'Premium',
    descricao: 'Transportadora parceira BigPeças',
    fatorPreco: 0.055,
    fatorPrazo: 0.4,
    prazoBase: 1,
    icone: '🏎️',
  },
];

/**
 * Formata CEP, mantém apenas dígitos.
 */
export function sanitizarCep(cep = '') {
  return String(cep).replace(/\D/g, '').slice(0, 8);
}

/**
 * Aplica máscara visual 00000-000.
 */
export function formatarCep(cep = '') {
  const limpo = sanitizarCep(cep);
  if (limpo.length <= 5) return limpo;
  return `${limpo.slice(0, 5)}-${limpo.slice(5)}`;
}

/**
 * Valida formato do CEP brasileiro.
 */
export function validarCep(cep = '') {
  return sanitizarCep(cep).length === 8;
}

/**
 * Mock de regiões a partir dos primeiros dígitos do CEP.
 * Em produção, integrar com API ViaCEP.
 */
function determinarRegiao(cep) {
  const prefixo = parseInt(sanitizarCep(cep).slice(0, 1), 10);

  const regioes = {
    0: { regiao: 'SP - Capital', uf: 'SP', distanciaFator: 1.0 },
    1: { regiao: 'SP - Interior', uf: 'SP', distanciaFator: 1.1 },
    2: { regiao: 'RJ / ES', uf: 'RJ', distanciaFator: 1.3 },
    3: { regiao: 'MG', uf: 'MG', distanciaFator: 1.4 },
    4: { regiao: 'BA / SE', uf: 'BA', distanciaFator: 1.8 },
    5: { regiao: 'PE / AL / RN / PB', uf: 'PE', distanciaFator: 2.0 },
    6: { regiao: 'CE / PI / MA / Norte', uf: 'CE', distanciaFator: 2.3 },
    7: { regiao: 'DF / GO / TO / Centro-Oeste', uf: 'DF', distanciaFator: 1.6 },
    8: { regiao: 'PR / SC', uf: 'PR', distanciaFator: 1.2 },
    9: { regiao: 'RS', uf: 'RS', distanciaFator: 1.5 },
  };

  return regioes[prefixo] || regioes[0];
}

/**
 * Calcula frete simulando integração com transportadoras.
 * Demora ~800ms para simular requisição real.
 *
 * @param {string} cep - CEP de destino
 * @param {Array} itens - itens do carrinho
 * @returns {Promise<{regiao, opcoes: Array}>}
 */
export async function calcularFrete(cep, itens = []) {
  if (!validarCep(cep)) {
    throw new Error('Informe um CEP válido com 8 dígitos.');
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    throw new Error('Adicione itens ao carrinho antes de calcular o frete.');
  }

  await new Promise((resolve) => setTimeout(resolve, 850));

  const regiao = determinarRegiao(cep);

  const pesoTotal = itens.reduce((soma, item) => {
    const peso = Number(item.peso_gramas) || 1500;
    return soma + (peso / 1000) * (item.quantidade || 1);
  }, 0);

  const subtotal = itens.reduce(
    (soma, item) => soma + Number(item.preco || 0) * (item.quantidade || 1),
    0,
  );

  const opcoes = TRANSPORTADORAS.map((t) => {
    const base = Math.max(pesoTotal * 8, 14);
    const valor = (base + subtotal * t.fatorPreco) * regiao.distanciaFator;
    const prazoDias = Math.max(
      1,
      Math.round(t.prazoBase * regiao.distanciaFator * t.fatorPrazo),
    );

    return {
      id: t.id,
      transportadora: t.transportadora,
      tipo: t.tipo,
      descricao: t.descricao,
      icone: t.icone,
      valor: Number(valor.toFixed(2)),
      prazoDias,
      prazoTexto:
        prazoDias === 1
          ? 'Entrega em 1 dia útil'
          : `Entrega em até ${prazoDias} dias úteis`,
    };
  }).sort((a, b) => a.valor - b.valor);

  return {
    cep: formatarCep(cep),
    regiao: regiao.regiao,
    uf: regiao.uf,
    opcoes,
    pesoTotalKg: Number(pesoTotal.toFixed(2)),
  };
}

/**
 * Aplica cupom de desconto. Suporta cupons mockados:
 *  - BIGPECAS10: 10% de desconto
 *  - FRETE0:    frete grátis
 *  - PRIMEIRA20: 20% (mínimo R$ 200)
 */
export async function aplicarCupom(codigo, subtotal) {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const cupom = String(codigo || '').trim().toUpperCase();

  const cupons = {
    BIGPECAS10: { tipo: 'percentual', valor: 0.1, descricao: '10% OFF no subtotal' },
    FRETE0: { tipo: 'frete_gratis', valor: 1.0, descricao: 'Frete grátis' },
    PRIMEIRA20: {
      tipo: 'percentual',
      valor: 0.2,
      descricao: '20% OFF na primeira compra',
      minimo: 200,
    },
  };

  const aplicacao = cupons[cupom];

  if (!aplicacao) {
    throw new Error('Cupom inválido ou expirado.');
  }

  if (aplicacao.minimo && subtotal < aplicacao.minimo) {
    throw new Error(
      `Subtotal mínimo de R$ ${aplicacao.minimo.toFixed(2)} para usar este cupom.`,
    );
  }

  return {
    codigo: cupom,
    ...aplicacao,
  };
}
