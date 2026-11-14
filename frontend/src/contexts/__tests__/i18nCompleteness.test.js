/**
 * Garante que todo texto estatico passado para t()/tr() no codigo do frontend
 * tenha traducao em todos os idiomas suportados. Se alguem adicionar um texto
 * novo sem traduzir, este teste lista exatamente o que falta.
 */
import fs from 'fs';
import path from 'path';
import i18n from 'i18next';
import { LANGUAGES } from '../LanguageContext';
import { createAdminTranslator } from '../../features/admin/presentation/adminTranslations';

const SRC = path.resolve(__dirname, '../..');

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : listSourceFiles(full);
    return /\.(js|jsx)$/.test(entry.name) ? [full] : [];
  });
}

const LITERAL = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;

// Extrai os literais do primeiro argumento de t(...) / tr(...), incluindo os
// dois ramos de ternarios como t(cond ? 'a' : 'b').
export function extractKeys(source) {
  const keys = { t: new Set(), tr: new Set() };
  const call = /(?<![\w.])(t|tr)\(\s*/g;
  let match;
  while ((match = call.exec(source))) {
    let depth = 0;
    let index = call.lastIndex;
    let quote = null;
    for (; index < source.length; index += 1) {
      const char = source[index];
      if (quote) {
        if (char === '\\') index += 1;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === '\'' || char === '"' || char === '`') { quote = char; continue; }
      if (char === '(' || char === '{' || char === '[') depth += 1;
      else if (char === ')' || char === '}' || char === ']') {
        if (depth === 0) break;
        depth -= 1;
      } else if (char === ',' && depth === 0) break;
    }
    const argument = source.slice(call.lastIndex, index).trim();
    const onlyLiterals = /^(?:[^'"`]*?\?\s*)?(['"])/.test(argument) && !argument.includes('`');
    if (!onlyLiterals) continue;
    for (const literal of argument.matchAll(LITERAL)) {
      const key = (literal[1] ?? literal[2]).replace(/\\'/g, '\'');
      if (key.trim()) keys[match[1]].add(key);
    }
  }
  return keys;
}

const files = listSourceFiles(SRC);
const allKeys = { t: new Set(), tr: new Set() };
files.forEach((file) => {
  const found = extractKeys(fs.readFileSync(file, 'utf8'));
  found.t.forEach((key) => allKeys.t.add(key));
  found.tr.forEach((key) => allKeys.tr.add(key));
});

describe('completude das traducoes', () => {
  test('encontra textos traduziveis no codigo', () => {
    expect(allKeys.t.size).toBeGreaterThan(300);
    expect(allKeys.tr.size).toBeGreaterThan(50);
  });

  test.each([LANGUAGES.EN, LANGUAGES.FR])('todos os textos de t() possuem traducao em %s', (language) => {
    const bundle = i18n.getResourceBundle(language, 'translation');
    const missing = [...allKeys.t].filter((key) => !(key in bundle)).sort();
    expect(missing).toEqual([]);
  });

  test.each([LANGUAGES.EN, LANGUAGES.FR])('todos os textos do painel admin (tr) possuem traducao em %s', (language) => {
    const bundle = i18n.getResourceBundle(language, 'translation');
    const translate = createAdminTranslator(language);
    const missing = [...allKeys.tr].filter((key) => translate(key) === key && !(key in bundle)).sort();
    expect(missing).toEqual([]);
  });

  test('todas as chaves semanticas do portugues existem nos demais idiomas', () => {
    const base = i18n.getResourceBundle(LANGUAGES.PTBR, 'translation');
    [LANGUAGES.EN, LANGUAGES.FR].forEach((language) => {
      const bundle = i18n.getResourceBundle(language, 'translation');
      expect(Object.keys(base).filter((key) => !(key in bundle))).toEqual([]);
    });
  });

  test('extrai literais simples, ternarios e ignora chaves dinamicas', () => {
    const keys = extractKeys("t('a'); t(x ? 'b' : \"c\"); t(variavel); t(`d${x}`); tr('e', { n: f('z') }); obj.t('nao')");
    expect([...keys.t].sort()).toEqual(['a', 'b', 'c']);
    expect([...keys.tr]).toEqual(['e']);
  });
});
