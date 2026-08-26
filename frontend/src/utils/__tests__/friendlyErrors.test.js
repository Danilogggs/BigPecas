import {
  parseErrorResponse,
  parseUnexpectedError,
  mapSupabaseAuthError,
  createFriendlyError,
  FRIENDLY_DEFAULT_MESSAGES,
} from '../friendlyErrors';
import { criarResposta, respostaDeErro } from '../../../jest/helpers/http';

describe('parseErrorResponse', () => {
  it('prioriza o codigo de erro conhecido do payload', async () => {
    const resposta = respostaDeErro(400, { code: 'invalid_credentials', message: 'qualquer coisa' });

    await expect(parseErrorResponse(resposta)).resolves.toBe('Email ou senha incorretos.');
  });

  it('usa a mensagem do backend quando ela ja e amigavel', async () => {
    const resposta = respostaDeErro(409, { error: 'Este vendedor já foi avaliado nesta compra.' });

    await expect(parseErrorResponse(resposta)).resolves.toBe(
      'Este vendedor já foi avaliado nesta compra.',
    );
  });

  it('junta a lista de erros de validacao', async () => {
    const resposta = respostaDeErro(422, {
      errors: [{ msg: 'Informe o CEP' }, { message: 'Informe a cidade' }],
    });

    await expect(parseErrorResponse(resposta)).resolves.toBe('Informe o CEP, Informe a cidade');
  });

  it.each([
    ['message', { message: 'Peça não encontrada.' }],
    ['error_description', { error_description: 'Sessão do vendedor encerrada.' }],
    ['details', { details: 'Estoque insuficiente para o pedido.' }],
  ])('extrai a mensagem do campo %s', async (_campo, body) => {
    const mensagem = await parseErrorResponse(respostaDeErro(400, body));

    expect(mensagem).not.toBe(FRIENDLY_DEFAULT_MESSAGES.generic);
  });

  it('traduz mensagens tecnicas conhecidas em ingles', async () => {
    const resposta = respostaDeErro(400, { message: 'New password should be different from the old password' });

    await expect(parseErrorResponse(resposta)).resolves.toBe(
      'A nova senha deve ser diferente da senha anterior.',
    );
  });

  it.each([
    ['detalhes de banco', 'duplicate entry for key users_email_key'],
    ['stack trace', 'TypeError: cannot read property of undefined'],
    ['erro de rede', 'Failed to fetch'],
    ['detalhe do Supabase', 'PGRST116: no rows returned'],
  ])('esconde %s do usuario final', async (_descricao, message) => {
    const mensagem = await parseErrorResponse(respostaDeErro(500, { message }));

    expect(mensagem).toBe('Ocorreu um erro interno. Tente novamente em instantes.');
  });

  it.each([
    [400, 'Alguns dados informados são inválidos. Revise e tente novamente.'],
    [401, 'Você precisa entrar na sua conta para continuar.'],
    [403, 'Você não tem permissão para realizar esta ação.'],
    [404, 'O item solicitado não foi encontrado.'],
    [409, 'A operação não pode ser realizada no estado atual.'],
    [429, 'Muitas tentativas realizadas. Aguarde um instante e tente novamente.'],
    [503, 'O serviço está temporariamente indisponível. Tente novamente em instantes.'],
  ])('cai na mensagem padrao do status %i', async (status, esperado) => {
    await expect(parseErrorResponse(respostaDeErro(status, {}))).resolves.toBe(esperado);
  });

  it('usa o fallback informado para status sem mensagem propria', async () => {
    const mensagem = await parseErrorResponse(respostaDeErro(418, {}), 'Mensagem específica da tela.');

    expect(mensagem).toBe('Mensagem específica da tela.');
  });

  it('le o corpo como texto quando ele nao e um JSON valido', async () => {
    const resposta = criarResposta({ ok: false, status: 400, body: 'Informe um CEP válido.' });

    await expect(parseErrorResponse(resposta)).resolves.toBe('Informe um CEP válido.');
  });

  it('nao quebra quando o corpo nao pode ser lido', async () => {
    const resposta = {
      status: 500,
      clone: () => ({
        json: async () => { throw new Error('body já consumido'); },
        text: async () => { throw new Error('body já consumido'); },
      }),
    };

    await expect(parseErrorResponse(resposta)).resolves.toBe(
      'Ocorreu um erro interno. Tente novamente em instantes.',
    );
  });
});

describe('parseUnexpectedError', () => {
  it('reconhece o cancelamento por timeout', () => {
    const erro = new Error('Aborted');
    erro.name = 'AbortError';

    expect(parseUnexpectedError(erro)).toBe(
      'A solicitação demorou mais do que o esperado. Tente novamente.',
    );
  });

  it.each([
    [new TypeError('Failed to fetch')],
    [new Error('NetworkError when attempting to fetch resource')],
    [new Error('Load failed')],
    [new Error('fetch failed')],
    [new Error('Network request failed')],
  ])('converte %p em mensagem de conexao', (erro) => {
    expect(parseUnexpectedError(erro)).toBe(FRIENDLY_DEFAULT_MESSAGES.network);
  });

  it('preserva mensagens ja escritas em portugues', () => {
    expect(parseUnexpectedError(new Error('Informe um CEP válido com 8 dígitos.')))
      .toBe('Informe um CEP válido com 8 dígitos.');
  });

  it('usa o fallback quando a mensagem e tecnica', () => {
    expect(parseUnexpectedError(new Error('supabase connection reset'), 'Não deu certo.'))
      .toBe('Não deu certo.');
  });

  it.each([[null], [undefined], [{}]])('usa o fallback para %p', (erro) => {
    expect(parseUnexpectedError(erro, 'Falha padrão.')).toBe('Falha padrão.');
  });
});

describe('mapSupabaseAuthError', () => {
  it.each([
    ['invalid_credentials', 'Email ou senha incorretos.'],
    ['email_not_confirmed', 'Confirme seu email antes de entrar.'],
    ['user_banned', 'Esta conta foi desativada. Entre em contato com o suporte.'],
    ['session_not_found', 'Sua sessão expirou. Entre novamente para continuar.'],
    ['signup_disabled', 'Novos cadastros estão temporariamente desativados.'],
  ])('traduz o codigo %s', (code, esperado) => {
    expect(mapSupabaseAuthError({ code })).toBe(esperado);
  });

  it('usa a mensagem especifica do contexto de login', () => {
    expect(mapSupabaseAuthError({ code: 'validation_failed' }, 'login'))
      .toBe('Informe um email e uma senha válidos.');
  });

  it('usa a mensagem especifica do contexto de recuperacao de senha', () => {
    expect(mapSupabaseAuthError({ code: 'validation_failed' }, 'resetPassword'))
      .toBe('Informe um email válido.');
  });

  it('trata 429 como excesso de tentativas mesmo sem codigo', () => {
    expect(mapSupabaseAuthError({ status: 429 })).toBe(
      'Muitas tentativas realizadas. Aguarde um instante e tente novamente.',
    );
  });

  it('a traducao da mensagem tem prioridade sobre o codigo', () => {
    const erro = { code: 'validation_failed', message: 'Invalid login credentials' };

    expect(mapSupabaseAuthError(erro, 'login')).toBe('Email ou senha incorretos.');
  });

  it.each([
    ['login', 'Não foi possível entrar agora. Verifique seus dados e tente novamente.'],
    ['register', 'Não foi possível criar sua conta agora. Tente novamente.'],
    ['resetPassword', 'Não foi possível enviar o email de recuperação agora. Tente novamente.'],
    ['updatePassword', 'Não foi possível redefinir sua senha agora. Solicite um novo link e tente novamente.'],
    ['generic', FRIENDLY_DEFAULT_MESSAGES.generic],
  ])('cai na mensagem padrao do contexto %s', (contexto, esperado) => {
    expect(mapSupabaseAuthError({ code: 'erro_desconhecido' }, contexto)).toBe(esperado);
  });

  it('usa o contexto generico quando o contexto informado nao existe', () => {
    expect(mapSupabaseAuthError({}, 'contexto-inexistente')).toBe(FRIENDLY_DEFAULT_MESSAGES.generic);
  });
});

describe('createFriendlyError', () => {
  it('cria um Error com a mensagem informada', () => {
    const erro = createFriendlyError('Estoque insuficiente.');

    expect(erro).toBeInstanceOf(Error);
    expect(erro.message).toBe('Estoque insuficiente.');
  });

  it.each([[''], [null], [undefined]])('usa a mensagem generica para %p', (mensagem) => {
    expect(createFriendlyError(mensagem).message).toBe(FRIENDLY_DEFAULT_MESSAGES.generic);
  });
});
