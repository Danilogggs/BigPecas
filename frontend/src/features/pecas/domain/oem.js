const OCR_CONFUSIONS = new Set([
  '0O', 'O0', '1I', 'I1', '1L', 'L1', '5S', 'S5',
  '8B', 'B8', '2Z', 'Z2', '6G', 'G6',
]);

export function normalizarOem(value = '') {
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function pontuarCandidato(value) {
  const hasLetter = /[A-Z]/.test(value);
  const hasNumber = /\d/.test(value);
  let score = 0;

  if (hasLetter && hasNumber && value.length === 10) score += 100;
  if (hasLetter && hasNumber) score += 55;
  if (hasNumber) score += 20;
  score -= Math.abs(value.length - 10) * 3;
  if (!hasLetter) score -= 25;

  return score;
}

export function extrairCandidatosOem(text = '') {
  const candidates = [];
  const upperText = String(text).toUpperCase();

  upperText.split(/\r?\n/).forEach((line) => {
    const tokens = line.match(/[A-Z0-9]+/g) || [];

    tokens.forEach((token, start) => {
      for (let size = 1; size <= Math.min(5, tokens.length - start); size += 1) {
        candidates.push(tokens.slice(start, start + size).join(''));
      }
    });

    candidates.push(...(line.match(/[A-Z0-9][A-Z0-9\-/]{3,49}/g) || []));
  });

  return [...new Set(candidates.map(normalizarOem))]
    .filter((value) => value.length >= 5 && value.length <= 25 && /\d/.test(value))
    .sort((first, second) => (
      pontuarCandidato(second) - pontuarCandidato(first)
      || Math.abs(first.length - 10) - Math.abs(second.length - 10)
      || first.localeCompare(second)
    ));
}

function custoCaractere(first, second) {
  if (first === second) return 0;
  return OCR_CONFUSIONS.has(`${first}${second}`) ? 0.25 : 1;
}

export function calcularSimilaridadeOem(firstValue, secondValue) {
  const first = normalizarOem(firstValue);
  const second = normalizarOem(secondValue);
  if (!first || !second) return 0;

  const rows = Array.from({ length: first.length + 1 }, () =>
    Array(second.length + 1).fill(0));

  for (let row = 0; row <= first.length; row += 1) rows[row][0] = row;
  for (let column = 0; column <= second.length; column += 1) rows[0][column] = column;

  for (let row = 1; row <= first.length; row += 1) {
    for (let column = 1; column <= second.length; column += 1) {
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + custoCaractere(first[row - 1], second[column - 1]),
      );
    }
  }

  return Math.max(0, 1 - rows[first.length][second.length] / Math.max(first.length, second.length));
}

export function compararOemComImagem(oem, candidates = []) {
  if (!normalizarOem(oem) || candidates.length === 0) return null;

  const best = candidates
    .map((reference) => ({ reference, score: calcularSimilaridadeOem(oem, reference) }))
    .sort((first, second) => second.score - first.score)[0];

  return {
    ...best,
    percentage: Math.round(best.score * 100),
    status: best.score === 1 ? 'compatible' : best.score >= 0.78 ? 'possible-correction' : 'divergent',
  };
}
