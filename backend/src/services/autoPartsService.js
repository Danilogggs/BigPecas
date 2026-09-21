const AppError = require('../utils/AppError');

function montarEndpoint(apiUrl, langId, oem) {
  let endpoint;
  try {
    endpoint = new URL(apiUrl);
  } catch {
    throw new AppError(503, 'A consulta ao catálogo ainda não foi configurada no servidor.');
  }

  const basePath = endpoint.pathname.replace(/\/+$/, '');
  endpoint.pathname = `${basePath.endsWith('/api') ? basePath : `${basePath}/api`}/articles-oem/search-by-article-oem-no`;
  endpoint.search = '';
  endpoint.searchParams.set('langId', String(langId));
  endpoint.searchParams.set('articleOemNo', oem);
  return endpoint;
}

function obterRegistros(payload) {
  if (payload === null || payload === undefined) return [];
  if (Array.isArray(payload)) return payload;
  const listKeys = ['data', 'results', 'items', 'articles', 'content', 'value'];
  const possibleLists = listKeys.map((key) => payload[key]);
  const list = possibleLists.find(Array.isArray);
  if (list) return list;
  if (listKeys.some((key) => Object.prototype.hasOwnProperty.call(payload, key) && payload[key] == null)) return [];
  throw new AppError(502, 'O catálogo retornou uma resposta que não pôde ser interpretada.');
}

function primeiroValor(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function mapearCorrespondencia(record, searchedOem) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;

  const match = {
    articleId: primeiroValor(record, ['articleId', 'article_id', 'id', 'articleOemId']),
    searchedOem,
    articleNumber: primeiroValor(record, ['articleNo', 'articleNumber', 'article_number', 'oemNo', 'articleOemNo']),
    productName: primeiroValor(record, ['productName', 'product_name', 'genericArticleName', 'articleName', 'name']),
    manufacturer: primeiroValor(record, ['manufacturer', 'manufacturerName', 'brandName', 'supplierName', 'brand']),
    image: primeiroValor(record, ['image', 'imageUrl', 'image_url', 'pictureUrl', 'thumbnail']),
  };

  return Object.fromEntries(Object.entries(match).filter(([, value]) => value !== undefined));
}

function criarAutoPartsService({ fetchImpl = global.fetch, env = process.env } = {}) {
  return Object.freeze({
    async verificarOem(oem) {
      const apiUrl = env.AUTOPARTS_API_URL;
      const apiKey = env.AUTOPARTS_API_KEY;
      const langId = env.AUTOPARTS_LANG_ID || '4';
      if (!apiUrl || !apiKey) {
        throw new AppError(503, 'A consulta ao catálogo ainda não foi configurada no servidor.');
      }
      if (typeof fetchImpl !== 'function') {
        throw new AppError(503, 'A consulta ao catálogo não está disponível neste servidor.');
      }

      const endpoint = montarEndpoint(apiUrl, langId, oem);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetchImpl(endpoint, {
          method: 'GET',
          headers: { 'x-apiprofile-key': apiKey },
          signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403) {
          throw new AppError(502, 'O catálogo recusou a credencial configurada no servidor.');
        }
        if (!response.ok) {
          throw new AppError(502, 'O catálogo externo está indisponível no momento.');
        }

        let payload;
        try {
          payload = JSON.parse(await response.text());
        } catch {
          throw new AppError(502, 'O catálogo retornou uma resposta que não pôde ser interpretada.');
        }

        const records = obterRegistros(payload);
        const matches = records.map((record) => mapearCorrespondencia(record, oem)).filter(Boolean).slice(0, 5);
        return { oem, found: records.length > 0, count: records.length, matches };
      } catch (error) {
        if (error?.name === 'AbortError') {
          throw new AppError(504, 'A consulta ao catálogo demorou mais que o esperado. Tente novamente.');
        }
        if (error instanceof AppError) throw error;
        throw new AppError(502, 'Não foi possível acessar o catálogo externo no momento.');
      } finally {
        clearTimeout(timeout);
      }
    },
  });
}

module.exports = { criarAutoPartsService, montarEndpoint, obterRegistros };
