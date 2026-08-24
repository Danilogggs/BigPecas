/**
 * Monta uma resposta compativel com o que os serviços usam do `fetch`:
 * `ok`, `status`, `json()`, `text()`, `headers.get()` e `clone()` — este último
 * é usado por `parseErrorResponse` para ler o corpo mais de uma vez.
 */
export function criarResposta({ ok = true, status = 200, body = {}, headers = {} } = {}) {
  const cabecalhos = new Headers(
    Object.fromEntries(
      Object.entries(headers).map(([chave, valor]) => [chave, String(valor)]),
    ),
  );

  const texto = typeof body === 'string' ? body : JSON.stringify(body);

  const resposta = {
    ok,
    status,
    headers: cabecalhos,
    json: async () => JSON.parse(texto),
    text: async () => texto,
    clone: () => resposta,
  };

  return resposta;
}

export function respostaDeErro(status, body) {
  return criarResposta({ ok: false, status, body });
}

/** Sessão válida devolvida por `supabase.auth.getSession()`. */
export function sessaoValida(token = 'token-de-teste') {
  return { data: { session: { access_token: token } }, error: null };
}

export function cabecalhosEsperados(token = 'token-de-teste') {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}
