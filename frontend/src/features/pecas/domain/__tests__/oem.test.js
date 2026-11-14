import {
  calcularSimilaridadeOem, compararOemComImagem, extrairCandidatosOem, normalizarOem,
} from '../oem';

describe('oem', () => {
  test('normaliza removendo simbolos e espacos', () => {
    expect(normalizarOem(' ab-12 /c ')).toBe('AB12C');
    expect(normalizarOem()).toBe('');
  });

  test('extrai candidatos priorizando codigos alfanumericos de 10 caracteres', () => {
    const candidatos = extrairCandidatosOem('Peca original\nREF 1H0 407 151 A\nlote 12345\r\nXX');
    expect(candidatos[0]).toHaveLength(10);
    expect(candidatos).toContain('12345');
    expect(candidatos.every((valor) => /\d/.test(valor))).toBe(true);
    expect(extrairCandidatosOem()).toEqual([]);
    expect(extrairCandidatosOem('sem numeros aqui')).toEqual([]);
  });

  test('ordena candidatos empatados pela ordem alfabetica', () => {
    const candidatos = extrairCandidatosOem('99999\n88888');
    expect(candidatos.indexOf('88888')).toBeLessThan(candidatos.indexOf('99999'));
  });

  test('calcula similaridade tolerando confusoes comuns de OCR', () => {
    expect(calcularSimilaridadeOem('ABC123', 'ABC123')).toBe(1);
    expect(calcularSimilaridadeOem('AB0123', 'ABO123')).toBeGreaterThan(0.9);
    expect(calcularSimilaridadeOem('ABC123', 'XYZ789')).toBeLessThan(0.5);
    expect(calcularSimilaridadeOem('', 'ABC')).toBe(0);
    expect(calcularSimilaridadeOem('ABC', '')).toBe(0);
  });

  test('compara OEM com candidatos lidos na imagem', () => {
    expect(compararOemComImagem('', ['ABC'])).toBeNull();
    expect(compararOemComImagem('ABC123')).toBeNull();
    expect(compararOemComImagem('ABC123', ['XYZ', 'ABC123'])).toMatchObject({ reference: 'ABC123', percentage: 100, status: 'compatible' });
    expect(compararOemComImagem('ABC1234567', ['ABC1234568']).status).toBe('possible-correction');
    expect(compararOemComImagem('ABC123', ['ZZZ999']).status).toBe('divergent');
  });
});
