import { useCurrency } from '../../../contexts/CurrencyContext';
import { useEffect, useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import * as pecasGatewayPadrao from '../../../services/pecasService';
import { parseUnexpectedError } from '../../../utils/friendlyErrors';
import {
  buscarNomeOpcao,
  PRECO_MAXIMO_FILTRO,
  precoParaSlider,
  sliderParaPreco,
} from '../domain/peca';
import { formatarPrecoPeca } from '../presentation/pecaPresentation';

const TAMANHO_PAGINA = 24;

export default function useCatalogoPecas({ searchParams, gateway = pecasGatewayPadrao }) {
  const { t } = useLanguage();
  const money = useCurrency();
  const moeda = money?.currency || 'BRL';
  const [showFilters, setShowFilters] = useState(false);
  const [pecas, setPecas] = useState([]);
  const [totalPecas, setTotalPecas] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [wishIds, setWishIds] = useState(() => new Set());
  const [wishLoadingId, setWishLoadingId] = useState(null);
  const [filters, setFilters] = useState({
    nome: searchParams.get('nome') || '',
    categoria_id: searchParams.get('categoria_id') || '',
    condicao: '',
    min_preco: Number(searchParams.get('min_preco')) || 0,
    max_preco: Number(searchParams.get('max_preco')) || PRECO_MAXIMO_FILTRO,
  });
  const [sort, setSort] = useState('preco');
  const [ordem, setOrdem] = useState('asc');

  useEffect(() => {
    async function carregarCategorias() {
      try {
        const data = await gateway.listarCategorias();
        setCategorias(Array.isArray(data) ? data : []);
      } catch (error) {
        setErrorMessage(error?.message || 'Não foi possível carregar as categorias agora.');
      } finally {
        setLoadingCategorias(false);
      }
    }
    carregarCategorias();
  }, [gateway]);

  useEffect(() => {
    setFilters((anteriores) => ({
      ...anteriores,
      nome: searchParams.get('nome') || '',
      categoria_id: searchParams.get('categoria_id') || '',
    }));
  }, [searchParams]);

  useEffect(() => {
    if (!feedbackMessage) return undefined;
    const timer = window.setTimeout(() => setFeedbackMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  async function fetchPecas(page = 1, append = false) {
    const params = { ...filters, moeda, sort, ordem, page, limit: TAMANHO_PAGINA };
    if (append) setLoadingMore(true);
    else setLoading(true);
    setErrorMessage('');

    try {
      const result = await gateway.listarPecas(params);
      const novosItens = Array.isArray(result?.data) ? result.data : [];
      setPecas((anteriores) => append ? [...anteriores, ...novosItens] : novosItens);
      setTotalPecas(result?.total ?? novosItens.length);
      setHasMore(result?.hasMore ?? false);
      setCurrentPage(page);

      try {
        const wishData = await gateway.listarWish();
        const pecasWish = Array.isArray(wishData?.pecas) ? wishData.pecas : [];
        setWishIds(new Set(pecasWish.map((peca) => String(peca.id))));
      } catch {
        // A lista de desejos não impede o carregamento do catálogo.
      }
    } catch (error) {
      if (!append) setPecas([]);
      setErrorMessage(parseUnexpectedError(error, t('loadError')));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    fetchPecas(1);
  }, [sort, ordem, moeda]);

  useEffect(() => {
    const delay = setTimeout(() => fetchPecas(1), 400);
    return () => clearTimeout(delay);
  }, [filters]);

  function handleChange(event) {
    setFilters((anteriores) => ({ ...anteriores, [event.target.name]: event.target.value }));
  }

  function handleSortClick(campo) {
    if (sort === campo) setOrdem(ordem === 'asc' ? 'desc' : 'asc');
    else {
      setSort(campo);
      setOrdem('asc');
    }
  }

  async function handleWishClick(event, peca) {
    event.preventDefault();
    event.stopPropagation();
    if (!peca?.id || wishLoadingId) return;

    const pecaId = String(peca.id);
    const jaEstaNaWish = wishIds.has(pecaId);
    setWishLoadingId(peca.id);
    setFeedbackMessage('');

    try {
      if (jaEstaNaWish) {
        await gateway.removerPecaWish(peca.id);
        setWishIds((anteriores) => {
          const atualizados = new Set(anteriores);
          atualizados.delete(pecaId);
          return atualizados;
        });
        setFeedbackMessage(t('removedWishlist'));
      } else {
        await gateway.adicionarPecaWish(peca.id);
        setWishIds((anteriores) => new Set(anteriores).add(pecaId));
        setFeedbackMessage(t('addedWishlist'));
      }
    } catch (error) {
      setFeedbackMessage(parseUnexpectedError(error, t('wishlistError')));
    } finally {
      setWishLoadingId(null);
    }
  }

  return {
    buscarNomeCategoria: (id) => buscarNomeOpcao(categorias, id, t('categoryUnknown')),
    categorias,
    errorMessage,
    feedbackMessage,
    filters,
    formatarPreco: money ? (v) => money.format(v, moeda) : formatarPrecoPeca,
    handleCarregarMais: () => fetchPecas(currentPage + 1, true),
    handleChange,
    handleSortClick,
    handleWishClick,
    hasMore,
    loading,
    loadingCategorias,
    loadingMore,
    ordem,
    pecas,
    precoParaSlider,
    setFilters,
    setShowFilters,
    shouldShowEmptyState: !loading && !errorMessage && pecas.length === 0,
    showFilters,
    sliderParaPreco,
    sort,
    totalPecas,
    wishIds,
    wishLoadingId,
  };
}
