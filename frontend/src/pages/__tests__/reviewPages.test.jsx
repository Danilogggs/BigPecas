import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import AvaliadorPage from '../AvaliadorPage';
import AdminChecklistPage from '../AdminChecklistPage';
import SalesReport from '../../features/pedidos/presentation/SalesReport';
import service, { reviewRequest } from '../../services/avaliadorService';
import { exportarRelatorioVendas, obterRelatorioVendas } from '../../services/pedidosService';
import { renderPage } from '../../../jest/helpers/render';

jest.mock('../../components/Header', () => () => <header>Cabeçalho</header>);
jest.mock('../../services/avaliadorService', () => ({
  __esModule: true,
  reviewRequest: jest.fn(),
  default: { getPecasPendentes: jest.fn(), getEstatisticas: jest.fn() },
}));
jest.mock('../../services/pedidosService', () => ({ obterRelatorioVendas: jest.fn(), exportarRelatorioVendas: jest.fn() }));

const peca = (id, extra = {}) => ({ id, nome_peca: `Peça ${id}`, preco_base: 100, moeda_base: 'BRL', ...extra });

describe('AvaliadorPage', () => {
  beforeEach(() => {
    service.getEstatisticas.mockResolvedValue({ pendentes: 3, aprovadas: 2, rejeitadas: 1 });
  });

  test('lista anuncios com dados localizados e pagina', async () => {
    const pagina = Array.from({ length: 21 }, (_, index) => peca(index + 1));
    pagina[0] = peca(1, { imagem: 'a.png', users: { full_name: 'Loja X' }, sku: 'S1', condicao: 'USADO', data_cadastro: '2026-01-31T12:00:00', revisao_avaliacao: 2 });
    pagina[1] = peca(2, { url_video: 'v.mp4', oem_number: 'OEM-2', created_at: 'invalida', nome_peca: '' });
    service.getPecasPendentes.mockResolvedValue(pagina);
    renderPage(<AvaliadorPage />);
    expect(await screen.findByText('Peça 1')).toBeInTheDocument();
    expect(screen.getByText('Loja X')).toBeInTheDocument();
    expect(screen.getByText('Usado')).toBeInTheDocument();
    expect(screen.getByText('31/01/2026')).toBeInTheDocument();
    expect(screen.getByText('OEM-2')).toBeInTheDocument();
    expect(screen.getByText('Peça sem nome')).toBeInTheDocument();
    expect(screen.getAllByText('Não informada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0);

    service.getPecasPendentes.mockResolvedValue([peca(50)]);
    fireEvent.click(screen.getByText('Próxima'));
    expect(await screen.findByText('Peça 50')).toBeInTheDocument();
    expect(service.getPecasPendentes).toHaveBeenLastCalledWith(21, 21, 'recent');
    service.getPecasPendentes.mockResolvedValue(pagina);
    fireEvent.click(screen.getByText('Anterior'));
    await screen.findByText('Peça 1');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'oldest' } });
    await waitFor(() => expect(service.getPecasPendentes).toHaveBeenLastCalledWith(21, 0, 'oldest'));
  });

  test('em ingles traduz rotulos e formata data no padrao americano', async () => {
    service.getPecasPendentes.mockResolvedValue([peca(1, { condicao: 'BOM', data_cadastro: '2026-01-31T12:00:00' })]);
    renderPage(<AvaliadorPage />, { language: 'EN' });
    expect(await screen.findByText('Listing #1')).toBeInTheDocument();
    expect(screen.getByText('1/31/2026')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Sort by')).toBeInTheDocument();
  });

  test('mostra erro e lista vazia', async () => {
    service.getPecasPendentes.mockRejectedValueOnce(new Error('falhou'));
    const { unmount } = renderPage(<AvaliadorPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('falhou');
    unmount();
    service.getPecasPendentes.mockResolvedValue([]);
    renderPage(<AvaliadorPage />);
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.getByText(/Nenhum anúncio/i)).toBeInTheDocument();
  });

  test('ignora resposta apos desmontar', async () => {
    let resolver;
    service.getPecasPendentes.mockReturnValue(new Promise((r) => { resolver = r; }));
    const { unmount } = renderPage(<AvaliadorPage />);
    unmount();
    await act(async () => resolver([]));
  });
});

describe('SalesReport', () => {
  const relatorio = {
    summary: { orders: 1200, units: 3, revenue: 1500.5 },
    sales: [{ id: 9, paid_at: '2026-01-31T12:00:00', buyer: 'Bia', total: 300, status: 'pago', items: [{ id: 1, name: 'Farol', quantity: 2, unit_price: 150 }, { id: 2, name: 'Roda', sku: 'R1', quantity: 1, unit_price: 0 }] }],
  };

  beforeEach(() => {
    obterRelatorioVendas.mockResolvedValue(relatorio);
    exportarRelatorioVendas.mockResolvedValue(new Blob(['x']));
    global.URL.createObjectURL = jest.fn(() => 'blob:x');
    global.URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  test('mostra resumo e vendas localizados em portugues', async () => {
    renderPage(<SalesReport />);
    expect(await screen.findByText('Bia')).toBeInTheDocument();
    expect(screen.getByText('1.200')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?1\.500,50/)).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.getByText(/Sem SKU/)).toBeInTheDocument();
    expect(screen.getByText(/^31\/01\/2026/)).toBeInTheDocument();
  });

  test('em frances mantem BRL (moeda cobrada) com formato frances', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ moeda: 'BRL', unidades_por_brl: 1 }, { moeda: 'EUR', unidades_por_brl: 0.2 }] });
    renderPage(<SalesReport />, { language: 'FR', withCurrency: true });
    expect(await screen.findByText('Bia')).toBeInTheDocument();
    expect(await screen.findByText(/1\s500,50\sR\$/)).toBeInTheDocument();
    expect(screen.getByText(/1\s200/)).toBeInTheDocument();
    expect(screen.getByText('Ventes réalisées')).toBeInTheDocument();
    expect(screen.getByText(/^31\/01\/2026/)).toBeInTheDocument();
  });

  test('troca periodo, exporta e trata erros', async () => {
    renderPage(<SalesReport />);
    await screen.findByText('Bia');
    obterRelatorioVendas.mockResolvedValueOnce({ summary: { orders: 0, units: 0, revenue: 0 }, sales: [] });
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: '7' } });
    expect(await screen.findByText('Nenhuma venda paga neste período.')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Exportar Excel/));
    await waitFor(() => expect(exportarRelatorioVendas).toHaveBeenCalledWith(7));
    exportarRelatorioVendas.mockRejectedValueOnce(new Error('falha export'));
    fireEvent.click(screen.getByText(/Exportar Excel/));
    expect(await screen.findByRole('alert')).toHaveTextContent('falha export');
    obterRelatorioVendas.mockRejectedValueOnce(new Error('falha relatorio'));
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: '90' } });
    expect(await screen.findByText('falha relatorio')).toBeInTheDocument();
  });

  test('ignora resposta apos desmontar', async () => {
    let resolver;
    obterRelatorioVendas.mockReturnValue(new Promise((r) => { resolver = r; }));
    const { unmount } = renderPage(<SalesReport />);
    unmount();
    await act(async () => resolver(relatorio));
  });
});

describe('AdminChecklistPage', () => {
  const criterios = [
    { id: 1, nome_criterio: 'Fotos nítidas', descricao: 'd', ativo: true, obrigatorio: true, ordem: 1 },
    { id: 2, nome_criterio: 'Número de série', descricao: '', ativo: false, obrigatorio: false, ordem: 2 },
  ];

  test('lista, edita e cria criterios reordenando posicoes', async () => {
    reviewRequest.mockImplementation(async (path, method, body) => {
      if (!method) return criterios;
      return { id: body.id || 3, ...body };
    });
    renderPage(<AdminChecklistPage />);
    expect(await screen.findByText('Fotos nítidas')).toBeInTheDocument();
    expect(screen.getByText('2 critérios')).toBeInTheDocument();
    expect(screen.getByText('Sem descrição')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText(/Editar critério/i)[1]);
    expect(screen.getByDisplayValue('Número de série')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Posição no checklist'), { target: { value: '1' } });
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    fireEvent.submit(screen.getByDisplayValue('Número de série').closest('form'));
    await waitFor(() => expect(reviewRequest).toHaveBeenCalledWith('/admin/avaliador/checklist-criterios/2', 'PUT', expect.objectContaining({ ordem: 1 })));
    expect(await screen.findByRole('status')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button').at(-1));
    const form = document.querySelector('form');
    fireEvent.change(form.querySelector('input'), { target: { value: 'Novo' } });
    fireEvent.change(form.querySelector('textarea'), { target: { value: 'desc' } });
    fireEvent.submit(form);
    await waitFor(() => expect(reviewRequest).toHaveBeenCalledWith('/admin/avaliador/checklist-criterios', 'POST', expect.objectContaining({ nome_criterio: 'Novo' })));
  });

  test('mostra erros de carregamento e de salvamento', async () => {
    reviewRequest.mockRejectedValueOnce(new Error('sem acesso'));
    const { unmount } = renderPage(<AdminChecklistPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('sem acesso');
    unmount();
    reviewRequest.mockReset();
    reviewRequest.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('não salvou'));
    renderPage(<AdminChecklistPage />, { language: 'EN' });
    expect(await screen.findByText('0 criteria')).toBeInTheDocument();
    fireEvent.change(document.querySelector('form input'), { target: { value: 'X' } });
    fireEvent.submit(document.querySelector('form'));
    expect(await screen.findByRole('alert')).toHaveTextContent('não salvou');
  });
});
