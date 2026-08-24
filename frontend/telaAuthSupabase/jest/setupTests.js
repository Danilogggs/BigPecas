require('@testing-library/jest-dom');

// Vários serviços usam `console.error` como log de diagnóstico no catch.
// Silenciar mantém a saída do Jest legível sem esconder falhas reais.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  localStorage.clear();
});
