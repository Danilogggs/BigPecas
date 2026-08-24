const EMAIL_FROM = process.env.EMAIL_NOTIFICACAO_VENDA_FROM || 'BigPeças <noreply@bigpecas.com>';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_NOTIFICACAO_ENABLED = String(process.env.EMAIL_NOTIFICACAO_VENDA_ENABLED ?? 'true') === 'true';

// Mailgun config (optional)
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_API_URL = process.env.MAILGUN_API_URL; // optional (e.g., https://api.eu.mailgun.net)
const NOTIFICACOES_TABLE = process.env.SUPABASE_NOTIFICACOES_TABLE || 'notificacoes';

let supabaseAdmin = null;
try {
  ({ supabaseAdmin } = require('../config/supabaseClient'));
} catch {
  supabaseAdmin = null;
}

const STATUS_LABELS = {
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pagamento confirmado',
  enviado: 'Pedido enviado',
  entregue: 'Pedido entregue',
  cancelado: 'Pedido cancelado',
};

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

async function registrarNotificacao({
  userId,
  pedidoId = null,
  tipo,
  titulo,
  mensagem,
  statusEnvio = 'pendente',
}) {
  if (!supabaseAdmin || !userId) {
    return null;
  }

  const payload = {
    user_id: String(userId),
    pedido_id: pedidoId ? String(pedidoId) : null,
    tipo,
    titulo,
    mensagem,
    status_envio: statusEnvio,
  };

  const { error } = await supabaseAdmin.from(NOTIFICACOES_TABLE).insert(payload);
  if (error) throw error;
  return payload;
}

async function enviarEmail({ to, subject, html, text }) {
  if (!EMAIL_NOTIFICACAO_ENABLED) {
    return { sent: false, reason: 'email_notificacao_desabilitado' };
  }

  if (!to) {
    return { sent: false, reason: 'email_destinatario_nao_definido' };
  }

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
        subject,
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
        subject,
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

async function enviarNotificacaoVendaVendedor({
  to,
  vendedorNome,
  clienteNome,
  pedidoId,
  itens = [],
  valorTotal = 0,
  codigoRastreio,
  destinatarioUserId = null,
}) {
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

  let result;
  try {
    result = await enviarEmail({
      to,
      subject: `Venda confirmada — Pedido #${pedidoId}`,
      html,
      text,
    });
  } catch (error) {
    result = { sent: false, error };
  }

  try {
    await registrarNotificacao({
      userId: destinatarioUserId,
      pedidoId,
      tipo: 'venda_confirmada',
      titulo: 'Venda confirmada',
      mensagem: `Uma venda foi confirmada no pedido #${pedidoId}.`,
      statusEnvio: result.sent ? 'enviada' : 'pendente',
    });
  } catch (error) {
    console.warn('Falha ao registrar notificação de venda:', error);
  }

  return result;
}

async function enviarNotificacaoStatusPedidoCliente({
  to,
  clienteNome,
  pedidoId,
  statusAnterior,
  statusAtual,
  itens = [],
  valorTotal = 0,
  codigoRastreio,
  destinatarioUserId = null,
}) {
  const statusAnteriorTexto = STATUS_LABELS[statusAnterior] || statusAnterior || 'Status anterior';
  const statusAtualTexto = STATUS_LABELS[statusAtual] || statusAtual || 'Status atualizado';

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <div style="max-width: 640px; margin: 0 auto; background: #fffaf3; border: 1px solid #f0c060; border-radius: 16px; padding: 24px;">
        <h2 style="margin: 0 0 12px; color: #7B1D2E;">Atualização do seu pedido na BigPeças</h2>
        <p style="margin: 0 0 16px;">
          Olá, <strong>${clienteNome || 'cliente'}</strong>! O status do seu pedido foi atualizado.
        </p>

        <p style="margin: 0 0 16px;">
          <strong>Pedido:</strong> #${pedidoId}<br />
          <strong>Status anterior:</strong> ${statusAnteriorTexto}<br />
          <strong>Novo status:</strong> ${statusAtualTexto}<br />
          <strong>Data:</strong> ${formatDate(new Date().toISOString())}<br />
          <strong>Valor total:</strong> ${formatBRL(valorTotal)}
        </p>

        <h3 style="margin: 20px 0 12px; color: #7B1D2E;">Itens do pedido</h3>
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
          Você pode acompanhar os detalhes na área de <strong>Minhas compras</strong>.
        </p>
      </div>
    </div>
  `;

  const text = [
    'Atualização do seu pedido na BigPeças',
    `Olá, ${clienteNome || 'cliente'}!`,
    `Pedido: #${pedidoId}`,
    `Status anterior: ${statusAnteriorTexto}`,
    `Novo status: ${statusAtualTexto}`,
    `Valor total: ${formatBRL(valorTotal)}`,
    '',
    'Itens do pedido:',
    montarTextoItens(itens),
    codigoRastreio ? `Código de rastreio: ${codigoRastreio}` : '',
  ].filter(Boolean).join('\n');

  let result;
  try {
    result = await enviarEmail({
      to,
      subject: `Pedido #${pedidoId} atualizado: ${statusAtualTexto}`,
      html,
      text,
    });
  } catch (error) {
    result = { sent: false, error };
  }

  try {
    await registrarNotificacao({
      userId: destinatarioUserId,
      pedidoId,
      tipo: 'status_pedido',
      titulo: 'Status do pedido atualizado',
      mensagem: `O status do pedido #${pedidoId} mudou de ${statusAnteriorTexto} para ${statusAtualTexto}.`,
      statusEnvio: result.sent ? 'enviada' : 'pendente',
    });
  } catch (error) {
    console.warn('Falha ao registrar notificação de status:', error);
  }

  return result;
}

module.exports = {
  enviarNotificacaoVendaVendedor,
  enviarNotificacaoStatusPedidoCliente,
  registrarNotificacao,
};
