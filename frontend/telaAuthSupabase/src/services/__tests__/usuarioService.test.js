import {
  salvarPerfilUsuario,
  buscarPerfilUsuario,
  buscarUsuarioPorId,
  cadastrarUsuario,
} from '../usuarioService';
import { getSupabaseClient } from '../supabase';
import { criarResposta, respostaDeErro, sessaoValida } from '../../../jest/helpers/http';

jest.mock('../supabase');

const AUTH_API = 'http://localhost:3001';
const PERFIL = { id: 42, full_name: 'Maria Silva', email: 'cliente@bigpecas.com' };

function mockarSessao(resultado = sessaoValida()) {
  getSupabaseClient.mockReturnValue({
    auth: { getSession: jest.fn().mockResolvedValue(resultado) },
  });
}

const url = () => global.fetch.mock.calls[0][0];
const opcoes = () => global.fetch.mock.calls[0][1];

describe('usuarioService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    mockarSessao();
  });

  describe('salvarPerfilUsuario', () => {
    it('envia o perfil por POST e desembrulha a resposta', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { message: 'ok', profile: PERFIL } }));

      await expect(salvarPerfilUsuario({ full_name: 'Maria Silva' })).resolves.toEqual(PERFIL);
      expect(url()).toBe(`${AUTH_API}/api/auth/profile`);
      expect(opcoes().method).toBe('POST');
    });

    it('devolve o corpo inteiro quando nao ha campo profile', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: PERFIL }));

      await expect(salvarPerfilUsuario({})).resolves.toEqual(PERFIL);
    });

    it('propaga a validacao do backend', async () => {
      global.fetch.mockResolvedValue(respostaDeErro(400, { error: 'Informe o nome completo.' }));

      await expect(salvarPerfilUsuario({})).rejects.toThrow('Informe o nome completo.');
    });

    it('cadastrarUsuario e um alias de salvarPerfilUsuario', () => {
      expect(cadastrarUsuario).toBe(salvarPerfilUsuario);
    });
  });

  describe('buscarPerfilUsuario', () => {
    it('busca o perfil do usuario autenticado', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: PERFIL }));

      await expect(buscarPerfilUsuario()).resolves.toEqual(PERFIL);
      expect(opcoes().method).toBe('GET');
    });

    it('avisa quando o perfil nao pode ser carregado', async () => {
      global.fetch.mockResolvedValue(respostaDeErro(418, {}));

      await expect(buscarPerfilUsuario()).rejects.toThrow(
        'Não foi possível carregar os dados do seu perfil agora.',
      );
    });
  });

  describe('buscarUsuarioPorId', () => {
    it('desembrulha o campo user da resposta', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { user: { id: 42, profile: PERFIL } } }));

      await expect(buscarUsuarioPorId(42)).resolves.toEqual({ id: 42, profile: PERFIL });
      expect(url()).toBe(`${AUTH_API}/api/auth/users/42`);
    });

    it('aceita id em formato uuid', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { user: {} } }));

      await buscarUsuarioPorId('3f2504e0-4f89-11d3-9a0c-0305e82c3301');

      expect(url()).toBe(`${AUTH_API}/api/auth/users/3f2504e0-4f89-11d3-9a0c-0305e82c3301`);
    });

    it('avisa quando o usuario nao existe', async () => {
      global.fetch.mockResolvedValue(respostaDeErro(404, { error: 'Usuário não encontrado.' }));

      await expect(buscarUsuarioPorId(999)).rejects.toThrow('Usuário não encontrado.');
    });
  });

  describe('autenticacao', () => {
    it('envia o token no cabecalho', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: PERFIL }));

      await buscarPerfilUsuario();

      expect(opcoes().headers.Authorization).toBe('Bearer token-de-teste');
    });

    it('recusa quando nao ha sessao ativa', async () => {
      mockarSessao({ data: { session: null }, error: null });

      await expect(buscarPerfilUsuario()).rejects.toThrow(
        'Você precisa estar autenticado para continuar.',
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
