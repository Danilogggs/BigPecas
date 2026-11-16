import i18n from 'i18next';
import '../../contexts/LanguageContext';
import {
  currentLocale, formatCurrency, formatDateTime, formatNumber, formatPercent, localeFor, regionalCurrencyFor,
} from '../intl';
import { formatarMoedaCarrinho, nomeFormaPagamento, descricaoFormaPagamento } from '../../features/carrinho/presentation/carrinhoPresentation';
import { formatarMoeda, formatarDataPedido, obterMetaStatus } from '../../features/pedidos/presentation/pedidoPresentation';
import { chaveCondicaoPeca, formatarDataPeca, formatarPrecoPeca } from '../../features/pecas/presentation/pecaPresentation';
import { formatarDataNotificacao } from '../../features/notificacoes/presentation/notificacaoPresentation';
import { FORMAS_PAGAMENTO } from '../../features/carrinho/domain/carrinho';

afterEach(() => i18n.changeLanguage('PTBR'));

describe('locale por idioma', () => {
  test('mapeia idiomas para locale e moeda regional', () => {
    expect(localeFor('PTBR')).toBe('pt-BR');
    expect(localeFor('EN')).toBe('en-US');
    expect(localeFor('FR')).toBe('fr-FR');
    expect(localeFor('XX')).toBe('pt-BR');
    expect(regionalCurrencyFor('EN')).toBe('USD');
    expect(regionalCurrencyFor('FR')).toBe('EUR');
    expect(regionalCurrencyFor()).toBe('BRL');
  });

  test('acompanha o idioma ativo do i18next', () => {
    i18n.changeLanguage('EN');
    expect(currentLocale()).toBe('en-US');
    expect(formatNumber(1234.5)).toBe('1,234.5');
    i18n.changeLanguage('FR');
    expect(formatNumber(1234.5)).toMatch(/1\s234,5/);
    i18n.changeLanguage('PTBR');
    expect(formatNumber(1234.5)).toBe('1.234,5');
  });
});

describe('formatadores', () => {
  const data = new Date(2026, 0, 31, 14, 5);

  test('datas mudam de ordem conforme o idioma', () => {
    const opcoes = { day: '2-digit', month: '2-digit', year: 'numeric' };
    expect(formatDateTime(data, opcoes, 'pt-BR')).toBe('31/01/2026');
    expect(formatDateTime(data, opcoes, 'en-US')).toBe('01/31/2026');
    expect(formatDateTime(data.toISOString(), opcoes, 'fr-FR')).toBe('31/01/2026');
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime('')).toBe('');
    expect(formatDateTime('invalida')).toBe('');
  });

  test('numeros, percentuais e moedas', () => {
    expect(formatNumber('x')).toBe('');
    expect(formatPercent(12.5, {}, 'pt-BR')).toBe('12,5%');
    expect(formatPercent(12.5, {}, 'en-US')).toBe('12.5%');
    expect(formatPercent('x')).toBe('');
    expect(formatCurrency(10, 'USD', 'en-US')).toBe('$10.00');
    expect(formatCurrency(10, 'EUR', 'fr-FR')).toMatch(/10,00\s€/);
    expect(formatCurrency('abc', 'BRL', 'pt-BR')).toMatch(/R\$\s0,00/);
    expect(formatCurrency(null, 'BRL', 'en-US')).toBe('R$0.00');
  });
});

describe('apresentacao localizada', () => {
  test('moeda do carrinho e dos pedidos usa o locale', () => {
    expect(formatarMoedaCarrinho(1500, 'en-US')).toBe('R$1,500.00');
    expect(formatarMoeda(1500, 'pt-BR')).toMatch(/R\$\s1\.500,00/);
    i18n.changeLanguage('EN');
    expect(formatarMoeda(2)).toBe('R$2.00');
  });

  test('formas de pagamento sao traduzidas por id', () => {
    const t = (key) => `t:${key}`;
    expect(nomeFormaPagamento(FORMAS_PAGAMENTO[0], t)).toBe('t:pixPayment');
    expect(descricaoFormaPagamento(FORMAS_PAGAMENTO[2], t)).toBe('t:bankSlipDescription');
    expect(nomeFormaPagamento({ id: 'outro', nome: 'Vale' }, t)).toBe('t:Vale');
    expect(descricaoFormaPagamento({ id: 'outro', descricao: 'd' }, t)).toBe('t:d');
    expect(nomeFormaPagamento(null, t)).toBe('t:');
    expect(descricaoFormaPagamento(undefined, t)).toBe('t:');
  });

  test('precos e datas de pecas', () => {
    expect(formatarPrecoPeca(null)).toBe('Preço não informado');
    expect(formatarPrecoPeca('', 'N/I')).toBe('N/I');
    expect(formatarPrecoPeca('sob consulta')).toBe('sob consulta');
    expect(formatarPrecoPeca(10, '', 'EUR', 'fr-FR')).toMatch(/10,00\s€/);
    const formatar = jest.fn(() => 'data');
    expect(formatarDataPeca('2026-01-01', formatar)).toBe('data');
    expect(formatarDataPeca('', formatar)).toBe('');
    expect(chaveCondicaoPeca('Aceitável')).toBe('conditionAcceptable');
    expect(chaveCondicaoPeca('raridade')).toBe('raridade');
    expect(chaveCondicaoPeca()).toBeUndefined();
  });

  test('datas de pedidos e notificacoes', () => {
    const formatar = jest.fn(() => 'data');
    expect(formatarDataPedido('2026-01-01', formatar)).toBe('data');
    expect(formatarDataPedido(null, formatar)).toBe('');
    expect(formatarDataNotificacao('2026-01-31T10:00:00', 'en-US')).toMatch(/^01\/31\/2026/);
    expect(formatarDataNotificacao(null)).toBe('');
  });

  test('status de pedido conhecido e desconhecido', () => {
    const t = (key) => key;
    expect(obterMetaStatus('pago', t).label).toBe('paid');
    expect(obterMetaStatus('xyz', t)).toMatchObject({ label: 'unknownStatus', ordem: 99 });
  });
});
