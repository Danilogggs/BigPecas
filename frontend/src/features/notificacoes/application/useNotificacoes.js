import { useEffect, useState } from 'react';
import * as gatewayPadrao from '../infrastructure/notificacoesGateway';
import { marcarNotificacaoLida } from '../domain/notificacao';

export default function useNotificacoes({ gateway = gatewayPadrao } = {}) {
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await gateway.listarNotificacoes();
        if (active) setNotificacoes(data);
      } catch (falha) {
        if (active) setError(falha?.message || 'Não foi possível carregar suas notificações.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [gateway]);

  async function marcarComoLida(id) {
    try {
      const resposta = await gateway.marcarNotificacaoComoLida(id);
      setNotificacoes((atuais) => marcarNotificacaoLida(
        atuais,
        id,
        resposta?.notificacao?.lida_em,
      ));
    } catch (falha) {
      setError(falha?.message || 'Não foi possível atualizar a notificação.');
    }
  }

  return { error, loading, marcarComoLida, notificacoes };
}
