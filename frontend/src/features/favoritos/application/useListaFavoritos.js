import { useEffect, useState } from 'react';
import * as gatewayPadrao from '../infrastructure/wishlistGateway';
import { extrairPecasFavoritas, removerFavoritoDaLista } from '../domain/favorito';
import { parseUnexpectedError } from '../../../utils/friendlyErrors';

export default function useListaFavoritos({ t, gateway = gatewayPadrao }) {
  const [pecas, setPecas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function carregar() {
    setLoading(true);
    setErrorMessage('');
    try {
      setPecas(extrairPecasFavoritas(await gateway.listarWish()));
    } catch (error) {
      setPecas([]);
      setErrorMessage(parseUnexpectedError(error, t('wishlistLoadFailed')));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);
  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = window.setTimeout(() => setSuccessMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  async function remover(event, pecaId) {
    event.stopPropagation();
    if (!pecaId || removingId) return;
    setRemovingId(pecaId);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await gateway.removerPecaWish(pecaId);
      setPecas((atuais) => removerFavoritoDaLista(atuais, pecaId));
      setSuccessMessage('Peça removida da sua lista de desejos.');
    } catch (error) {
      setErrorMessage(parseUnexpectedError(error, t('wishlistRemoveFailed')));
    } finally {
      setRemovingId(null);
    }
  }

  return {
    errorMessage, handleRemover: remover, loading, pecas, removingId, successMessage,
    wishVazia: !loading && !errorMessage && pecas.length === 0,
  };
}
