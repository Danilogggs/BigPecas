const EMAIL_FROM = process.env.EMAIL_NOTIFICACAO_VENDA_FROM || 'BigPeças <noreply@bigpecas.com>';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_NOTIFICACAO_ENABLED = String(process.env.EMAIL_NOTIFICACAO_VENDA_ENABLED ?? 'true') === 'true';

// Mailgun config (optional)
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_API_URL = process.env.MAILGUN_API_URL; // optional (e.g., https://api.eu.mailgun.net)

function formatBRL(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(dateValue) {
  const safeDate = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(safeDate.getTime())) return 'agora';

  return safeDate.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function montarTextoItens(itens = []) {
  return (itens || []).map((item) => {
    const nome = item?.nome || item?.nome_peca || 'Peça';
    const quantidade = Number(item?.quantidade || 1);
    const preco = Number(item?.preco || 0);
    return `- ${nome} — ${quantidade} unidade(s) — ${formatBRL(preco * quantidade)}`;
  }).join('\n');
}

async function enviarNotificacaoVendaVendedor({
  to,
  vendedorNome,
  clienteNome,
  pedidoId,
  itens = [],
  valorTotal = 0,
  codigoRastreio,
}) {
  if (!EMAIL_NOTIFICACAO_ENABLED) {
    return { sent: false, reason: 'email_notificacao_desabilitado' };
  }

  if (!to) {
    return { sent: false, reason: 'email_destinatario_nao_definido' };
  }

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <div style="max-width: 640px; margin: 0 auto; background: #fffaf3; border: 1px solid #f0c060; border-radius: 16px; padding: 24px;">
        <h2 style="margin: 0 0 12px; color: #7B1D2E;">Venda confirmada na BigPeças</h2>
        <p style="margin: 0 0 16px;">
          Olá, <strong>${vendedorNome || 'vendedor'}</strong>! Uma venda foi confirmada no seu catálogo.
        </p>

        <p style="margin: 0 0 16px;">
          <strong>Cliente:</strong> ${clienteNome || 'Cliente BigPeças'}<br />
          <strong>Pedido:</strong> #${pedidoId}<br />
          <strong>Data:</strong> ${formatDate(new Date().toISOString())}<br />
          <strong>Valor total:</strong> ${formatBRL(valorTotal)}
        </p>

        <h3 style="margin: 20px 0 12px; color: #7B1D2E;">Itens vendidos</h3>
        <ul style="margin: 0 0 16px; padding-left: 20px;">
          ${(itens || []).map((item) => {
            const nome = item?.nome || item?.nome_peca || 'Peça';
            const quantidade = Number(item?.quantidade || 1);
            const totalItem = Number(item?.preco || 0) * quantidade;
            return `<li><strong>${nome}</strong> — ${quantidade}x — ${formatBRL(totalItem)}</li>`;
          }).join('') || '<li>Peça(s) do pedido</li>'}
        </ul>

        ${codigoRastreio ? `<p style="margin: 0 0 8px;"><strong>Código de rastreio:</strong> ${codigoRastreio}</p>` : ''}

        <p style="margin: 16px 0 0;">
          Você pode acompanhar o status dessa venda na área de <strong>Minhas vendas</strong> do painel.
        </p>
      </div>
    </div>
  `;

  const text = [
    `Venda confirmada na BigPeças`,
    `Olá, ${vendedorNome || 'vendedor'}!`,
    `Cliente: ${clienteNome || 'Cliente BigPeças'}`,
    `Pedido: #${pedidoId}`,
    `Valor total: ${formatBRL(valorTotal)}`,
    '',
    'Itens vendidos:',
    montarTextoItens(itens),
    codigoRastreio ? `Código de rastreio: ${codigoRastreio}` : '',
  ].filter(Boolean).join('\n');

  // Prefer Resend if configured
  if (RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject: `Venda confirmada — Pedido #${pedidoId}`,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Falha ao enviar e-mail via Resend: ${body}`);
    }

    return { sent: true, provider: 'resend', response: await response.json() };
  }

  // Fallback to Mailgun if configured
  if (MAILGUN_API_KEY && MAILGUN_DOMAIN) {
    try {
      const FormData = require('form-data');
      const Mailgun = require('mailgun.js');
      const mailgun = new Mailgun(FormData);
      const mg = mailgun.client({
        username: 'api',
        key: MAILGUN_API_KEY,
        ...(MAILGUN_API_URL ? { url: MAILGUN_API_URL } : {}),
      });

      const mgResponse = await mg.messages.create(MAILGUN_DOMAIN, {
        from: EMAIL_FROM,
        to: [to],
        subject: `Venda confirmada — Pedido #${pedidoId}`,
        text,
        html,
      });

      return { sent: true, provider: 'mailgun', response: mgResponse };
    } catch (err) {
      throw new Error(`Falha ao enviar e-mail via Mailgun: ${String(err.message || err)}`);
    }
  }

  return { sent: false, reason: 'nenhum_provedor_configurado' };
}

module.exports = {
  enviarNotificacaoVendaVendedor,
};
