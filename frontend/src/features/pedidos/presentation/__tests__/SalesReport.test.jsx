import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesReport from '../SalesReport';
import { obterRelatorioVendas } from '../../../../services/pedidosService';

jest.mock('../../../../services/pedidosService', () => ({
  obterRelatorioVendas: jest.fn(), exportarRelatorioVendas: jest.fn(),
}));

const report = (page = 1) => ({
  summary: { orders: 51, units: 80, revenue: 900 },
  pagination: { page, limit: 50, total: 51 },
  sales: [{ id: `pedido-${page}`, paid_at: '2026-10-25T12:00:00Z', status: 'pago', buyer: 'Cliente',
    units: 2, total: 20, items: [{id:1,name:'Peça histórica',quantity:2,unit_price:10,total:20}] }],
});

beforeEach(() => { jest.clearAllMocks(); });

test('exibe resumo global do banco e muda de pagina sem recalcular pelos itens visiveis', async () => {
  obterRelatorioVendas.mockImplementation((_days, page) => Promise.resolve(report(page)));
  const user = userEvent.setup();
  render(<SalesReport />);
  await screen.findByText('pedido-1', { exact: false });
  expect(screen.getByText('51', { exact: true })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Próxima' }));
  await screen.findByText('pedido-2', { exact: false });
  expect(obterRelatorioVendas).toHaveBeenLastCalledWith(30,2);
  expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  await user.selectOptions(screen.getByRole('combobox'), '90');
  await waitFor(() => expect(obterRelatorioVendas).toHaveBeenLastCalledWith(90,1));
});

test('mostra falha em vez de apresentar ausencia de vendas como resultado da consulta', async () => {
  obterRelatorioVendas.mockRejectedValue(new Error('Relatórios em atualização.'));
  render(<SalesReport />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Relatórios em atualização.');
  expect(screen.queryByText('Nenhuma venda paga neste período.')).not.toBeInTheDocument();
});
