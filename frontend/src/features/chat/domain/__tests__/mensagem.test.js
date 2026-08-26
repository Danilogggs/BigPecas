import {
  adicionarMensagemSemDuplicar,
  agruparConversas,
  criarFiltroConversa,
  pertenceAConversa,
} from '../mensagem';

describe('domínio de chat', () => {
  it('cria o filtro bidirecional da conversa', () => {
    expect(criarFiltroConversa(1, 2)).toBe(
      'and(id_remetente.eq.1,id_destinatario.eq.2),and(id_remetente.eq.2,id_destinatario.eq.1)',
    );
    expect(pertenceAConversa({ id_remetente: '2', id_destinatario: 1 }, 1, 2)).toBe(true);
  });

  it('agrupa mensagens pela outra pessoa preservando a primeira recebida', () => {
    const mensagens = [
      { id: 2, id_remetente: 2, id_destinatario: 1 },
      { id: 1, id_remetente: 1, id_destinatario: 2 },
    ];
    expect(agruparConversas(mensagens, 1)).toEqual([
      { outroUsuarioId: 2, ultimaMensagem: mensagens[0] },
    ]);
  });

  it('não duplica eventos realtime e pode ordenar cronologicamente', () => {
    const antiga = { id: 1, created_at: '2026-01-02' };
    const nova = { id: 2, created_at: '2026-01-01' };
    expect(adicionarMensagemSemDuplicar([antiga], antiga)).toEqual([antiga]);
    expect(adicionarMensagemSemDuplicar([antiga], nova, true).map((item) => item.id)).toEqual([2, 1]);
  });
});
