import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditarPecas from '../EditarPecas';
import * as api from '../../services/pecasService';
jest.mock('../../components/Header', () => () => null);
jest.mock('../../contexts/LanguageContext', () => ({useLanguage: () => ({t: key => key})}));
jest.mock('../../services/pecasService', () => ({listarMinhasPecas:jest.fn(),listarCategorias:jest.fn(),listarMateriais:jest.fn(),buscarPecaPorId:jest.fn(),atualizarPeca:jest.fn()}));
const piece = {id:1,nome_peca:'Peca teste',sku:'ABC-123',oem_number:'OEM-123',num_serie:'SER-123',
  categoria_id:1,material_id:1,condicao:'BOM',peso_gramas:123,comprimento_mm:123,largura_mm:123,altura_mm:123,
  estoque_atual:0,preco:444,detalhes_gravacao:'Gravação original',historico_proveniencia:'Peça de teste',status_publicacao:'publicada'};
beforeEach(() => {
  jest.clearAllMocks();
  api.listarMinhasPecas.mockResolvedValue({data:[piece]});
  api.listarCategorias.mockResolvedValue([{id:1,nome:'Motor'}]);
  api.listarMateriais.mockResolvedValue([{id:1,nome:'Aço'}]);
  api.buscarPecaPorId.mockResolvedValue(piece);
  api.atualizarPeca.mockResolvedValue({message:'Alterações salvas',peca:{...piece,status_publicacao:'pendente_validacao'}});
});
async function open() {
  const view = render(<MemoryRouter><EditarPecas /></MemoryRouter>);
  fireEvent.click(await screen.findByText('Peca teste'));
  await screen.findByRole('button',{name:'Salvar alterações'});
  return view;
}
test('salva imagem com números vindos da API, preservando estoque zero e condição', async () => {
  const {container} = await open();
  expect(container.querySelector('[name="condicao"]')).toHaveValue('BOM');
  expect(screen.getByRole('option',{name:'Bom'})).toBeInTheDocument();
  expect(container.querySelector('[name="estoque_atual"]')).toHaveValue(0);
  fireEvent.change(container.querySelector('input[type="file"]'), {target:{files:[new File(['foto'],'peca.png',{type:'image/png'})]}});
  await screen.findByAltText('Preview');
  fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
  await waitFor(() => expect(api.atualizarPeca).toHaveBeenCalledWith(1,expect.objectContaining({
    estoque_atual:0,peso_gramas:123,condicao:'BOM',imagem:expect.stringMatching(/^data:image\/png;base64,/)
  })));
  expect(await screen.findByText('Alterações salvas')).toHaveAttribute('role','status');
});
test('mostra erro de validação sem enviar a API', async () => {
  const {container} = await open();
  fireEvent.change(container.querySelector('[name="nome_peca"]'),{target:{value:''}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('fixHighlightedFields');
  expect(api.atualizarPeca).not.toHaveBeenCalled();
});
