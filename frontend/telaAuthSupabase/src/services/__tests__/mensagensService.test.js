import {
  listarMensagensConversa,
  enviarMensagem,
  listarConversasAtivas,
  assinarMensagensConversa,
  assinarMensagensUsuario,
} from '../mensagensService';
import { getSupabaseClient } from '../supabase';

jest.mock('../supabase');

const MARIA = 42;
const ZE = 5;

function mensagem(overrides = {}) {
  return {
    id: 1,
    created_at: '2026-01-01T10:00:00.000Z',
    id_remetente: MARIA,
    id_destinatario: ZE,
    mensagem: 'Esse friso ainda está disponível?',
    ...overrides,
  };
}

/** Query builder encadeável e "thenable", como o do supabase-js. */
function criarQueryBuilder(resultado) {
  const chamadas = [];
  const builder = {};

  ['select', 'insert', 'or', 'order', 'single', 'eq'].forEach((metodo) => {
    builder[metodo] = jest.fn((...args) => {
      chamadas.push({ metodo, args });
      return builder;
    });
  });

  builder.then = (onFulfilled, onRejected) =>
    Promise.resolve(resultado).then(onFulfilled, onRejected);
  builder.__chamadas = chamadas;

  return builder;
}

function mockarSupabase(resultado) {
  const builder = criarQueryBuilder(resultado);
  const canal = { on: jest.fn(() => canal), subscribe: jest.fn(() => canal) };
  const cliente = {
    from: jest.fn(() => builder),
    channel: jest.fn(() => canal),
    removeChannel: jest.fn(),
  };

  getSupabaseClient.mockReturnValue(cliente);

  return { cliente, builder, canal };
}

function argumentosDe(builder, metodo) {
  return builder.__chamadas.find((chamada) => chamada.metodo === metodo)?.args;
}

describe('listarMensagensConversa', () => {
  it('devolve as mensagens em ordem cronologica', async () => {
    const mensagens = [mensagem(), mensagem({ id: 2 })];
    const { builder } = mockarSupabase({ data: mensagens, error: null });

    await expect(listarMensagensConversa(MARIA, ZE)).resolves.toEqual(mensagens);
    expect(argumentosDe(builder, 'order')).toEqual(['created_at', { ascending: true }]);
  });

  it('busca as mensagens nos dois sentidos da conversa', async () => {
    const { cliente, builder } = mockarSupabase({ data: [], error: null });

    await listarMensagensConversa(MARIA, ZE);

    expect(cliente.from).toHaveBeenCalledWith('mensagens');
    expect(argumentosDe(builder, 'or')[0]).toBe(
      'and(id_remetente.eq.42,id_destinatario.eq.5),and(id_remetente.eq.5,id_destinatario.eq.42)',
    );
  });

  it('devolve lista vazia quando nao ha mensagens', async () => {
    mockarSupabase({ data: null, error: null });

    await expect(listarMensagensConversa(MARIA, ZE)).resolves.toEqual([]);
  });

  it('esconde o detalhe tecnico quando a consulta falha', async () => {
    mockarSupabase({ data: null, error: { message: 'PGRST301: JWT expired' } });

    await expect(listarMensagensConversa(MARIA, ZE)).rejects.toThrow(
      'Nao foi possivel carregar as mensagens desta conversa.',
    );
  });

  // O filtro de `friendlyErrors` so reconhece termos tecnicos conhecidos; uma
  // mensagem crua do Postgres fora dessa lista chega ao usuario como esta.
  it('repassa mensagens do banco que o filtro nao reconhece como tecnicas', async () => {
    mockarSupabase({ data: null, error: { message: 'permission denied' } });

    await expect(listarMensagensConversa(MARIA, ZE)).rejects.toThrow('permission denied');
  });
});

describe('enviarMensagem', () => {
  it('salva a mensagem sem espacos nas pontas', async () => {
    const salva = mensagem();
    const { builder } = mockarSupabase({ data: salva, error: null });

    await expect(
      enviarMensagem({
        idRemetente: MARIA,
        idDestinatario: ZE,
        mensagem: '  Esse friso ainda está disponível?  ',
      }),
    ).resolves.toEqual(salva);

    expect(argumentosDe(builder, 'insert')[0]).toEqual({
      id_remetente: MARIA,
      id_destinatario: ZE,
      mensagem: 'Esse friso ainda está disponível?',
    });
  });

  it.each([['   '], [''], ['\n\t']])(
    'recusa a mensagem vazia %p sem tocar no banco',
    async (texto) => {
      const { cliente } = mockarSupabase({ data: null, error: null });

      await expect(
        enviarMensagem({ idRemetente: MARIA, idDestinatario: ZE, mensagem: texto }),
      ).rejects.toThrow('Digite uma mensagem antes de enviar.');

      expect(cliente.from).not.toHaveBeenCalled();
    },
  );

  it('esconde o detalhe tecnico quando o banco recusa a insercao', async () => {
    mockarSupabase({ data: null, error: { message: 'invalid input syntax for type bigint' } });

    await expect(
      enviarMensagem({ idRemetente: MARIA, idDestinatario: ZE, mensagem: 'Olá' }),
    ).rejects.toThrow('Nao foi possivel enviar sua mensagem agora.');
  });

  it('avisa sobre falha de conexao ao enviar', async () => {
    mockarSupabase({ data: null, error: new TypeError('Failed to fetch') });

    await expect(
      enviarMensagem({ idRemetente: MARIA, idDestinatario: ZE, mensagem: 'Olá' }),
    ).rejects.toThrow('Não foi possível se conectar ao servidor. Tente novamente em instantes.');
  });
});

describe('listarConversasAtivas', () => {
  it('agrupa por interlocutor, guardando a mensagem mais recente', async () => {
    mockarSupabase({
      data: [
        mensagem({ id: 3, created_at: '2026-01-03T10:00:00.000Z', id_remetente: ZE, id_destinatario: MARIA, mensagem: 'Sim, tenho!' }),
        mensagem({ id: 2, created_at: '2026-01-02T10:00:00.000Z' }),
        mensagem({ id: 1, created_at: '2026-01-01T10:00:00.000Z' }),
      ],
      error: null,
    });

    const conversas = await listarConversasAtivas(MARIA);

    expect(conversas).toHaveLength(1);
    expect(conversas[0].outroUsuarioId).toBe(ZE);
    expect(conversas[0].ultimaMensagem.id).toBe(3);
  });

  it('identifica o interlocutor tanto em mensagens enviadas quanto recebidas', async () => {
    mockarSupabase({
      data: [
        mensagem({ id: 5, id_remetente: MARIA, id_destinatario: ZE }),
        mensagem({ id: 6, id_remetente: 9, id_destinatario: MARIA }),
      ],
      error: null,
    });

    const conversas = await listarConversasAtivas(MARIA);

    expect(conversas.map((conversa) => conversa.outroUsuarioId)).toEqual([ZE, 9]);
  });

  it('compara ids como texto, aceitando id numerico ou string', async () => {
    mockarSupabase({
      data: [mensagem({ id_remetente: '42', id_destinatario: ZE })],
      error: null,
    });

    const conversas = await listarConversasAtivas(42);

    expect(conversas[0].outroUsuarioId).toBe(ZE);
  });

  it('busca as mensagens da mais recente para a mais antiga', async () => {
    const { builder } = mockarSupabase({ data: [], error: null });

    await listarConversasAtivas(MARIA);

    expect(argumentosDe(builder, 'or')[0]).toBe('id_remetente.eq.42,id_destinatario.eq.42');
    expect(argumentosDe(builder, 'order')).toEqual(['created_at', { ascending: false }]);
  });

  it('devolve lista vazia quando nao ha conversas', async () => {
    mockarSupabase({ data: null, error: null });

    await expect(listarConversasAtivas(MARIA)).resolves.toEqual([]);
  });

  it('avisa quando a consulta falha', async () => {
    mockarSupabase({ data: null, error: { message: 'timeout ao consultar o supabase' } });

    await expect(listarConversasAtivas(MARIA)).rejects.toThrow(
      'Nao foi possivel carregar seus chats agora.',
    );
  });
});

describe('assinarMensagensConversa', () => {
  function assinar() {
    const { cliente, canal } = mockarSupabase({ data: [], error: null });
    const onNovaMensagem = jest.fn();
    const cancelar = assinarMensagensConversa({
      usuarioAtualId: MARIA,
      outroUsuarioId: ZE,
      onNovaMensagem,
    });
    const [, , handler] = canal.on.mock.calls[0];

    return { cliente, canal, onNovaMensagem, cancelar, handler };
  }

  it('assina os inserts da tabela de mensagens em um canal proprio do par', () => {
    const { cliente, canal } = assinar();

    expect(cliente.channel).toHaveBeenCalledWith('mensagens:42:5');
    expect(canal.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'mensagens' },
      expect.any(Function),
    );
    expect(canal.subscribe).toHaveBeenCalled();
  });

  it.each([
    ['enviada pelo usuario', { id_remetente: MARIA, id_destinatario: ZE }],
    ['recebida do interlocutor', { id_remetente: ZE, id_destinatario: MARIA }],
  ])('notifica a mensagem %s', (_descricao, campos) => {
    const { onNovaMensagem, handler } = assinar();
    const nova = mensagem(campos);

    handler({ new: nova });

    expect(onNovaMensagem).toHaveBeenCalledWith(nova);
  });

  it.each([
    ['de outra conversa', { id_remetente: 9, id_destinatario: MARIA }],
    ['entre terceiros', { id_remetente: 9, id_destinatario: 8 }],
    ['enviada pelo usuario a outra pessoa', { id_remetente: MARIA, id_destinatario: 9 }],
  ])('ignora a mensagem %s', (_descricao, campos) => {
    const { onNovaMensagem, handler } = assinar();

    handler({ new: mensagem(campos) });

    expect(onNovaMensagem).not.toHaveBeenCalled();
  });

  it('ignora eventos sem a linha nova', () => {
    const { onNovaMensagem, handler } = assinar();

    handler({ new: null });

    expect(onNovaMensagem).not.toHaveBeenCalled();
  });

  it('remove o canal ao cancelar a assinatura', () => {
    const { cliente, canal, cancelar } = assinar();

    cancelar();

    expect(cliente.removeChannel).toHaveBeenCalledWith(canal);
  });
});

describe('assinarMensagensUsuario', () => {
  function assinar() {
    const { cliente, canal } = mockarSupabase({ data: [], error: null });
    const onNovaMensagem = jest.fn();
    const cancelar = assinarMensagensUsuario({ usuarioAtualId: MARIA, onNovaMensagem });
    const [, , handler] = canal.on.mock.calls[0];

    return { cliente, canal, onNovaMensagem, cancelar, handler };
  }

  it('usa um canal proprio do usuario', () => {
    const { cliente } = assinar();

    expect(cliente.channel).toHaveBeenCalledWith('mensagens-usuario:42');
  });

  it.each([
    ['enviada pelo usuario', { id_remetente: MARIA, id_destinatario: 9 }],
    ['recebida de qualquer pessoa', { id_remetente: 9, id_destinatario: MARIA }],
  ])('notifica a mensagem %s', (_descricao, campos) => {
    const { onNovaMensagem, handler } = assinar();
    const nova = mensagem(campos);

    handler({ new: nova });

    expect(onNovaMensagem).toHaveBeenCalledWith(nova);
  });

  it('ignora mensagens entre terceiros', () => {
    const { onNovaMensagem, handler } = assinar();

    handler({ new: mensagem({ id_remetente: 9, id_destinatario: 8 }) });

    expect(onNovaMensagem).not.toHaveBeenCalled();
  });

  it('remove o canal ao cancelar a assinatura', () => {
    const { cliente, canal, cancelar } = assinar();

    cancelar();

    expect(cliente.removeChannel).toHaveBeenCalledWith(canal);
  });
});
