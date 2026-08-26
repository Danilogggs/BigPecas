const AppError = require('../../../utils/AppError');
const {
  STATUS_PEDIDO,
  STATUS_VALIDOS,
  calcularValorItens,
  gerarCodigoRastreio,
  gerarNumeroPedido,
  montarCompra,
  montarVenda,
  nomeUsuario,
  statusEhValido,
  transicaoEhPermitida,
} = require('../domain/pedido');

function criarPedidosUseCases({
  repository,
  vendasService,
  emailService,
  clock = () => new Date(),
  random = Math.random,
  logger = console,
}) {
  async function obterUsuarioAtual(identidade) {
    const email = identidade?.email || identidade?.user?.email || null;

    if (!email) {
      throw new AppError(401, 'Não foi possível identificar o usuário autenticado.');
    }

    const usuario = await repository.buscarUsuarioPorEmail(email);
    if (!usuario?.id) throw new AppError(404, 'Usuário não encontrado.');
    return usuario;
  }

  async function buscarPecasPorIds(ids) {
    const pecas = await repository.buscarPecasPorIds(ids);
    return new Map(pecas.map((peca) => [String(peca.id), peca]));
  }

  async function buscarUsuariosPorIds(ids) {
    const usuarios = await repository.buscarUsuariosPorIds(ids);
    return new Map(usuarios.map((usuario) => [String(usuario.id), usuario]));
  }

  async function resolverItensDosPedidos(pedidos) {
    const idsPecas = pedidos.flatMap((pedido) =>
      Array.isArray(pedido.itens) ? pedido.itens.map((item) => item?.id) : [],
    );
    const pecasPorId = await buscarPecasPorIds(idsPecas);

    const fornecedorIds = [];
    const pedidosResolvidos = pedidos.map((pedido) => ({
      ...pedido,
      itens: (Array.isArray(pedido.itens) ? pedido.itens : []).map((item) => {
        const peca = pecasPorId.get(String(item.id));
        const fornecedorId = item.fornecedor_id ?? peca?.fornecedor_id ?? null;
        if (fornecedorId) fornecedorIds.push(fornecedorId);

        return {
          ...item,
          nome: item.nome || peca?.nome_peca || 'Peça',
          preco: Number(item.preco ?? peca?.preco ?? 0),
          quantidade: Number(item.quantidade || 1),
          imagem: item.imagem || peca?.imagem || null,
          sku: item.sku || peca?.sku || null,
          fornecedor_id: fornecedorId,
        };
      }),
    }));

    const fornecedoresPorId = await buscarUsuariosPorIds(fornecedorIds);

    return pedidosResolvidos.map((pedido) => ({
      ...pedido,
      itens: pedido.itens.map((item) => ({
        ...item,
        fornecedor_nome:
          item.fornecedor_nome || nomeUsuario(fornecedoresPorId.get(String(item.fornecedor_id))),
      })),
    }));
  }

  async function carregarHistorico(usuario) {
    const pedidos = await resolverItensDosPedidos(await repository.listarPedidos());
    const compras = pedidos
      .filter((pedido) => String(pedido.user_id) === String(usuario.id))
      .map(montarCompra);

    const pedidosComVenda = pedidos.filter((pedido) =>
      pedido.itens.some((item) => String(item.fornecedor_id) === String(usuario.id)),
    );
    const compradoresPorId = await buscarUsuariosPorIds(
      pedidosComVenda.map((pedido) => pedido.user_id),
    );
    const vendas = pedidosComVenda
      .map((pedido) => montarVenda(pedido, usuario.id, compradoresPorId))
      .filter(Boolean);

    return {
      perfil: { id: usuario.id, tipo_usuario: 'ambos', pode_vender: true },
      compras,
      vendas,
    };
  }

  async function enriquecerItensDoNovoPedido(itens) {
    const pecasPorId = await buscarPecasPorIds(itens.map((item) => item?.id));
    const pecasFaltantes = itens.filter((item) => !pecasPorId.has(String(item?.id)));

    if (pecasFaltantes.length > 0) {
      throw new AppError(400, 'Uma ou mais peças do pedido não estão mais disponíveis.');
    }

    const fornecedorIds = [...new Set(
      [...pecasPorId.values()].map((peca) => peca.fornecedor_id).filter(Boolean),
    )];
    const fornecedoresPorId = await buscarUsuariosPorIds(fornecedorIds);

    return itens.map((item) => {
      const peca = pecasPorId.get(String(item.id));
      const quantidade = Number(item.quantidade);

      if (!peca.fornecedor_id) {
        throw new AppError(409, `A peça ${peca.nome_peca} não possui um fornecedor vinculado.`);
      }
      if (!Number.isInteger(quantidade) || quantidade < 1) {
        throw new AppError(400, 'Informe uma quantidade válida para cada peça.');
      }
      if (quantidade > Number(peca.estoque_atual || 0)) {
        throw new AppError(409, `Estoque insuficiente para a peça ${peca.nome_peca}.`);
      }

      return {
        id: peca.id,
        nome: peca.nome_peca,
        preco: Number(peca.preco || 0),
        quantidade,
        imagem: peca.imagem || null,
        sku: peca.sku || null,
        fornecedor_id: peca.fornecedor_id,
        fornecedor_nome: nomeUsuario(fornecedoresPorId.get(String(peca.fornecedor_id))),
      };
    });
  }

  async function obterHistorico(identidade) {
    return carregarHistorico(await obterUsuarioAtual(identidade));
  }

  async function listarCompras(identidade) {
    const historico = await obterHistorico(identidade);
    return historico.compras;
  }

  async function obterPedido({ identidade, id, visao }) {
    const usuario = await obterUsuarioAtual(identidade);
    const pedidoSalvo = await repository.buscarPedidoPorId(id);
    if (!pedidoSalvo) throw new AppError(404, 'Pedido não encontrado.');

    const [pedido] = await resolverItensDosPedidos([pedidoSalvo]);
    const querVenda = ['venda', 'vendas'].includes(String(visao || '').toLowerCase());

    if (!querVenda && String(pedido.user_id) === String(usuario.id)) {
      return montarCompra(pedido);
    }

    const compradoresPorId = await buscarUsuariosPorIds([pedido.user_id]);
    const venda = montarVenda(pedido, usuario.id, compradoresPorId);
    if (venda) return venda;
    throw new AppError(404, 'Pedido não encontrado.');
  }

  async function criarPedido({ identidade, dados }) {
    const usuario = await obterUsuarioAtual(identidade);
    const { itens, frete, cupom, endereco, forma_pagamento } = dados;

    if (!Array.isArray(itens) || itens.length === 0) {
      throw new AppError(400, 'O pedido deve conter ao menos um item.');
    }
    if (!endereco) throw new AppError(400, 'Endereço de entrega é obrigatório.');
    if (!forma_pagamento) throw new AppError(400, 'Forma de pagamento é obrigatória.');

    const itensEnriquecidos = await enriquecerItensDoNovoPedido(itens);
    const subtotal = calcularValorItens(itensEnriquecidos);
    let desconto = 0;
    let valor_frete = Number(frete?.valor || 0);

    if (cupom) {
      if (cupom.tipo === 'percentual') desconto = subtotal * Number(cupom.valor || 0);
      if (cupom.tipo === 'frete_gratis') {
        desconto = valor_frete;
        valor_frete = 0;
      }
    }

    const agora = clock();
    const agoraIso = agora.toISOString();
    const novoPedido = {
      id: gerarNumeroPedido(agora, random),
      user_id: usuario.id,
      status: STATUS_PEDIDO.AGUARDANDO_PAGAMENTO,
      itens: itensEnriquecidos,
      frete,
      cupom: cupom || null,
      endereco,
      forma_pagamento,
      subtotal,
      desconto,
      valor_frete,
      total: Math.max(0, subtotal - desconto + valor_frete),
      codigo_rastreio: gerarCodigoRastreio(random),
      historico: [{ status: STATUS_PEDIDO.AGUARDANDO_PAGAMENTO, data: agoraIso }],
      criado_em: agoraIso,
    };

    const pedidoSalvo = await repository.criarPedido(novoPedido);
    return montarCompra(await vendasService.garantirVendasDoPedido(pedidoSalvo));
  }

  async function notificarAtualizacaoCliente({ comprador, pedidoAnterior, pedidoAtualizado }) {
    if (!comprador?.email) return;

    try {
      await emailService.enviarNotificacaoStatusPedidoCliente({
        to: comprador.email,
        clienteNome: nomeUsuario(comprador),
        pedidoId: pedidoAtualizado.id,
        statusAnterior: pedidoAnterior.status,
        statusAtual: pedidoAtualizado.status,
        itens: pedidoAtualizado.itens,
        valorTotal: pedidoAtualizado.total,
        codigoRastreio: pedidoAtualizado.codigo_rastreio || pedidoAtualizado.codigoRastreio,
        destinatarioUserId: comprador.id,
      });
    } catch (error) {
      logger.warn('Falha ao enviar e-mail de atualização de status ao cliente:', error);
    }
  }

  async function notificarVendedores({ comprador, pedidoAtualizado }) {
    try {
      const idsFornecedores = [...new Set(
        pedidoAtualizado.itens.map((item) => item.fornecedor_id).filter(Boolean),
      )];
      const vendedoresPorId = await buscarUsuariosPorIds(idsFornecedores);
      const clienteNome = comprador ? nomeUsuario(comprador) : 'Cliente BigPeças';

      await Promise.all(idsFornecedores.map(async (fornecedorId) => {
        const vendedor = vendedoresPorId.get(String(fornecedorId));
        if (!vendedor?.email || vendedor.receber_email_notificacao_venda === false) return;

        const itensDoFornecedor = pedidoAtualizado.itens.filter(
          (item) => String(item.fornecedor_id) === String(fornecedorId),
        );

        await emailService.enviarNotificacaoVendaVendedor({
          to: vendedor.email,
          vendedorNome: nomeUsuario(vendedor),
          clienteNome,
          pedidoId: pedidoAtualizado.id,
          itens: itensDoFornecedor,
          valorTotal: calcularValorItens(itensDoFornecedor),
          codigoRastreio: pedidoAtualizado.codigo_rastreio || pedidoAtualizado.codigoRastreio,
          destinatarioUserId: vendedor.id,
        });
      }));
    } catch (error) {
      logger.warn('Falha ao enviar e-mail de notificação de venda:', error);
    }
  }

  async function atualizarStatus({ identidade, id, status }) {
    const usuario = await obterUsuarioAtual(identidade);

    if (!status || !statusEhValido(status)) {
      throw new AppError(400, `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}.`);
    }

    const pedidoAtual = await repository.buscarPedidoPorId(id);
    if (!pedidoAtual) throw new AppError(404, 'Pedido não encontrado.');

    const [pedidoResolvido] = await resolverItensDosPedidos([pedidoAtual]);
    const fornecedorEnvolvido = pedidoResolvido.itens.some(
      (item) => String(item.fornecedor_id) === String(usuario.id),
    );
    const compradoresPorId = await buscarUsuariosPorIds([pedidoResolvido.user_id]);
    const comprador = compradoresPorId.get(String(pedidoResolvido.user_id));
    const compradorDoPedido =
      String(pedidoResolvido.user_id) === String(usuario.id) ||
      String(comprador?.email || '').toLowerCase() === String(usuario.email || '').toLowerCase();
    const compradorConfirmandoPagamento =
      status === STATUS_PEDIDO.PAGO &&
      pedidoAtual.status === STATUS_PEDIDO.AGUARDANDO_PAGAMENTO &&
      compradorDoPedido;

    if (status === STATUS_PEDIDO.ENTREGUE && !compradorDoPedido) {
      throw new AppError(403, 'Somente o comprador pode confirmar o recebimento do pedido.');
    }
    if (status !== STATUS_PEDIDO.ENTREGUE && !fornecedorEnvolvido && !compradorConfirmandoPagamento) {
      throw new AppError(403, 'Somente um fornecedor deste pedido pode atualizar este status.');
    }
    if (!transicaoEhPermitida(pedidoAtual.status, status)) {
      throw new AppError(409, 'Essa alteração de status não é permitida para o pedido atual.');
    }

    const historico = [
      ...(pedidoAtual.historico || []),
      { status, data: clock().toISOString() },
    ];
    const pedidoSalvo = await repository.atualizarStatus(id, status, historico);
    const [pedidoResolvidoAtualizado] = await resolverItensDosPedidos([pedidoSalvo]);
    const pedidoAtualizado = await vendasService.garantirVendasDoPedido(pedidoResolvidoAtualizado);
    await vendasService.sincronizarStatusVendas(pedidoAtualizado);

    await notificarAtualizacaoCliente({ comprador, pedidoAnterior: pedidoAtual, pedidoAtualizado });
    if (status === STATUS_PEDIDO.PAGO) {
      await notificarVendedores({ comprador, pedidoAtualizado });
    }

    if (compradorDoPedido) return montarCompra(pedidoAtualizado);
    return montarVenda(pedidoAtualizado, usuario.id, compradoresPorId);
  }

  return Object.freeze({
    atualizarStatus,
    criarPedido,
    listarCompras,
    obterHistorico,
    obterPedido,
  });
}

module.exports = criarPedidosUseCases;
