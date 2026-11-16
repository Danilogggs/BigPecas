import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminPage from '../AdminPage';
import adminGateway from '../../features/admin/infrastructure/adminGateway';

const mockToken = jest.fn(async () => 'token-teste');
const mockDashboard = {
  state: { loading:false, error:null, admin:{id:1,full_name:'Admin Teste',email:'teste@example.test'}, dashboard:{} },
  visibleWidgets:['boas_vindas','faturamento','pedidos','ticket_medio','desempenho_vendas','fluxo_pedidos'],
  customizing:false, draftWidgets:[],
};
jest.mock('../../components/Header', () => () => <header>BigPeças</header>);
jest.mock('../../contexts/AuthContext', () => ({useAuth: () => ({getToken:mockToken})}));
jest.mock('../../contexts/LanguageContext', () => ({useLanguage: () => ({t:(key)=>key,language:'PTBR'})}));
jest.mock('../../features/admin/application/useAdminDashboard', () => () => mockDashboard);
jest.mock('../../features/admin/infrastructure/adminGateway', () => ({carregarDadosGerenciais:jest.fn()}));

const dados = {
  metricas:{faturamento:200,pedidos:4,ticket_medio:100}, anteriores:null,
  status:{pago:2,aguardando_pagamento:2}, serie:[{data:'2026-10-26',value:200,orders:2,ticket:100}],
  fornecedores:[{id:5,nome:'Loja Teste'}], pedidos:[],usuarios:[],
};
beforeEach(() => { jest.clearAllMocks(); });

test('renderiza agregados SQL e envia periodo, status, fornecedor e granularidade', async () => {
  adminGateway.carregarDadosGerenciais.mockImplementation(async (_token,filtros) => ({
    ...dados, metricas:{...dados.metricas,faturamento:filtros.status === 'aguardando_pagamento' ? 0 : 200},
  }));
  const user = userEvent.setup();
  render(<MemoryRouter><AdminPage /></MemoryRouter>);
  await screen.findByText('R$ 200,00', {normalizer: text => text.replace(/\s/g,' ')});
  await user.selectOptions(screen.getByRole('combobox',{name:'Período do dashboard'}),'90');
  await user.selectOptions(screen.getByRole('combobox',{name:'Status do dashboard'}),'aguardando_pagamento');
  await user.selectOptions(screen.getByRole('combobox',{name:'Fornecedor do dashboard'}),'5');
  await user.click(screen.getByRole('button',{name:'Mensal'}));
  await waitFor(() => expect(adminGateway.carregarDadosGerenciais).toHaveBeenLastCalledWith('token-teste',{
    days:90,status:'aguardando_pagamento',fornecedor_id:'5',granularity:'mensal',
  }));
  expect(screen.getByText('R$ 0,00',{normalizer:text=>text.replace(/\s/g,' ')})).toBeInTheDocument();
});

test('falha na consulta nao e exibida como faturamento zero', async () => {
  adminGateway.carregarDadosGerenciais.mockRejectedValue(new Error('Relatórios em atualização.'));
  render(<MemoryRouter><AdminPage /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Relatórios em atualização.');
  expect(screen.queryByText('R$ 0,00',{normalizer:text=>text.replace(/\s/g,' ')})).not.toBeInTheDocument();
});
