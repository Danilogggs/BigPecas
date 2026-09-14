import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CarrinhoPage from '../CarrinhoPage';
import { CartProvider } from '../../contexts/CartContext';
import { LanguageProvider } from '../../contexts/LanguageContext';
jest.mock('../../components/Header', () => () => <header>Cabeçalho</header>);
jest.mock('../../services/freteService', () => ({calcularFrete:jest.fn(),aplicarCupom:jest.fn(),formatarCep:v=>v,sanitizarCep:v=>v,validarCep:()=>false}));
function open(items) {
  const repository = {carregar:()=>items,salvar:jest.fn()};
  return render(<LanguageProvider><MemoryRouter><CartProvider cartRepository={repository}><CarrinhoPage /></CartProvider></MemoryRouter></LanguageProvider>);
}
test('renderiza carrinho preenchido e permite remover item sem erro de tradução', () => {
  open([{id:1,nome:'Peça de teste',preco:444,quantidade:1,estoque:100,imagem:'https://example.com/peca.png'}]);
  expect(screen.getByText('Peça de teste')).toBeInTheDocument();
  fireEvent.click(screen.getByTitle('Remover item'));
  expect(screen.getByText('Seu carrinho está vazio')).toBeInTheDocument();
});
test('renderiza carrinho vazio', () => {
  open([]);
  expect(screen.getByText('Seu carrinho está vazio')).toBeInTheDocument();
});
