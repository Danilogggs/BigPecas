import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ValidarPecaPage from '../ValidarPecaPage';
import service from '../../services/avaliadorService';
import { LanguageProvider } from '../../contexts/LanguageContext';
jest.mock('../../components/Header', () => () => <header>Header</header>);
jest.mock('../../components/Money', () => () => <span>Preço</span>);
jest.mock('../../services/avaliadorService', () => ({
  __esModule: true, default: { getValidacaoPeca: jest.fn(), submitValidacao: jest.fn(), rejectValidacao: jest.fn() },
}));
const fixture = {
  peca: { id: 10, nome_peca: 'Motor teste', status_publicacao: 'pendente_validacao', revisao_avaliacao: 3 },
  validacao: { respostas: [] },
  criterios: [{id:1,nome_criterio:'Peça real?',obrigatorio:true}, {id:2,nome_criterio:'Documentação extra',obrigatorio:false}],
};
function open() {
  return render(<LanguageProvider><MemoryRouter initialEntries={['/avaliador/validar/10']}><Routes>
    <Route path="/avaliador/validar/:pecaId" element={<ValidarPecaPage />} />
  </Routes></MemoryRouter></LanguageProvider>);
}
beforeEach(() => { jest.clearAllMocks(); service.getValidacaoPeca.mockResolvedValue(fixture); });
test('publica somente após checks obrigatórios e envia a revisão visualizada', async () => {
  service.submitValidacao.mockResolvedValue({publicada:true});
  open();
  const button = await screen.findByRole('button',{name:'Concluir e publicar'});
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox',{name:/Peça real/}));
  expect(button).toBeEnabled();
  fireEvent.click(button);
  await waitFor(() => expect(service.submitValidacao).toHaveBeenCalledWith('10',[
    {criterio_id:1,resposta:true},{criterio_id:2,resposta:false},
  ],'',3));
  expect(await screen.findByText(/Peça aprovada e publicada/)).toBeInTheDocument();
});
test('reprovação exige motivo e envia também o checklist', async () => {
  service.rejectValidacao.mockResolvedValue({publicada:false});
  open();
  const button=await screen.findByRole('button',{name:'Reprovar'});
  expect(button).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'Imagem não corresponde'}});
  fireEvent.click(button);
  await waitFor(() => expect(service.rejectValidacao).toHaveBeenCalledWith('10','Imagem não corresponde',[
    {criterio_id:1,resposta:false},{criterio_id:2,resposta:false},
  ],3));
});
test('não publica checklist vazio', async () => {
  service.getValidacaoPeca.mockResolvedValue({...fixture,criterios:[]});
  open();
  expect(await screen.findByRole('button',{name:'Concluir e publicar'})).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('Sem critérios');
});
test('conflito de revisão mantém decisão bloqueada no servidor e mostra erro', async () => {
  service.submitValidacao.mockRejectedValue(new Error('O anúncio mudou. Recarregue a fila.'));
  open(); await screen.findByText('Motor teste');
  fireEvent.click(screen.getByRole('checkbox',{name:/Peça real/}));
  fireEvent.click(screen.getByRole('button',{name:'Concluir e publicar'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('O anúncio mudou');
});

