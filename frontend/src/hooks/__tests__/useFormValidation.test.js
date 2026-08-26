import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '../useFormValidation';

const FORM_VALIDO = {
  nome_peca: 'Friso Lateral Opala 1975',
  sku: 'OPALA-FRISO-001',
  oem_number: 'OEM-4521',
  num_serie: 'SER-99A',
  categoria_id: '1',
  material_id: '2',
  preco: '3490.00',
  estoque_atual: '5',
  comprimento_mm: '200',
  largura_mm: '150',
  altura_mm: '100',
  peso_gramas: '800',
  detalhes_gravacao: 'Gravação original da fábrica',
  historico_proveniencia: 'Peça de estoque antigo de concessionária',
};

function validarCom(alteracoes = {}) {
  const { result } = renderHook(() => useFormValidation());
  let valido;

  act(() => {
    valido = result.current.validate({ ...FORM_VALIDO, ...alteracoes });
  });

  return { valido, errors: result.current.errors, result };
}

describe('useFormValidation', () => {
  it('comeca sem erros', () => {
    const { result } = renderHook(() => useFormValidation());

    expect(result.current.errors).toEqual({});
  });

  it('aceita um formulario completo e valido', () => {
    const { valido, errors } = validarCom();

    expect(valido).toBe(true);
    expect(errors).toEqual({});
  });

  describe('nome da peca', () => {
    it.each([['   '], ['']])('exige o preenchimento (%p)', (nome_peca) => {
      expect(validarCom({ nome_peca }).errors.nome_peca).toBe('Informe o nome da peça.');
    });

    it('exige pelo menos 3 caracteres', () => {
      expect(validarCom({ nome_peca: 'AB' }).errors.nome_peca).toMatch(/pelo menos 3 caracteres/);
    });

    it.each([['Friso Lateral'], ['Bloco 4.1 (250cv)'], ['Cabeçote nº 12/A']])(
      'aceita "%s"',
      (nome_peca) => {
        expect(validarCom({ nome_peca }).errors.nome_peca).toBeUndefined();
      },
    );

    it.each([['Friso #1'], ['Peça <script>'], ['Motor @ 250cv']])(
      'recusa simbolos especiais em "%s"',
      (nome_peca) => {
        expect(validarCom({ nome_peca }).errors.nome_peca).toBeDefined();
      },
    );
  });

  describe('SKU', () => {
    it('exige o preenchimento', () => {
      expect(validarCom({ sku: '  ' }).errors.sku).toBe('Informe o SKU da peça.');
    });

    it.each([['opala-friso-001'], ['AB'], ['SKU_001'], ['A'.repeat(31)]])(
      'recusa o formato "%s"',
      (sku) => {
        expect(validarCom({ sku }).errors.sku).toMatch(/SKU inválido/);
      },
    );

    it.each([['OPALA-FRISO-001'], ['ABC'], ['A1-B2']])('aceita "%s"', (sku) => {
      expect(validarCom({ sku }).errors.sku).toBeUndefined();
    });
  });

  describe.each([
    ['oem_number', 'Informe o número OEM.', /Número OEM inválido/],
    ['num_serie', 'Informe o número de série.', /Número de série inválido/],
  ])('%s', (campo, mensagemVazio, formatoInvalido) => {
    it('exige o preenchimento', () => {
      expect(validarCom({ [campo]: '' }).errors[campo]).toBe(mensagemVazio);
    });

    it('recusa formato invalido', () => {
      expect(validarCom({ [campo]: 'oem 4521' }).errors[campo]).toMatch(formatoInvalido);
    });

    it('aceita codigo com dois caracteres', () => {
      expect(validarCom({ [campo]: 'A1' }).errors[campo]).toBeUndefined();
    });
  });

  describe.each([['categoria_id', 'Selecione a categoria da peça.'], ['material_id', 'Selecione o material da peça.']])(
    '%s',
    (campo, mensagem) => {
      it.each([[''], [null], [undefined], [0]])('exige a selecao (valor %p)', (valor) => {
        expect(validarCom({ [campo]: valor }).errors[campo]).toBe(mensagem);
      });
    },
  );

  describe('preco', () => {
    it('exige o preenchimento', () => {
      expect(validarCom({ preco: '  ' }).errors.preco).toBe('Informe o preço da peça.');
    });

    it.each([['3490.00'], ['3490,00'], ['3490'], ['0.50']])('aceita "%s"', (preco) => {
      expect(validarCom({ preco }).errors.preco).toBeUndefined();
    });

    it.each([['3.490,00'], ['R$ 3490'], ['3490.000'], ['abc']])(
      'recusa o formato "%s"',
      (preco) => {
        expect(validarCom({ preco }).errors.preco).toMatch(/Preço inválido/);
      },
    );

    it.each([['0'], ['0.00'], ['0,00']])('recusa o valor zero "%s"', (preco) => {
      expect(validarCom({ preco }).errors.preco).toBe('O preço deve ser maior que zero.');
    });
  });

  describe.each([
    ['estoque_atual', 'Informe o estoque atual.', 'O estoque deve ser um número inteiro.'],
    ['comprimento_mm', 'Informe o comprimento.', 'O comprimento deve ser um número inteiro.'],
    ['largura_mm', 'Informe a largura.', 'A largura deve ser um número inteiro.'],
    ['altura_mm', 'Informe a altura.', 'A altura deve ser um número inteiro.'],
    ['peso_gramas', 'Informe o peso da peça.', 'O peso deve ser informado apenas em números inteiros.'],
  ])('%s', (campo, mensagemVazio, mensagemFormato) => {
    it('exige o preenchimento', () => {
      expect(validarCom({ [campo]: '   ' }).errors[campo]).toBe(mensagemVazio);
    });

    it.each([['12.5'], ['-3'], ['2kg'], ['abc']])('recusa "%s"', (valor) => {
      expect(validarCom({ [campo]: valor }).errors[campo]).toBe(mensagemFormato);
    });

    it('aceita zero', () => {
      expect(validarCom({ [campo]: '0' }).errors[campo]).toBeUndefined();
    });
  });

  describe.each([
    ['detalhes_gravacao', 'Informe os detalhes de gravação.'],
    ['historico_proveniencia', 'Informe o histórico de procedência.'],
  ])('%s', (campo, mensagem) => {
    it('exige o preenchimento', () => {
      expect(validarCom({ [campo]: '  ' }).errors[campo]).toBe(mensagem);
    });
  });

  it('acumula todos os erros de um formulario vazio', () => {
    const formVazio = Object.fromEntries(Object.keys(FORM_VALIDO).map((campo) => [campo, '']));
    const { valido, errors } = validarCom(formVazio);

    expect(valido).toBe(false);
    expect(Object.keys(errors)).toHaveLength(Object.keys(FORM_VALIDO).length);
  });

  it('limpa os erros anteriores a cada nova validacao', () => {
    const { result } = renderHook(() => useFormValidation());

    act(() => { result.current.validate({ ...FORM_VALIDO, sku: '' }); });
    expect(result.current.errors.sku).toBeDefined();

    act(() => { result.current.validate(FORM_VALIDO); });
    expect(result.current.errors).toEqual({});
  });

  describe('clearFieldError', () => {
    it('limpa apenas o campo informado', () => {
      const { result } = renderHook(() => useFormValidation());

      act(() => { result.current.validate({ ...FORM_VALIDO, sku: '', preco: '' }); });
      act(() => { result.current.clearFieldError('sku'); });

      expect(result.current.errors.sku).toBe('');
      expect(result.current.errors.preco).toBeDefined();
    });
  });

  describe('setErrors', () => {
    it('permite injetar erros vindos do backend', () => {
      const { result } = renderHook(() => useFormValidation());

      act(() => { result.current.setErrors({ sku: 'Este SKU já está em uso.' }); });

      expect(result.current.errors.sku).toBe('Este SKU já está em uso.');
    });
  });
});
