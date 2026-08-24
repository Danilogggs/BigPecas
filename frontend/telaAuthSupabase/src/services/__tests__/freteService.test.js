import {
  sanitizarCep,
  formatarCep,
  validarCep,
  calcularFrete,
  aplicarCupom,
} from '../freteService';
import { getSupabaseClient } from '../supabase';
import { criarResposta, respostaDeErro, sessaoValida } from '../../../jest/helpers/http';

jest.mock('../supabase');

const CEP_ORIGEM_PADRAO = '01310100';

const ITEM = {
  id: 10,
  peso_gramas: 800,
  comprimento_mm: 200,
  largura_mm: 150,
  altura_mm: 100,
  preco: 350,
  quantidade: 2,
};

const OPCAO_PAC = { id: 1, transportadora: 'Correios', tipo: 'PAC', valor: 35.9 };

function mockarSessao(resultado = sessaoValida()) {
  getSupabaseClient.mockReturnValue({
    auth: { getSession: jest.fn().mockResolvedValue(resultado) },
  });
}

function corpoEnviado() {
  return JSON.parse(global.fetch.mock.calls[0][1].body);
}

describe('sanitizarCep', () => {
  it.each([
    ['01310-100', '01310100'],
    ['01310100', '01310100'],
    ['01.310-100', '01310100'],
    ['  01310100  ', '01310100'],
    ['013101009999', '01310100'],
    ['', ''],
  ])('normaliza "%s" em "%s"', (entrada, esperado) => {
    expect(sanitizarCep(entrada)).toBe(esperado);
  });

  it('nao quebra sem argumento', () => {
    expect(sanitizarCep()).toBe('');
  });
});

describe('formatarCep', () => {
  it.each([
    ['01310100', '01310-100'],
    ['01310-100', '01310-100'],
    ['0131', '0131'],
    ['01310', '01310'],
    ['013101', '01310-1'],
  ])('formata "%s" como "%s"', (entrada, esperado) => {
    expect(formatarCep(entrada)).toBe(esperado);
  });
});

describe('validarCep', () => {
  it.each([['01310100'], ['01310-100']])('aceita "%s"', (cep) => {
    expect(validarCep(cep)).toBe(true);
  });

  it.each([['0131010'], [''], ['abcdefgh']])('recusa "%s"', (cep) => {
    expect(validarCep(cep)).toBe(false);
  });

  it('aceita digitos a mais, porque o CEP e truncado em 8 digitos', () => {
    expect(validarCep('013101009')).toBe(true);
  });
});

describe('calcularFrete', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    mockarSessao();
  });

  it('devolve as opcoes junto com o CEP formatado e limpo', async () => {
    global.fetch.mockResolvedValue(criarResposta({ body: { opcoes: [OPCAO_PAC] } }));

    await expect(calcularFrete('20040-020', [ITEM])).resolves.toEqual({
      cep: '20040-020',
      cepLimpo: '20040020',
      opcoes: [OPCAO_PAC],
    });
  });

  it('envia o CEP de origem fixo e o destino limpo', async () => {
    global.fetch.mockResolvedValue(criarResposta({ body: { opcoes: [OPCAO_PAC] } }));

    await calcularFrete('20040-020', [ITEM]);

    expect(corpoEnviado()).toMatchObject({
      cep_origem: CEP_ORIGEM_PADRAO,
      cep_destino: '20040020',
    });
  });

  it('normaliza os itens do carrinho para o formato do backend', async () => {
    global.fetch.mockResolvedValue(criarResposta({ body: { opcoes: [OPCAO_PAC] } }));

    await calcularFrete('20040020', [ITEM]);

    expect(corpoEnviado().produtos).toEqual([{
      id: 10,
      peso_gramas: 800,
      comprimento_mm: 200,
      largura_mm: 150,
      altura_mm: 100,
      preco: 350,
      quantidade: 2,
    }]);
  });

  it('aplica medidas padrao para itens sem dimensoes cadastradas', async () => {
    global.fetch.mockResolvedValue(criarResposta({ body: { opcoes: [OPCAO_PAC] } }));

    await calcularFrete('20040020', [{ id: 11 }]);

    expect(corpoEnviado().produtos[0]).toEqual({
      id: 11,
      peso_gramas: 1000,
      comprimento_mm: 200,
      largura_mm: 150,
      altura_mm: 100,
      preco: 0,
      quantidade: 1,
    });
  });

  it('envia o token de autenticacao no cabecalho', async () => {
    global.fetch.mockResolvedValue(criarResposta({ body: { opcoes: [OPCAO_PAC] } }));

    await calcularFrete('20040020', [ITEM]);

    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token-de-teste');
  });

  it.each([['0131010'], [''], ['abcdefgh']])(
    'recusa o CEP invalido "%s" sem chamar a API',
    async (cep) => {
      await expect(calcularFrete(cep, [ITEM])).rejects.toThrow(
        'Informe um CEP válido com 8 dígitos.',
      );
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it.each([[[]], [null], ['friso']])(
    'recusa o carrinho invalido %p sem chamar a API',
    async (itens) => {
      await expect(calcularFrete('20040020', itens)).rejects.toThrow(
        'Adicione itens ao carrinho antes de calcular o frete.',
      );
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it('avisa quando nenhuma transportadora atende o CEP', async () => {
    global.fetch.mockResolvedValue(criarResposta({ body: { opcoes: [] } }));

    await expect(calcularFrete('20040020', [ITEM])).rejects.toThrow(
      'Nenhuma opção de frete disponível para este CEP.',
    );
  });

  it('propaga a mensagem de erro do backend', async () => {
    global.fetch.mockResolvedValue(respostaDeErro(400, { error: 'CEP de destino inválido.' }));

    await expect(calcularFrete('20040020', [ITEM])).rejects.toThrow('CEP de destino inválido.');
  });

  it('exige sessao ativa antes de chamar a API', async () => {
    mockarSessao({ data: { session: null }, error: null });

    await expect(calcularFrete('20040020', [ITEM])).rejects.toThrow(
      'Você precisa estar autenticado para continuar.',
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('pede novo login quando o Supabase falha ao ler a sessao', async () => {
    mockarSessao({ data: null, error: { message: 'session not found' } });

    await expect(calcularFrete('20040020', [ITEM])).rejects.toThrow(
      'Você precisa entrar novamente para continuar.',
    );
  });
});

describe('aplicarCupom', () => {
  it.each([
    ['BIGPECAS10', { tipo: 'percentual', valor: 0.1 }],
    ['FRETE0', { tipo: 'frete_gratis', valor: 1.0 }],
  ])('aceita o cupom %s', async (codigo, esperado) => {
    await expect(aplicarCupom(codigo, 500)).resolves.toMatchObject({ codigo, ...esperado });
  });

  it.each([['bigpecas10'], ['  BigPecas10  ']])(
    'normaliza o codigo digitado como "%s"',
    async (codigo) => {
      await expect(aplicarCupom(codigo, 500)).resolves.toMatchObject({ codigo: 'BIGPECAS10' });
    },
  );

  it('aplica o cupom de primeira compra quando o subtotal atinge o minimo', async () => {
    await expect(aplicarCupom('PRIMEIRA20', 200)).resolves.toMatchObject({
      codigo: 'PRIMEIRA20',
      valor: 0.2,
      minimo: 200,
    });
  });

  it('recusa o cupom de primeira compra abaixo do subtotal minimo', async () => {
    await expect(aplicarCupom('PRIMEIRA20', 199.99)).rejects.toThrow(
      'Subtotal mínimo de R$ 200.00 para usar este cupom.',
    );
  });

  it.each([['INVALIDO'], [''], [null], [undefined]])(
    'recusa o cupom %p',
    async (codigo) => {
      await expect(aplicarCupom(codigo, 500)).rejects.toThrow('Cupom inválido ou expirado.');
    },
  );
});
