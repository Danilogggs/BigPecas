import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LanguageProvider } from '../../src/contexts/LanguageContext';
import { CurrencyProvider } from '../../src/contexts/CurrencyContext';

/** Exibe a rota atual para que os testes confiram navegacoes. */
export function LocationProbe() {
  const location = useLocation();
  return <span hidden data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

/**
 * Renderiza uma tela com idioma, roteador e (opcionalmente) moeda reais.
 * `path` permite usar parametros de rota (ex.: '/pecas/:id').
 */
export function renderPage(ui, {
  route = '/', path = '*', language, withCurrency = false, state, extraRoutes = null,
} = {}) {
  if (language) localStorage.setItem('bigpecas-language', language);
  const content = withCurrency ? <CurrencyProvider>{ui}</CurrencyProvider> : ui;
  const entry = state ? { pathname: route.split('?')[0], search: route.includes('?') ? `?${route.split('?')[1]}` : '', state } : route;
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={path} element={<>{content}<LocationProbe /></>} />
          {extraRoutes}
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  );
}

export const currentLocation = (screen) => screen.getByTestId('location').textContent;
