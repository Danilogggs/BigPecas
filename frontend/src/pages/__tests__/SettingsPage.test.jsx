import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../SettingsPage';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { AccessibilityProvider } from '../../contexts/AccessibilityContext';

jest.mock('../../components/Header', () => function HeaderMock() {
  return <header>BigPeças</header>;
});

function criarGateway(initial = {}) {
  return {
    load: jest.fn(() => ({
      textScale: 'default',
      readableFont: false,
      emphasizeLinks: false,
      ...initial,
    })),
    save: jest.fn(() => true),
  };
}

function renderizarPagina(gateway = criarGateway()) {
  return render(
    <ThemeProvider>
      <AccessibilityProvider gateway={gateway}>
        <LanguageProvider>
          <SettingsPage />
        </LanguageProvider>
      </AccessibilityProvider>
    </ThemeProvider>,
  );
}

describe('SettingsPage accessibility', () => {
  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.textScale;
    delete document.documentElement.dataset.readableFont;
    delete document.documentElement.dataset.emphasizeLinks;
    document.documentElement.style.colorScheme = '';
  });

  it('aplica escala, fonte legível e destaque de links pelos controles visuais', async () => {
    const user = userEvent.setup();
    renderizarPagina();

    await user.click(screen.getByRole('radio', { name: /Extra grande/i }));
    await user.click(screen.getByRole('checkbox', { name: /Fonte de alta legibilidade/i }));
    await user.click(screen.getByRole('checkbox', { name: /Sublinhar links/i }));

    expect(document.documentElement.dataset.textScale).toBe('extra-large');
    expect(document.documentElement.dataset.readableFont).toBe('true');
    expect(document.documentElement.dataset.emphasizeLinks).toBe('true');
  });

  it('restaura as preferências visuais sem alterar o tema', async () => {
    localStorage.setItem('bigpecas-theme', 'dark');
    const user = userEvent.setup();
    renderizarPagina(criarGateway({
      textScale: 'large',
      readableFont: true,
      emphasizeLinks: true,
    }));

    await user.click(screen.getByRole('button', { name: 'Restaurar padrão' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.textScale).toBe('default');
    expect(document.documentElement.dataset.readableFont).toBe('false');
    expect(document.documentElement.dataset.emphasizeLinks).toBe('false');
  });

  it('informa o estado sem depender somente da cor', () => {
    renderizarPagina(criarGateway({ readableFont: true }));

    expect(screen.getByText(/fonte legível ativada/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Fonte de alta legibilidade/i })).toBeChecked();
    expect(screen.getAllByText('Ativado')).not.toHaveLength(0);
  });
});
