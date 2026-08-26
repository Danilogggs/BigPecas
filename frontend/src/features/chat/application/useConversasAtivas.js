import { useCallback, useEffect, useMemo, useState } from 'react';
import * as mensagensGatewayPadrao from '../infrastructure/supabaseMensagensGateway';
import * as perfilGatewayPadrao from '../../usuarios/infrastructure/perfilGateway';
import { parseUnexpectedError } from '../../../utils/friendlyErrors';

export default function useConversasAtivas({
  user, loadingAuth, t,
  mensagensGateway = mensagensGatewayPadrao,
  perfilGateway = perfilGatewayPadrao,
}) {
  const [perfilAtual, setPerfilAtual] = useState(null);
  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const carregar = useCallback(async () => {
    if (loadingAuth || !user?.id) { setLoading(false); return; }
    setLoading(true);
    setErrorMessage('');
    try {
      const perfil = await perfilGateway.buscarPerfil();
      const normalizado = perfil?.profile || perfil;
      setPerfilAtual(normalizado);
      if (!normalizado?.id) { setConversas([]); return; }
      const ativas = await mensagensGateway.listarConversasAtivas(normalizado.id);
      setConversas(await Promise.all(ativas.map(async (conversa) => {
        try {
          const usuario = await perfilGateway.buscarUsuario(conversa.outroUsuarioId);
          return { ...conversa, usuario: usuario?.profile || usuario };
        } catch (error) {
          console.error('Erro ao carregar usuario da conversa:', error);
          return { ...conversa, usuario: null };
        }
      })));
    } catch (error) {
      setErrorMessage(parseUnexpectedError(error, t('chatsLoadFailed')));
    } finally {
      setLoading(false);
    }
  }, [loadingAuth, user?.id]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    if (!perfilAtual?.id) return undefined;
    return mensagensGateway.assinarMensagensUsuario({
      usuarioAtualId: perfilAtual.id,
      onNovaMensagem: carregar,
    });
  }, [carregar, perfilAtual?.id]);

  return {
    conversas, errorMessage, loading, perfilAtual,
    conversasVazias: useMemo(
      () => !loading && !errorMessage && conversas.length === 0,
      [conversas.length, errorMessage, loading],
    ),
  };
}
