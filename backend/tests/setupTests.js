const logger = require('../src/utils/logger');

// O winston escreve no console em todos os testes de erro; silenciar mantem a saida do Jest legivel.
logger.transports.forEach((transport) => {
  transport.silent = true;
});

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
