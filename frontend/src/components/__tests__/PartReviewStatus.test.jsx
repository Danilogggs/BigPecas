import { render, screen } from '@testing-library/react';
import PartReviewStatus from '../PartReviewStatus';

jest.mock('../../contexts/LanguageContext', () => ({ useLanguage: () => ({ t: key => key }) }));

test('mostra status pendente legivel, sem codigo interno', () => {
  render(<PartReviewStatus status="pendente_validacao" />);
  expect(screen.getByRole('status')).toHaveTextContent('Aguardando avaliação');
  expect(screen.getByRole('status')).not.toHaveTextContent('pendente_validacao');
});

test('preserva motivo e atualiza o status depois de alteracoes', () => {
  const { rerender } = render(<PartReviewStatus status="rejeitada" reason="Imagem ilegível" />);
  expect(screen.getByRole('status')).toHaveTextContent('Imagem ilegível');
  rerender(<PartReviewStatus status="publicada" />);
  expect(screen.getByRole('status')).toHaveTextContent('Publicada');
  expect(screen.getByRole('status')).not.toHaveTextContent('Imagem ilegível');
});

test('nao expoe status desconhecido e omite status ausente', () => {
  const { rerender } = render(<PartReviewStatus status="internal_unknown" />);
  expect(screen.getByRole('status')).toHaveTextContent('Status indisponível');
  expect(screen.getByRole('status')).not.toHaveTextContent('internal_unknown');
  rerender(<PartReviewStatus />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
