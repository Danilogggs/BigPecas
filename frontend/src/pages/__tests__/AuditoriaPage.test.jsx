import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import AuditoriaPage from '../AuditoriaPage';
import auditGateway from '../../features/auditoria/infrastructure/auditGateway';
import { currentLocation, renderPage } from '../../../jest/helpers/render';

jest.mock('../../components/Header', () => () => <header>Cabeçalho</header>);
const mockAuth = { getToken: async () => 'tk' };
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../../features/auditoria/infrastructure/auditGateway', () => ({
  __esModule: true,
  default: { listFunctionalities: jest.fn(), listLogs: jest.fn(), saveFunctionalities: jest.fn(), exportLogs: jest.fn() },
}));

const funcionalidades = [
  { key: 'home', label: 'Página inicial', enabled: true },
  { key: 'chat', label: 'Chat', enabled: false },
];
const logs = [
  { id: 1, created_at: '2026-01-31T10:00:00Z', actor_name: 'Ana', actor_email: 'ana@x.com', functionality_key: 'home', event_type: 'navigation', action: 'Acessou /', page_path: '/', success: true, status_code: 200, metadata: { a: 1 } },
  { id: 2, created_at: '2026-01-31T11:00:00Z', functionality_key: 'desconhecida', event_type: 'outro', action: 'POST', http_method: 'POST', endpoint: '/api/x', success: false },
  { id: 3, created_at: '2026-01-31T12:00:00Z', functionality_key: 'chat', event_type: 'backend', action: 'x', success: true },
  { id: 4, created_at: '2026-01-31T12:00:00Z', functionality_key: 'chat', event_type: 'database', action: 'y', success: false, status_code: 500 },
];

beforeEach(() => {
  auditGateway.listFunctionalities.mockResolvedValue({ data: funcionalidades });
  auditGateway.listLogs.mockResolvedValue({ data: logs });
  auditGateway.saveFunctionalities.mockResolvedValue({ data: funcionalidades, message: 'ok' });
  auditGateway.exportLogs.mockResolvedValue(new Blob(['x']));
  global.URL.createObjectURL = jest.fn(() => 'blob:x');
  global.URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

test('lista funcionalidades e historico com textos e datas localizados', async () => {
  renderPage(<AuditoriaPage />);
  expect(await screen.findByText('Ana')).toBeInTheDocument();
  expect(screen.getAllByText('Página inicial').length).toBeGreaterThan(0);
  expect(screen.getByText('desconhecida')).toBeInTheDocument();
  expect(screen.getByText('Sucesso · 200')).toBeInTheDocument();
  expect(screen.getByText('Falha')).toBeInTheDocument();
  expect(screen.getByText('Falha · 500')).toBeInTheDocument();
  expect(screen.getByText('1 ativas')).toBeInTheDocument();
  expect(screen.getAllByText(/^31\/01\/2026/).length).toBeGreaterThan(0);

  fireEvent.click(screen.getAllByText('Ver dados')[0]);
  expect(screen.getByText(/"a": 1/)).toBeInTheDocument();
  fireEvent.click(screen.getByText('Ocultar'));
  expect(screen.queryByText(/"a": 1/)).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByText('Ver dados')[1]);
  expect(screen.getByText('{}')).toBeInTheDocument();
});

test('exibe a tela em ingles com funcionalidades do banco traduzidas', async () => {
  renderPage(<AuditoriaPage />, { language: 'EN' });
  expect(await screen.findByText('Ana')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Audit' })).toBeInTheDocument();
  expect(screen.getAllByText('Home page').length).toBeGreaterThan(0);
  expect(screen.getByText('Navigation')).toBeInTheDocument();
  expect(screen.getByText('Success · 200')).toBeInTheDocument();
  expect(screen.getAllByText(/^1\/31\/26, \d+:\d\d:\d\d [AP]M/).length).toBeGreaterThan(0);
});

test('alterna e salva configuracao, troca periodo e volta ao painel', async () => {
  renderPage(<AuditoriaPage />);
  await screen.findByText('Ana');
  fireEvent.click(screen.getByLabelText('Chat'));
  fireEvent.click(screen.getByText('Salvar configuração'));
  await screen.findByText('Configuração de auditoria salva.');
  expect(auditGateway.saveFunctionalities).toHaveBeenCalledWith('tk', [funcionalidades[0], { ...funcionalidades[1], enabled: true }]);
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
  expect(screen.queryByText('Configuração de auditoria salva.')).not.toBeInTheDocument();

  auditGateway.saveFunctionalities.mockResolvedValueOnce({});
  fireEvent.click(screen.getByText('Salvar configuração'));
  await screen.findByText('Configuração de auditoria salva.');
  auditGateway.saveFunctionalities.mockRejectedValueOnce(new Error('falhou salvar'));
  fireEvent.click(screen.getByText('Salvar configuração'));
  await screen.findByText('falhou salvar');

  auditGateway.listLogs.mockResolvedValueOnce({});
  fireEvent.change(screen.getByLabelText('Período'), { target: { value: '30' } });
  await screen.findByText('Nenhum registro encontrado neste período.');
  expect(auditGateway.listLogs).toHaveBeenLastCalledWith('tk', 30);
  fireEvent.click(screen.getByText(/Voltar ao painel administrativo/));
  expect(currentLocation(screen)).toBe('/admin');
});

test('exporta planilha total e por tela', async () => {
  renderPage(<AuditoriaPage />);
  await screen.findByText('Ana');
  fireEvent.click(screen.getByText(/Exportação Total/));
  await screen.findByText('Planilha total de auditoria gerada com sucesso.');
  expect(auditGateway.exportLogs).toHaveBeenCalledWith('tk', 7, '');

  fireEvent.click(screen.getByText(/Exportação Única/));
  const dialog = screen.getByRole('dialog');
  expect(screen.getByText('Exportar tela selecionada')).toBeDisabled();
  fireEvent.change(dialog.querySelectorAll('select')[0], { target: { value: 'chat' } });
  fireEvent.change(dialog.querySelectorAll('select')[1], { target: { value: '90' } });
  fireEvent.click(screen.getByText('Exportar tela selecionada'));
  await screen.findByText('Planilha da tela selecionada gerada com sucesso.');
  expect(auditGateway.exportLogs).toHaveBeenLastCalledWith('tk', 90, 'chat');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  fireEvent.click(screen.getByText(/Exportação Única/));
  fireEvent.click(screen.getByText('Cancelar'));
  fireEvent.click(screen.getByText(/Exportação Única/));
  fireEvent.click(screen.getAllByRole('button', { name: 'Fechar' }).at(-1));
  fireEvent.click(screen.getByText(/Exportação Única/));
  fireEvent.mouseDown(screen.getByRole('dialog'));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole('dialog').parentElement);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  let concluir;
  auditGateway.exportLogs.mockImplementationOnce(() => new Promise((resolve) => { concluir = resolve; }));
  fireEvent.click(screen.getByText(/Exportação Total/));
  expect(await screen.findByText('Gerando…')).toBeInTheDocument();
  await act(async () => concluir(new Blob(['y'])));

  auditGateway.exportLogs.mockRejectedValueOnce(new Error('sem planilha'));
  fireEvent.click(screen.getByText(/Exportação Total/));
  await screen.findByText('sem planilha');
});

test('mostra erro de carregamento', async () => {
  auditGateway.listFunctionalities.mockRejectedValue(new Error('sem acesso'));
  renderPage(<AuditoriaPage />);
  await screen.findByText('sem acesso');
  await waitFor(() => expect(screen.queryByText('Carregando registros…')).not.toBeInTheDocument());
});

test('aceita respostas sem dados', async () => {
  auditGateway.listFunctionalities.mockResolvedValue({});
  auditGateway.listLogs.mockResolvedValue({});
  renderPage(<AuditoriaPage />);
  await screen.findByText('Nenhum registro encontrado neste período.');
  expect(screen.getByText('0 ativas')).toBeInTheDocument();
});
