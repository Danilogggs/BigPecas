const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:3002';

export async function cadastrarUsuario(dados) {
  const response = await fetch(`${USER_SERVICE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });

  const json = await response.json();

  if (!response.ok) {
    const mensagem =
      json.errors?.map((e) => e.msg).join(', ') ||
      json.message ||
      'Erro ao cadastrar usuário.';
    throw new Error(mensagem);
  }

  return json;
}
