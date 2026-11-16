import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import AdminPage from '../AdminPage';
import adminGateway from '../../features/admin/infrastructure/adminGateway';
import avaliadorService from '../../services/avaliadorService';
import { currentLocation, renderPage } from '../../../jest/helpers/render';

jest.mock('../../components/Header', () => () => <header>Cabeçalho</header>);
const mockAuth = { getToken: jest.fn(async () => 'tk') };
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../../services/avaliadorService', () => ({ __esModule: true, default: { getPecasPendentes: jest.fn() } }));
jest.mock('../../features/admin/infrastructure/adminGateway', () => ({
  __esModule: true,
  default: Object.fromEntries([
    'carregar', 'salvarPreferencias', 'criarContaAdmin', 'listarUsuarios', 'carregarDadosGerenciais', 'atualizarAdmin',
    'editarUsuario', 'removerUsuarioPermanente', 'listarPecas', 'editarPeca', 'removerPecaPermanente', 'listarPedidos',
    'atualizarPedido', 'listarAvaliacoes', 'editarAvaliacao', 'removerAvaliacao',
  ].map((nome) => [nome, jest.fn()])),
}));

const diasAtras = (dias) => new Date(Date.now() - dias * 86400000).toISOString();
const pedidos = [
  { id: 1, status: 'entregue', total: 1000, criado_em: diasAtras(1), itens: [{ id: 10, nome: 'Farol', quantidade: 2, preco: 500, fornecedor_id: 5, fornecedor_nome: 'Loja A' }] },
  { id: 2, status: 'cancelado', total: 200, criado_em: diasAtras(2), itens: [{ id: 11, nome_peca: 'Roda', quantidade: 1, fornecedor_id: 6 }] },
  { id: 3, status: 'aguardando_pagamento', valor_total: 300, criado_em: diasAtras(3), itens: [] },
  { id: 4, status: 'pago', total: 400, criado_em: diasAtras(40), itens: [{ id: 12, quantidade: 1 }] },
  { id: 5, status: 'entregue', total: 5000, criado_em: diasAtras(35) },
  { id: 6, status: 'xyz', total: 10, criado_em: diasAtras(100) },
];
const dadosGerenciais = {
  pedidos,
  metricas: { pedidos: 3, faturamento: 1000, ticket_medio: 1000, taxa_conclusao: 33, taxa_cancelamento: 33 },
  anteriores: { pedidos: 2, faturamento: 5400, ticket_medio: 2700, taxa_conclusao: 50 },
  status: { entregue: 1, cancelado: 1, aguardando_pagamento: 1 },
  serie: [{ data: '2026-10-26', value: 1000, orders: 1, ticket: 1000 }],
  fornecedores: [{ id: 5, nome: 'Loja A' }],
  reputacao: [{ id: 5, name: 'Loja A', average: 4.5, count: 2 }],
  estoque: [{ id: 1, nome_peca: 'Farol', estoque_atual: 1, sku: 'F1' }, { id: 2, estoque: 0 }, { id: 3, estoque_atual: 20 }],
  usuarios: [{ id: 1, full_name: 'Ana', created_at: diasAtras(1) }, { id: 2, email: 'b@x.com', created_at: diasAtras(5) }],
};
const dashboard = { usuarios: 10, administradores: 2, pecas: 30, pedidos: 6, pedidos_pendentes: 1, avaliacoes: 4 };

function configurar({ widgets = null } = {}) {
  adminGateway.carregar.mockResolvedValue({ admin: { id: 1, full_name: 'Bruna Admin', email: 'b@a.com' }, dashboard, widgets });
  adminGateway.carregarDadosGerenciais.mockImplementation(async (_token, filtros) => ({ ...dadosGerenciais, anteriores: filtros.days === 0 ? null : dadosGerenciais.anteriores }));
  adminGateway.salvarPreferencias.mockResolvedValue({});
  adminGateway.listarUsuarios.mockResolvedValue({ data: [
    { id: 1, full_name: 'Ana', email: 'ana@x.com', created_at: '2026-01-31T12:00:00', is_admin: true, nome_loja: 'Loja A' },
    { id: 2, email: 'bia@x.com', is_admin: false },
  ] });
  adminGateway.listarPecas.mockResolvedValue({ data: [{ id: 7, nome_peca: 'Calota', sku: 'C1', preco: 99.9, estoque_atual: 3 }, { id: 8, nome: 'Outra', oem_number: 'O1', preco_base: 10 }, { id: 9 }] });
  adminGateway.listarPedidos.mockResolvedValue({ data: [{ id: 20, status: 'pago', criado_em: '2026-01-31T12:00:00', comprador_nome: 'Caio', valor_total: 150 }, { id: 21 }] });
  adminGateway.listarAvaliacoes.mockImplementation(async (token, tipo) => ({ data: tipo === 'fornecedores'
    ? [{ id: 30, fornecedor_id: 5, fornecedor_loja: 'Loja A', nota: 5, pedido_id: 1, comentario: 'ótimo', data_avaliacao: '2026-01-31' }, { id: 31, fornecedor_id: 5, nota: 4 }, { id: 32, nota: 3, fornecedor_nome: 'Loja B' }, { id: 33 }]
    : [{ id: 40, peca_nome: 'Farol', nota: 4, descricao: 'bom' }, { id: 41, peca_id: 2 }] }));
  avaliadorService.getPecasPendentes.mockResolvedValue([
    { id: 50, nome_peca: 'Friso', imagem: 'a.png', users: { full_name: 'Loja C' }, preco_base: 50, sku: 'FR' },
    { id: 51, url_video: 'v.mp4', fornecedor_id: 9, oem_number: 'OEM', revisao_avaliacao: 2 },
    { id: 52 },
  ]);
  Object.values(adminGateway).forEach((fn) => { if (!fn.getMockImplementation()) fn.mockResolvedValue({ message: 'Conta criada.' }); });
}

const nav = (nome) => fireEvent.click(within(document.querySelector('.admin-sidebar nav')).getByText(nome));

beforeEach(() => {
  Object.values(adminGateway).forEach((fn) => fn.mockReset());
  configurar();
});

test('mostra estado de carregamento e de erro do painel', async () => {
  let rejeitar;
  adminGateway.carregar.mockImplementation(() => new Promise((_, reject) => { rejeitar = reject; }));
  renderPage(<AdminPage />);
  expect(screen.getByText('Preparando seu painel…')).toBeInTheDocument();
  await waitFor(() => expect(rejeitar).toBeDefined());
  await act(async () => rejeitar(new Error('Sem permissão')));
  expect(await screen.findByText('Acesso não autorizado')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Voltar ao início'));
  expect(currentLocation(screen)).toBe('/');
});

test('visao geral calcula indicadores, filtra e navega pelos atalhos', async () => {
  renderPage(<AdminPage />);
  expect(await screen.findByText('Olá, Bruna.')).toBeInTheDocument();
  await waitFor(() => expect(screen.getAllByText(/R\$\s?1\.000,00/).length).toBeGreaterThan(0));
  expect(screen.getByText('Fluxo de pedidos')).toBeInTheDocument();
  expect(screen.getAllByText('Novo usuário cadastrado')).toHaveLength(2);
  expect(screen.getAllByText(/vs\. período anterior|Sem base comparável/).length).toBeGreaterThan(0);

  const [periodo, status, fornecedor] = document.querySelectorAll('.admin-global-filters select');
  fireEvent.change(periodo, { target: { value: '7' } });
  fireEvent.change(status, { target: { value: 'entregue' } });
  fireEvent.change(fornecedor, { target: { value: '5' } });
  fireEvent.change(periodo, { target: { value: '0' } });
  await waitFor(() => expect(adminGateway.carregarDadosGerenciais).toHaveBeenLastCalledWith('tk', expect.objectContaining({ days: 0 })));
  fireEvent.change(periodo, { target: { value: '365' } });
  fireEvent.change(periodo, { target: { value: '90' } });
  fireEvent.click(screen.getByText('Limpar'));

  fireEvent.click(screen.getByText('Diário'));
  fireEvent.click(screen.getByText('Mensal'));
  fireEvent.change(periodo, { target: { value: '0' } });
  fireEvent.click(screen.getByText('Diário'));
  fireEvent.click(screen.getByText('Semanal'));

  fireEvent.click(screen.getAllByText('→')[0]);
  await waitFor(() => expect(adminGateway.listarPedidos).toHaveBeenCalledWith('tk', 'aguardando_pagamento'));
  nav('Visão geral');
  fireEvent.click((await screen.findAllByText('Novo usuário cadastrado'))[0]);
  await waitFor(() => expect(adminGateway.listarUsuarios).toHaveBeenCalled());
  nav('Visão geral');
  const plataforma = (await screen.findByText('Dimensão atual da base.')).closest('article');
  within(plataforma).getAllByRole('button').forEach((botao) => { fireEvent.click(botao); nav('Visão geral'); });
  const fluxo = screen.getByText('Fluxo de pedidos').closest('article');
  fireEvent.click(within(fluxo).getAllByRole('button')[1]);
  await waitFor(() => expect(adminGateway.listarPedidos).toHaveBeenCalledWith('tk', 'pago'));
});

test('dashboard sem dados gerenciais e em ingles', async () => {
  adminGateway.carregarDadosGerenciais.mockRejectedValue(new Error('x'));
  adminGateway.carregar.mockResolvedValue({ admin: { id: 1, email: 'x@y.com' }, dashboard: {}, widgets: null });
  renderPage(<AdminPage />, { language: 'EN' });
  expect(await screen.findByRole('alert')).toHaveTextContent('x');
  expect(screen.getByText('Admin panel')).toBeInTheDocument();
  expect(screen.queryByText('R$0.00')).not.toBeInTheDocument();
});

test('personaliza o dashboard com todos os widgets', async () => {
  renderPage(<AdminPage />);
  await screen.findByText('Olá, Bruna.');
  fireEvent.click(screen.getByLabelText('Organizar dashboard'));
  expect(screen.getByText('Organize seu dashboard')).toBeInTheDocument();
  const modal = document.querySelector('.admin-customize-modal');
  for (let i = 0; i < 10; i += 1) {
    const ocultos = modal.querySelectorAll('.admin-hidden-widgets button');
    if (!ocultos.length) break;
    fireEvent.click(ocultos[0]);
  }
  expect(modal.querySelectorAll('.admin-hidden-widgets button')).toHaveLength(0);

  const linhas = document.querySelectorAll('.admin-widget-row');
  fireEvent.click(within(linhas[1]).getByLabelText('Mover para cima'));
  fireEvent.click(within(linhas[0]).getByLabelText('Mover para baixo'));
  fireEvent.dragStart(linhas[0]);
  fireEvent.dragOver(linhas[1]);
  fireEvent.drop(linhas[1]);
  fireEvent.dragEnd(linhas[0]);
  const itens = document.querySelectorAll('.admin-layout-item');
  fireEvent.dragStart(itens[0], { dataTransfer: { effectAllowed: '' } });
  fireEvent.dragEnter(itens[1]);
  fireEvent.dragOver(itens[1], { dataTransfer: { dropEffect: '' } });
  fireEvent.drop(itens[1]);
  fireEvent.dragEnd(itens[0]);
  fireEvent.click(within(linhas[2]).getByLabelText('Ocultar indicador'));
  fireEvent.click(within(document.querySelector('.admin-layout-item')).getByLabelText('Ocultar widget'));
  fireEvent.click(document.querySelector('.admin-inline-hidden button'));

  fireEvent.click(within(modal).getByText('Salvar alterações'));
  await waitFor(() => expect(adminGateway.salvarPreferencias).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByText('Organize seu dashboard')).not.toBeInTheDocument());

  fireEvent.click(screen.getByLabelText('Organizar dashboard'));
  fireEvent.click(screen.getByText('Salvar layout'));
  await waitFor(() => expect(adminGateway.salvarPreferencias).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByLabelText('Organizar dashboard'));
  fireEvent.click(screen.getAllByText(/Restaurar padrão/)[0]);
  await waitFor(() => expect(adminGateway.salvarPreferencias).toHaveBeenCalledTimes(3));
  fireEvent.click(screen.getByLabelText('Organizar dashboard'));
  fireEvent.click(within(document.querySelector('.admin-customize-modal')).getByText(/Restaurar padrão/));
  await waitFor(() => expect(adminGateway.salvarPreferencias).toHaveBeenCalledTimes(4));
  fireEvent.click(screen.getByLabelText('Organizar dashboard'));
  fireEvent.click(within(document.querySelector('.admin-customize-modal')).getByText('Cancelar'));
  fireEvent.click(screen.getByLabelText('Organizar dashboard'));
  fireEvent.click(within(document.querySelector('.admin-layout-toolbar')).getAllByRole('button')[1]);
  fireEvent.click(screen.getByLabelText('Organizar dashboard'));
  fireEvent.click(document.querySelector('.admin-customize-modal .admin-modal-close'));
  expect(screen.queryByText('Organize seu dashboard')).not.toBeInTheDocument();
});

test('gerencia usuarios: busca, permissao, edicao e exclusao', async () => {
  renderPage(<AdminPage />);
  await screen.findByText('Olá, Bruna.');
  nav('Usuários');
  expect(await screen.findByText('ana@x.com')).toBeInTheDocument();
  expect(screen.getByText('Sem nome')).toBeInTheDocument();
  expect(screen.getByText('31/01/2026')).toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText(/Buscar usuários/), { target: { value: 'ana' } });
  fireEvent.submit(screen.getByPlaceholderText(/Buscar usuários/).closest('form'));
  await waitFor(() => expect(adminGateway.listarUsuarios).toHaveBeenLastCalledWith('tk', 'ana'));

  adminGateway.atualizarAdmin.mockResolvedValueOnce({});
  fireEvent.click(await screen.findByText('Tornar admin'));
  expect(await screen.findByText('Permissão atualizada.')).toBeInTheDocument();
  fireEvent.click(document.querySelector('.admin-notice button'));
  adminGateway.atualizarAdmin.mockRejectedValueOnce(new Error('não pode'));
  fireEvent.click(screen.getAllByText('Administrador').find((el) => el.tagName === 'BUTTON'));
  expect(await screen.findByText('não pode')).toBeInTheDocument();

  fireEvent.click(screen.getAllByTitle('Editar usuário')[0]);
  const dialog = screen.getByRole('dialog');
  within(dialog).getAllByRole('textbox').forEach((campo, index) => fireEvent.change(campo, { target: { value: `v${index}` } }));
  adminGateway.editarUsuario.mockResolvedValueOnce({});
  fireEvent.submit(dialog.querySelector('form'));
  expect(await screen.findByText('Registro atualizado com sucesso.')).toBeInTheDocument();
  expect(adminGateway.editarUsuario).toHaveBeenCalledWith('tk', 1, expect.objectContaining({ full_name: 'v0' }));

  fireEvent.click(screen.getAllByTitle('Editar usuário')[1]);
  adminGateway.editarUsuario.mockRejectedValueOnce(new Error('erro edição'));
  fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
  expect(await screen.findByText('erro edição')).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('dialog')).getByText('Cancelar'));

  fireEvent.click(screen.getAllByTitle('Excluir permanentemente')[0]);
  fireEvent.click(screen.getByText('Cancelar'));
  fireEvent.click(screen.getAllByTitle('Excluir permanentemente')[0]);
  fireEvent.mouseDown(screen.getByRole('alertdialog'));
  fireEvent.mouseDown(screen.getByRole('alertdialog').parentElement);
  fireEvent.click(screen.getAllByTitle('Excluir permanentemente')[0]);
  adminGateway.removerUsuarioPermanente.mockResolvedValueOnce({});
  fireEvent.click(screen.getByText('Sim, excluir'));
  expect(await screen.findByText('Usuário excluído.')).toBeInTheDocument();
  expect(screen.queryByText('ana@x.com')).not.toBeInTheDocument();

  fireEvent.click(screen.getAllByTitle('Excluir permanentemente')[0]);
  adminGateway.removerUsuarioPermanente.mockRejectedValueOnce(new Error('falha exclusão'));
  fireEvent.click(screen.getByText('Sim, excluir'));
  expect(await screen.findByText('falha exclusão')).toBeInTheDocument();
});

test('cria administrador pelo modal', async () => {
  renderPage(<AdminPage />);
  await screen.findByText('Olá, Bruna.');
  nav('Usuários');
  await screen.findByText('ana@x.com');
  fireEvent.click(screen.getByText(/Novo administrador/));
  let dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getAllByRole('textbox')[0], { target: { value: 'Novo Admin' } });
  adminGateway.criarContaAdmin.mockResolvedValueOnce({ message: 'Conta criada.' });
  fireEvent.submit(dialog.querySelector('form'));
  expect(await screen.findByText('Conta criada.')).toBeInTheDocument();
  await waitFor(() => expect(adminGateway.listarUsuarios).toHaveBeenCalledTimes(2));

  fireEvent.click(screen.getByText(/Novo administrador/));
  dialog = screen.getByRole('dialog');
  adminGateway.criarContaAdmin.mockRejectedValueOnce(new Error('email em uso'));
  fireEvent.submit(dialog.querySelector('form'));
  expect(await screen.findByText('email em uso')).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('dialog')).getByText('Cancelar'));
  fireEvent.click(screen.getByText(/Novo administrador/));
  fireEvent.mouseDown(screen.getByRole('dialog').parentElement);
  fireEvent.click(screen.getByText(/Novo administrador/));
  fireEvent.click(document.querySelector('.admin-modal-close'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  nav('Visão geral');
  fireEvent.click(await screen.findByText(/Novo administrador/));
  adminGateway.criarContaAdmin.mockResolvedValueOnce({ message: 'Conta criada.' });
  fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
  await screen.findByText('Conta criada.');
});

test('gerencia pecas, validacoes e pedidos', async () => {
  renderPage(<AdminPage />);
  await screen.findByText('Olá, Bruna.');
  nav('Peças');
  expect(await screen.findByText('Calota')).toBeInTheDocument();
  expect(screen.getByText('Peça #9')).toBeInTheDocument();
  fireEvent.click(screen.getAllByTitle('Editar peça')[1]);
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Nova' } });
  within(dialog).getAllByRole('spinbutton').forEach((campo) => fireEvent.change(campo, { target: { value: '5' } }));
  adminGateway.editarPeca.mockResolvedValueOnce({});
  fireEvent.submit(dialog.querySelector('form'));
  await screen.findByText('Registro atualizado com sucesso.');
  fireEvent.click(screen.getAllByTitle('Editar peça')[2]);
  fireEvent.click(within(screen.getByRole('dialog')).getByText('×'));
  fireEvent.click(screen.getAllByTitle('Excluir permanentemente')[0]);
  adminGateway.removerPecaPermanente.mockResolvedValueOnce({});
  fireEvent.click(screen.getByText('Sim, excluir'));
  expect(await screen.findByText('Peça removida.')).toBeInTheDocument();

  nav('Validação de peças');
  expect(await screen.findByText('Friso')).toBeInTheDocument();
  expect(screen.getByText('Fornecedor #9')).toBeInTheDocument();
  expect(screen.getByText('Vídeo')).toBeInTheDocument();
  expect(screen.getByText('Sem mídia')).toBeInTheDocument();
  fireEvent.click(screen.getAllByText(/Analisar anúncio/)[0]);
  expect(currentLocation(screen)).toBe('/avaliador/validar/50');
});

test('altera status de pedidos e trata falha de listagem', async () => {
  renderPage(<AdminPage />);
  await screen.findByText('Olá, Bruna.');
  nav('Pedidos');
  expect(await screen.findByText('Caio')).toBeInTheDocument();
  adminGateway.atualizarPedido.mockResolvedValueOnce({});
  fireEvent.change(document.querySelector('select.admin-status'), { target: { value: 'enviado' } });
  expect(await screen.findByText('Status atualizado.')).toBeInTheDocument();
  expect(adminGateway.atualizarPedido).toHaveBeenCalledWith('tk', 20, 'enviado');
  adminGateway.listarPedidos.mockRejectedValueOnce(new Error('pedidos indisponíveis'));
  fireEvent.change(document.querySelector('.admin-data-toolbar select'), { target: { value: 'cancelado' } });
  expect(await screen.findByText('pedidos indisponíveis')).toBeInTheDocument();
  expect(screen.getByText('Nenhum registro encontrado.')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Auditoria'));
  expect(currentLocation(screen)).toBe('/admin/auditoria');
});

test('modera avaliacoes de produtos e fornecedores', async () => {
  renderPage(<AdminPage />);
  await screen.findByText('Olá, Bruna.');
  nav('Avaliações');
  expect(await screen.findByText('Farol')).toBeInTheDocument();
  expect(screen.getByText('Peça #2')).toBeInTheDocument();
  expect(screen.getByText('Sem comentário')).toBeInTheDocument();
  fireEvent.click(screen.getAllByTitle('Editar avaliação')[0]);
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: '5' } });
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'top' } });
  adminGateway.editarAvaliacao.mockResolvedValueOnce({});
  fireEvent.submit(dialog.querySelector('form'));
  await waitFor(() => expect(adminGateway.editarAvaliacao).toHaveBeenCalledWith('tk', 'produtos', 40, { nota: '5', comentario: 'top' }));
  fireEvent.click(screen.getAllByTitle('Excluir avaliação')[0]);
  adminGateway.removerAvaliacao.mockResolvedValueOnce({});
  fireEvent.click(screen.getByText('Sim, excluir'));
  expect(await screen.findByText('Avaliação removida.')).toBeInTheDocument();

  fireEvent.click(screen.getByText('Fornecedores'));
  expect(await screen.findByText('Fornecedores mais bem avaliados')).toBeInTheDocument();
  expect(screen.getByText('4,5')).toBeInTheDocument();
  expect(screen.getAllByText('Loja A').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Fornecedor #—').length).toBeGreaterThan(0);
  nav('Validação de peças');
  fireEvent.click(await screen.findByText(/Configurar checklist/));
  expect(currentLocation(screen)).toBe('/admin/checklist');
});
