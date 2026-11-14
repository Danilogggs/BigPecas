import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { CurrencyProvider } from '../../contexts/CurrencyContext';
import {
  AlertError, AlertSuccess, ButtonPrimary, ButtonSecondary, Field, Input, Label, Select, TextArea,
} from '../StyledComponents';
import * as Icons from '../Icons';
import CondicaoPeca from '../CondicaoPeca';
import Money from '../Money';
import CurrencySelector from '../CurrencySelector';
import LanguageSwitcher from '../LanguageSwitcher';
import PecasList from '../PecasList';
import ProductCard from '../ProductCard';

const wrap = (ui) => render(<LanguageProvider><MemoryRouter>{ui}</MemoryRouter></LanguageProvider>);

describe('StyledComponents', () => {
  test('renderiza controles e trata hover', () => {
    const onClick = jest.fn();
    wrap(<>
      <ButtonPrimary onClick={onClick}>Primário</ButtonPrimary>
      <ButtonPrimary disabled>Desabilitado</ButtonPrimary>
      <ButtonSecondary onClick={onClick}>Secundário</ButtonSecondary>
      <Input name="a" placeholder="Buscar" value="" onChange={() => {}} />
      <Input name="b" value="" onChange={() => {}} />
      <Select name="s" value="1" onChange={() => {}}><option value="1">um</option></Select>
      <TextArea name="t" placeholder="Buscar" value="" onChange={() => {}} />
      <TextArea name="t2" value="" onChange={() => {}} />
      <Label required>Nome</Label>
      <Label><span>nó</span></Label>
      <Field label="Preço" required><span>campo</span></Field>
      <AlertSuccess>ok</AlertSuccess>
      <AlertError>erro</AlertError>
    </>);
    const primario = screen.getByText('Primário');
    fireEvent.mouseEnter(primario);
    expect(primario.style.opacity).toBe('0.9');
    fireEvent.mouseLeave(primario);
    expect(primario.style.opacity).toBe('1');
    fireEvent.click(primario);
    const desabilitado = screen.getByText('Desabilitado');
    fireEvent.mouseEnter(desabilitado);
    fireEvent.mouseLeave(desabilitado);
    expect(desabilitado.style.opacity).toBe('0.7');
    const secundario = screen.getByText('Secundário');
    fireEvent.mouseEnter(secundario);
    expect(secundario.style.backgroundColor).toBe('var(--bp-surface-muted)');
    fireEvent.mouseLeave(secundario);
    expect(secundario.style.backgroundColor).toBe('transparent');
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getAllByPlaceholderText('Buscar')).toHaveLength(2);
    expect(screen.getAllByText('*')).toHaveLength(2);
    expect(screen.getByText('ok')).toBeInTheDocument();
    expect(screen.getByText('erro')).toBeInTheDocument();
  });
});

test('icones aceitam tamanho, classe e preenchimento', () => {
  const { container } = render(<>
    {['SearchIcon', 'WrenchIcon', 'BoltIcon', 'StarIcon', 'UserIcon', 'ChevronDownIcon', 'TrashIcon'].map((nome) => {
      const Icone = Icons[nome];
      return <Icone key={nome} size={10} className="x" />;
    })}
    <Icons.AppIcon name="cart" filled />
    <Icons.AppIcon name="desconhecido" />
    <Icons.SearchIcon />
  </>);
  expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(10);
  expect(container.querySelector('svg[fill="currentColor"]')).not.toBeNull();
});

test('condicao NOS exibe explicacao e outras condicoes sao traduzidas', () => {
  localStorage.setItem('bigpecas-language', 'EN');
  wrap(<><CondicaoPeca condicao="NOS" alinharFim /><span>|</span><CondicaoPeca condicao="usado" /></>);
  const dica = screen.getByRole('button');
  fireEvent.click(dica);
  expect(dica.className).toContain('bp-tooltip--end');
  expect(document.body.textContent).toContain('|Used');
});

describe('moeda e idioma', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ moeda: 'BRL', unidades_por_brl: 1 }, { moeda: 'USD', unidades_por_brl: 0.2 }] });
  });

  test('Money converte com provider e formata sem provider', async () => {
    render(<LanguageProvider><span data-testid="sem">{<Money value={12} />}</span></LanguageProvider>);
    expect(screen.getByTestId('sem').textContent).toMatch(/R\$\s?12,00/);
    localStorage.setItem('bigpecas-language', 'EN');
    render(<LanguageProvider><CurrencyProvider><span data-testid="com"><Money value={100} currency={null} /></span></CurrencyProvider></LanguageProvider>);
    expect(await screen.findByText('$20.00')).toBeInTheDocument();
  });

  test('seletores trocam moeda e idioma', async () => {
    render(<LanguageProvider><CurrencyProvider><CurrencySelector /><LanguageSwitcher /><Money value={100} /></CurrencyProvider></LanguageProvider>);
    await screen.findByRole('option', { name: 'USD' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Moeda de exibição' }), { target: { value: 'USD' } });
    expect(localStorage.getItem('bigpecas-currency')).toBe('USD');
    expect(screen.getByText(/US\$\s?20,00/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Idioma' }), { target: { value: 'FR' } });
    expect(document.documentElement.lang).toBe('fr');
    expect(screen.getByText(/20,00\s?\$US/)).toBeInTheDocument();
  });

  test('CurrencySelector nao renderiza sem provider', () => {
    const { container } = render(<LanguageProvider><CurrencySelector /></LanguageProvider>);
    expect(container).toBeEmptyDOMElement();
  });
});

test('PecasList lista, filtra e seleciona pecas', () => {
  const onSelect = jest.fn();
  const setQuery = jest.fn();
  const pecas = [{ id: 1, nome_peca: 'Farol', sku: 'F-1', preco: 100 }, { id: 2, nome_peca: 'Roda', sku: 'R-1', preco_base: 50, moeda_base: 'USD' }];
  const { rerender } = wrap(<PecasList pecas={pecas} filteredPecas={pecas} pecasSearchQuery="" setPecasSearchQuery={setQuery} selectedPecaId={1} onSelectPeca={onSelect} />);
  fireEvent.click(screen.getByText('Roda'));
  expect(onSelect).toHaveBeenCalledWith(2);
  fireEvent.change(screen.getByPlaceholderText('Buscar por nome ou SKU...'), { target: { value: 'x' } });
  expect(setQuery).toHaveBeenCalledWith('x');
  expect(screen.getByText(/R\$\s?100,00/)).toBeInTheDocument();
  rerender(<LanguageProvider><MemoryRouter><PecasList pecas={pecas} filteredPecas={[]} pecasSearchQuery="x" setPecasSearchQuery={setQuery} onSelectPeca={onSelect} /></MemoryRouter></LanguageProvider>);
  expect(screen.getByText('Nenhuma peça encontrada com esses critérios.')).toBeInTheDocument();
  rerender(<LanguageProvider><MemoryRouter><PecasList pecas={[]} filteredPecas={[]} pecasSearchQuery="" setPecasSearchQuery={setQuery} onSelectPeca={onSelect} /></MemoryRouter></LanguageProvider>);
  expect(screen.getByText('Você não tem peças cadastradas ainda.')).toBeInTheDocument();
});

test('ProductCard navega e trata hover e erro de imagem', () => {
  wrap(<ProductCard product={{ image: 'x.png', name: 'Calota', price: 10 }} />);
  const imagem = screen.getByAltText('Calota');
  fireEvent.error(imagem);
  const card = imagem.closest('div').parentElement;
  fireEvent.mouseEnter(card);
  fireEvent.mouseLeave(card);
  fireEvent.click(card);
  screen.getAllByRole('button').forEach((botao) => {
    fireEvent.mouseEnter(botao);
    fireEvent.mouseLeave(botao);
    fireEvent.click(botao);
  });
});
