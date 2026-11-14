import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import CadastroPecas from '../CadastroPecas';
import { cadastrarPeca, listarCategorias, listarMateriais, verificarOemNoCatalogo } from '../../services/pecasService';
import { buscarPerfilUsuario, salvarPerfilUsuario } from '../../services/usuarioService';
import { currentLocation, renderPage } from '../../../jest/helpers/render';

jest.mock('../../components/Header', () => () => <header>Cabeçalho</header>);
jest.mock('../../services/pecasService', () => ({
  cadastrarPeca: jest.fn(), listarCategorias: jest.fn(), listarMateriais: jest.fn(), verificarOemNoCatalogo: jest.fn(),
}));
jest.mock('../../services/usuarioService', () => ({ buscarPerfilUsuario: jest.fn(), salvarPerfilUsuario: jest.fn() }));
const mockRecognize = jest.fn();
const mockTerminate = jest.fn();
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn(async () => ({ recognize: mockRecognize, terminate: mockTerminate })),
}), { virtual: true });

const perfilLoja = { full_name: 'Ana', nome_loja: 'Loja da Ana', descricao_loja: 'Peças originais de época' };
const campo = (name) => document.querySelector(`[name="${name}"]`);
const mudar = (name, value) => fireEvent.change(campo(name), { target: { value } });

beforeEach(() => {
  buscarPerfilUsuario.mockResolvedValue(perfilLoja);
  salvarPerfilUsuario.mockResolvedValue({ nome_loja: 'Nova Loja', descricao_loja: 'Descrição longa da loja' });
  listarCategorias.mockResolvedValue([{ id: 1, nome: 'Motor' }, { id: 2, nome: 'Outros' }]);
  listarMateriais.mockResolvedValue([{ id: 3, nome: 'Aço' }]);
  verificarOemNoCatalogo.mockImplementation(async (oem) => ({ found: true, oem, fonte: 'catalogo' }));
  cadastrarPeca.mockResolvedValue({ id: 10 });
  mockRecognize.mockResolvedValue({ data: { text: 'REF 1H0407151A\nLOTE 12345' } });
  mockTerminate.mockResolvedValue();
});

function preencherBasico() {
  mudar('nome_peca', 'Friso cromado');
  mudar('sku', 'friso-001');
  mudar('num_serie', 'sn 123');
  mudar('material_id', '3');
  mudar('preco', '199,90');
  mudar('estoque_atual', '2');
  mudar('comprimento_mm', '10');
  mudar('largura_mm', '20');
  mudar('altura_mm', '30');
  mudar('peso_gramas', '400');
  mudar('detalhes_gravacao', 'Gravação de fábrica');
  mudar('historico_proveniencia', 'Garagem do colecionador');
  mudar('url_video', 'https://x/v.mp4');
}

async function enviarImagem(arquivo = new File(['abc'], 'peca.png', { type: 'image/png' })) {
  await act(async () => { fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [arquivo] } }); });
  await waitFor(() => expect(document.querySelector('img[src^="data:"]')).not.toBeNull());
}

test('configura a loja antes do primeiro cadastro', async () => {
  buscarPerfilUsuario.mockResolvedValue({ full_name: 'Ana' });
  renderPage(<CadastroPecas />);
  expect(await screen.findByText(/Antes de anunciar/)).toBeInTheDocument();
  fireEvent.submit(campo('nome_loja').closest('form'));
  expect(document.body.textContent).toMatch(/loja/i);
  mudar('nome_loja', '@@');
  mudar('descricao_loja', 'curta');
  fireEvent.submit(campo('nome_loja').closest('form'));
  salvarPerfilUsuario.mockRejectedValueOnce(new Error('falha ao salvar loja'));
  mudar('nome_loja', 'Nova Loja');
  mudar('descricao_loja', 'Descrição longa da loja');
  fireEvent.submit(campo('nome_loja').closest('form'));
  expect(await screen.findByText('falha ao salvar loja')).toBeInTheDocument();
  salvarPerfilUsuario.mockResolvedValueOnce({});
  fireEvent.submit(campo('nome_loja').closest('form'));
  expect(await screen.findByText(/Nova Loja/)).toBeInTheDocument();
  expect(salvarPerfilUsuario).toHaveBeenLastCalledWith(expect.objectContaining({ tipo_usuario: 'ambos', nome_loja: 'Nova Loja' }));
});

test('erro ao verificar loja permite tentar novamente', async () => {
  buscarPerfilUsuario.mockRejectedValueOnce(new Error('offline'));
  renderPage(<CadastroPecas />);
  fireEvent.click(await screen.findByText('Tentar novamente'));
  expect(await screen.findByText(/Loja da Ana/)).toBeInTheDocument();
});

test('valida campos e cadastra peca da categoria Outros sem OEM', async () => {
  renderPage(<CadastroPecas />);
  await waitFor(() => expect(campo('categoria_id').querySelectorAll('option').length).toBe(3));
  fireEvent.submit(campo('nome_peca').closest('form'));
  expect(screen.getByText('Informe o nome da peça.')).toBeInTheDocument();
  expect(screen.getByText('Selecione a categoria da peça.')).toBeInTheDocument();

  mudar('nome_peca', '!');
  mudar('sku', '!!');
  mudar('num_serie', '!!');
  mudar('preco', 'abc');
  mudar('estoque_atual', '1.5');
  mudar('comprimento_mm', 'x');
  mudar('largura_mm', 'x');
  mudar('altura_mm', 'x');
  mudar('peso_gramas', 'x');
  mudar('categoria_id', '1');
  fireEvent.submit(campo('nome_peca').closest('form'));
  expect(screen.getByText('Leia o OEM pela imagem antes de cadastrar.')).toBeInTheDocument();
  expect(screen.getByText('O estoque deve ser um número inteiro.')).toBeInTheDocument();
  mudar('preco', '0');
  fireEvent.submit(campo('nome_peca').closest('form'));
  expect(screen.getByText('O preço deve ser maior que zero.')).toBeInTheDocument();

  mudar('categoria_id', '2');
  expect(screen.getByText('Para a categoria Outros, o número OEM é opcional.')).toBeInTheDocument();
  preencherBasico();
  mudar('condicao', 'NOS');
  fireEvent.submit(campo('nome_peca').closest('form'));
  expect(await screen.findByText('Peça cadastrada com sucesso!')).toBeInTheDocument();
  expect(cadastrarPeca).toHaveBeenCalledWith(expect.objectContaining({ sku: 'FRISO-001', preco: '199.90', oem_number: '', num_serie: 'SN123' }));
});

test('le OEM da imagem, valida no catalogo e cadastra', async () => {
  renderPage(<CadastroPecas />);
  await waitFor(() => expect(campo('categoria_id').querySelectorAll('option').length).toBe(3));
  mudar('categoria_id', '1');
  preencherBasico();
  await enviarImagem();
  fireEvent.click(screen.getByText(/Ler OEM|OEM da imagem/i));
  await waitFor(() => expect(campo('oem_number').value).toBe('1H0407151A'));
  await waitFor(() => expect(verificarOemNoCatalogo).toHaveBeenCalledWith('1H0407151A'));
  expect(mockTerminate).toHaveBeenCalled();

  mudar('oem_number', '1H0407151B');
  fireEvent.submit(campo('nome_peca').closest('form'));
  expect(screen.getByText('Valide o OEM extraído na API externa antes de cadastrar.')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Revalidar OEM na API externa'));
  await waitFor(() => expect(verificarOemNoCatalogo).toHaveBeenLastCalledWith('1H0407151B'));
  await waitFor(() => expect(screen.getByText('Revalidar OEM na API externa')).toBeInTheDocument());

  cadastrarPeca.mockRejectedValueOnce(new Error('Confirme seu e-mail antes de cadastrar peças.'));
  fireEvent.submit(campo('nome_peca').closest('form'));
  expect(await screen.findByText('Confirmação de e-mail necessária')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button').find((botao) => /Entendi|OK|Fechar/i.test(botao.textContent)));

  cadastrarPeca.mockRejectedValueOnce(new Error('Configure o nome e a descrição da sua loja.'));
  fireEvent.submit(campo('nome_peca').closest('form'));
  expect(await screen.findByText(/Antes de anunciar/)).toBeInTheDocument();
});

test('falhas de OCR, catalogo e cadastro generico', async () => {
  renderPage(<CadastroPecas />);
  await waitFor(() => expect(campo('categoria_id').querySelectorAll('option').length).toBe(3));
  mudar('categoria_id', '1');
  await enviarImagem();
  mockRecognize.mockResolvedValueOnce({ data: { text: 'sem codigo' } });
  fireEvent.click(screen.getByText(/Ler OEM|OEM da imagem/i));
  expect(await screen.findByText(/Nenhum|não encontr/i)).toBeInTheDocument();

  verificarOemNoCatalogo.mockRejectedValueOnce(new Error('API fora do ar'));
  fireEvent.click(screen.getByText(/Ler OEM|OEM da imagem/i));
  expect(await screen.findByText('API fora do ar')).toBeInTheDocument();

  verificarOemNoCatalogo.mockResolvedValueOnce({ found: false, oem: 'X' });
  fireEvent.click(screen.getByText('Revalidar OEM na API externa'));
  expect(await screen.findByText('Referência não encontrada neste catálogo')).toBeInTheDocument();

  mockRecognize.mockRejectedValueOnce(new Error('ocr'));
  mockTerminate.mockRejectedValueOnce(new Error('x'));
  fireEvent.click(screen.getByText(/Ler OEM|OEM da imagem/i));
  expect(await screen.findByText(/Não foi possível ler/i)).toBeInTheDocument();

  fireEvent.click(screen.getByText('Remover imagem'));
  expect(document.querySelector('img[src^="data:"]')).toBeNull();

  mudar('categoria_id', '2');
  preencherBasico();
  cadastrarPeca.mockRejectedValueOnce(new Error('Erro inesperado no servidor'));
  fireEvent.submit(campo('nome_peca').closest('form'));
  expect(await screen.findByText('Erro inesperado no servidor')).toBeInTheDocument();
});

test('rejeita imagens invalidas e limpa selecao', async () => {
  listarCategorias.mockRejectedValueOnce(new Error('sem opções'));
  renderPage(<CadastroPecas />, { language: 'EN' });
  expect(await screen.findByText('sem opções')).toBeInTheDocument();
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [new File(['x'], 'a.gif', { type: 'image/gif' })] } });
  expect(screen.getByText('Select an image in JPG, PNG or WEBP format.')).toBeInTheDocument();
  const grande = new File(['x'], 'b.png', { type: 'image/png' });
  Object.defineProperty(grande, 'size', { value: 3 * 1024 * 1024 });
  fireEvent.change(input, { target: { files: [grande] } });
  expect(screen.getAllByText(/2MB/).length).toBeGreaterThan(1);
  fireEvent.change(input, { target: { files: [] } });
  fireEvent.click(screen.getByText(/Your parts/i));
  expect(currentLocation(screen)).toBe('/editar-pecas');
});

test('navegacao pelo breadcrumb e voltar ao catalogo', async () => {
  renderPage(<CadastroPecas />);
  await screen.findByText(/Loja da Ana/);
  fireEvent.click(screen.getByText(/Voltar ao catálogo/));
  expect(currentLocation(screen)).toBe('/buscaPecas');
  fireEvent.click(screen.getByText('Início'));
  expect(currentLocation(screen)).toBe('/');
});
