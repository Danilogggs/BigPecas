import { useEffect, useMemo, useState } from 'react';
import * as mensagensGatewayPadrao from '../infrastructure/supabaseMensagensGateway';
import * as perfilGatewayPadrao from '../../usuarios/infrastructure/perfilGateway';
import { adicionarMensagemSemDuplicar, nomeParticipante } from '../domain/mensagem';
import { parseUnexpectedError } from '../../../utils/friendlyErrors';

export default function useConversa({
  id, user, loadingAuth, t,
  mensagensGateway = mensagensGatewayPadrao,
  perfilGateway = perfilGatewayPadrao,
}) {
  const [destinatario, setDestinatario] = useState(null);
  const [perfilAtual, setPerfilAtual] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const usuarioAtualId = perfilAtual?.id;
  const destinatarioId = destinatario?.id;
  const conversaComigoMesmo = Boolean(
    usuarioAtualId && destinatarioId && String(usuarioAtualId) === String(destinatarioId),
  );

  useEffect(() => {
    (async () => {
      if (loadingAuth || !user?.id || !id) { setLoading(false); return; }
      setLoading(true);
      setErrorMessage('');
      try {
        const [perfil, outro] = await Promise.all([
          perfilGateway.buscarPerfil(), perfilGateway.buscarUsuario(id),
        ]);
        const atual = perfil?.profile || perfil;
        const destino = outro?.profile || outro;
        setPerfilAtual(atual);
        setDestinatario(destino);
        if (atual?.id && destino?.id && String(atual.id) !== String(destino.id)) {
          const data = await mensagensGateway.listarMensagensConversa(atual.id, destino.id);
          setMensagens(Array.isArray(data) ? data : []);
        } else setMensagens([]);
      } catch (error) {
        setErrorMessage(parseUnexpectedError(error, t('chatOpenFailed')));
      } finally { setLoading(false); }
    })();
  }, [id, loadingAuth, user?.id]);

  useEffect(() => {
    if (!usuarioAtualId || !destinatarioId || conversaComigoMesmo) return undefined;
    return mensagensGateway.assinarMensagensConversa({
      usuarioAtualId,
      outroUsuarioId: destinatarioId,
      onNovaMensagem: (nova) => setMensagens((atuais) => adicionarMensagemSemDuplicar(atuais, nova, true)),
    });
  }, [conversaComigoMesmo, destinatarioId, usuarioAtualId]);

  async function enviar(event) {
    event.preventDefault();
    if (!usuarioAtualId || !destinatarioId || enviando) return;
    setEnviando(true);
    setErrorMessage('');
    try {
      const nova = await mensagensGateway.enviarMensagem({
        idRemetente: usuarioAtualId, idDestinatario: destinatarioId, mensagem: texto,
      });
      setMensagens((atuais) => adicionarMensagemSemDuplicar(atuais, nova));
      setTexto('');
    } catch (error) {
      setErrorMessage(parseUnexpectedError(error, t('messageSendFailed')));
    } finally { setEnviando(false); }
  }

  return {
    conversaComigoMesmo, destinatario, destinatarioIdMensagens: destinatarioId,
    enviando, errorMessage, handleEnviarMensagem: enviar, loading, mensagens,
    nomeDestinatario: useMemo(() => nomeParticipante(destinatario), [destinatario]),
    perfilAtual, setTexto, texto, usuarioAtualIdMensagens: usuarioAtualId,
  };
}
