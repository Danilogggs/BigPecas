Teste de envio de e-mail (Mailgun / Resend)

Este documento explica como testar o envio de e-mail a partir do backend local.

Pré-requisitos
- Ter as dependências instaladas no diretório `backend`:

```bash
cd backend
npm install
```

Variáveis de ambiente necessárias (adicione em `backend/.env`):

- Para Mailgun (opcional/fallback):
  - `MAILGUN_API_KEY` — sua chave da API (ex: `key-...`)
  - `MAILGUN_DOMAIN` — domínio do Mailgun (ex: `sandbox....mailgun.org`)
  - `MAILGUN_API_URL` — opcional (ex: `https://api.eu.mailgun.net`)

- Para Resend (opcional/prioritário):
  - `RESEND_API_KEY` — sua chave da API Resend

- `EMAIL_NOTIFICACAO_VENDA_FROM` — remetente exibido (ex: `BigPeças <noreply@seudominio.com>`)
- `EMAIL_NOTIFICACAO_VENDA_ENABLED=true` — habilita envio globalmente
- `TEST_EMAIL_TO` — e-mail de destino do teste (opcional)

Como reproduzir o teste rapidamente

Opção A — criar e executar um script de teste (recomendado)

1. Crie o arquivo `backend/scripts/test-email-send.js` com este conteúdo (exatamente):

```js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { enviarNotificacaoVendaVendedor } = require('../src/services/emailService');

(async () => {
  try {
    const result = await enviarNotificacaoVendaVendedor({
      to: process.env.TEST_EMAIL_TO || 'you@example.com',
      vendedorNome: 'Teste Vendedor',
      clienteNome: 'Cliente Teste',
      pedidoId: 'TEST123',
      itens: [
        { nome: 'Parafuso M4', quantidade: 2, preco: 3.5 },
        { nome: 'Porca M4', quantidade: 4, preco: 1.25 },
      ],
      valorTotal: 12.5,
      codigoRastreio: '',
    });

    console.log('Resultado do envio:', result);
    process.exit(0);
  } catch (err) {
    console.error('Erro ao enviar e-mail de teste:', err);
    process.exit(1);
  }
})();
```

2. Execute:

```bash
cd backend
node scripts/test-email-send.js
```

Opção B — executar um teste ad-hoc sem criar arquivo

No diretório `backend`, rode este comando (substitua `you@example.com`):

```bash
node -e "require('dotenv').config(); (async ()=>{const {enviarNotificacaoVendaVendedor}=require('./src/services/emailService'); const r=await enviarNotificacaoVendaVendedor({to:process.env.TEST_EMAIL_TO||'you@example.com', vendedorNome:'Teste', clienteNome:'Cliente', pedidoId:'TEST', itens:[], valorTotal:0}); console.log(r); process.exit(0)})();"
```

O que esperar

- Se `MAILGUN_API_KEY` e `MAILGUN_DOMAIN` estiverem configurados, o envio usará Mailgun.
- Se `RESEND_API_KEY` estiver configurado, o envio usará Resend (prioritário).
- A resposta impressa indicará `sent: true` em caso de sucesso e trará o `id` retornado pelo provedor.

Observações

- Remova o script de teste quando não precisar mais dele; o conteúdo acima pode ser reusado a qualquer momento.
- Não compartilhe chaves públicas/privadas em repositórios públicos.
