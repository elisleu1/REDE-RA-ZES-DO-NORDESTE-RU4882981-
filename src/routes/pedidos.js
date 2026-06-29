import express from "express";
import { AppDataSource } from "../data-source.js";
import autenticarToken from "../middleware/auth.js";
import authorizeRole from "../middleware/authorize.js";
import dotenv from "dotenv";
import { processarPagamentoExterno } from "../services/servicoPagamentoMock.js";
dotenv.config(); // carrega variáveis do .env

// Anonimização em relatórios
function anonimizarNome(nome) {
  if (!nome) return null;
  const partes = nome.split(" ");
  return partes[0][0] + "***";
}

const router = express.Router();

// Criar pedido (auth) [CLIENTE ou ADMIN]
router.post("/", autenticarToken, authorizeRole(["CLIENTE", "ADMIN"]), async (req, res) => {
  try {
    const { unidadeId, itens, metodoPagamento, canalPedido, localEntrega } = req.body;

    await AppDataSource.transaction(async (manager) => {
      const pedidoRepo = manager.getRepository("Pedido");
      const usuarioRepo = manager.getRepository("Usuario");
      const unidadeRepo = manager.getRepository("Unidade");
      const produtoRepo = manager.getRepository("Produto");
      const auditoriaRepo = manager.getRepository("Auditoria");

      // Buscar usuário
      const usuario = await usuarioRepo.findOne({ where: { id: req.usuario.id } });
      if (!usuario) throw new Error("Usuário não encontrado");

      // Buscar unidade
      const unidade = await unidadeRepo.findOne({ where: { id: unidadeId } });
      if (!unidade) throw new Error("Unidade não encontrada");

      // Calcular valor total e montar itens
      let valorTotal = 0;
      const itensPedido = [];

      for (const item of itens) {
        const produto = await produtoRepo.findOne({ where: { id: item.produtoId } });
        if (!produto) throw new Error(`Produto ${item.produtoId} não encontrado`);

        if (produto.estoque < item.quantidade) {
          throw new Error(`Estoque insuficiente para o produto ${produto.nome}`);
        }

        // Descontar estoque
        produto.estoque -= item.quantidade;
        await produtoRepo.save(produto);

        const precoUnitario = produto.preco;
        const subtotal = item.quantidade * precoUnitario;

        itensPedido.push({ produto, quantidade: item.quantidade, precoUnitario });
        valorTotal += subtotal;
      }

      // Criar pedido
      const pedido = pedidoRepo.create({
        usuario,
        unidade,
        status: "PENDENTE",
        metodoPagamento,
        dataPedido: new Date(),
        valorTotal,
        canalPedido: canalPedido || "APP",
        localEntrega,
        itens: itensPedido,
      });

      await pedidoRepo.save(pedido);

      // Auditoria de criação de pedido
      await auditoriaRepo.save({
        usuarioId: req.usuario.id,
        acao: "CRIAR_PEDIDO",
        recurso: "/pedidos",
        detalhes: JSON.stringify({
          pedidoId: pedido.id,
          unidadeId,
          itens: itens.map(i => ({
            produtoId: i.produtoId,
            quantidade: i.quantidade
          }))
        }),
      });

      // Retorno dentro da transação
      res.status(201).json({ message: "Pedido criado com sucesso", pedido });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar todos os pedidos (auth) ["ADMIN", "ATENDENTE"]
router.get("/", autenticarToken, authorizeRole(["ADMIN", "ATENDENTE"]), async (req, res) => {
  try {
    const pedidoRepo = AppDataSource.getRepository("Pedido");
    const pedidos = await pedidoRepo.find({
      relations: ["usuario", "unidade", "itens", "pagamentos"],
    });
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar pedido por ID
router.get("/:id", autenticarToken, authorizeRole(["ADMIN", "ATENDENTE", "CLIENTE"]), async (req, res) => {
  try {
    const pedidoRepo = AppDataSource.getRepository("Pedido");
    const pedidoId = parseInt(req.params.id);
    const pedido = await pedidoRepo.findOne({
      where: { id: pedidoId },
      relations: ["usuario", "unidade", "itens", "pagamentos"],
    });

    if (!pedido) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    // Restrição: CLIENTE só pode ver o próprio pedido
    if (req.usuario.role === "CLIENTE" && pedido.usuario.id !== req.usuario.id) {
      return res.status(403).json({ error: "Sem permissão para visualizar este pedido" });
    }

    res.json(pedido);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar pedidos filtrados por status
router.get("/status/:status", autenticarToken, authorizeRole(["ADMIN", "COZINHA", "ENTREGADOR"]), async (req, res) => {
  try {
    const pedidoRepo = AppDataSource.getRepository("Pedido");
    const auditoriaRepo = AppDataSource.getRepository("Auditoria");
    const { status } = req.params;

    const statusPermitidos = ["PENDENTE", "EM PRODUÇÃO", "PRONTO", "ENTREGUE", "CANCELADO"];
    if (!statusPermitidos.includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    const pedidos = await pedidoRepo.find({
      where: { status },
      relations: ["usuario", "unidade", "itens", "pagamentos"],
    });

    // Auditoria: só registra se a validação passou
    await auditoriaRepo.save({
      usuarioId: req.usuario.id,
      acao: "FILTRAR_PEDIDOS_POR_STATUS",
      recurso: `/pedidos/status/${status}`,
      detalhes: JSON.stringify({
        statusFiltrado: status,
        quantidadeResultados: pedidos.length
      }),
    });

    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PAGAR PEDIDO (auth) [CLIENTE ou ADMIN]
router.post("/:id/pagar", autenticarToken, authorizeRole(["CLIENTE", "ADMIN"]), async (req, res) => {
  try {
    const pedidoId = parseInt(req.params.id);
    const { metodo, valorPago } = req.body;

    await AppDataSource.transaction(async (manager) => {
      const pedidoRepo = manager.getRepository("Pedido");
      const pagamentoRepo = manager.getRepository("Pagamento");
      const fidelidadeRepo = manager.getRepository("Fidelidade");
      const auditoriaRepo = manager.getRepository("Auditoria");

      const pedido = await pedidoRepo.findOne({
        where: { id: pedidoId },
        relations: ["usuario", "usuario.fidelidade", "unidade"]
      });

      if (!pedido) throw new Error("Pedido não encontrado");

      // Impedir pagamento duplicado
      if (["PAGO", "EM PRODUÇÃO", "PRONTO", "ENTREGUE"].includes(pedido.status)) {
        throw new Error("Este pedido já foi pago ou não pode ser pago novamente");
      }

      // Validar valor pago
      if (parseFloat(valorPago) < parseFloat(pedido.valorTotal)) {
        throw new Error("Valor insuficiente para pagamento");
      }

      // Chamar serviço externo (mock)
      const resultado = await processarPagamentoExterno(metodo, valorPago);

      // Criar pagamento
      const pagamento = pagamentoRepo.create({
        metodo,
        valor: pedido.valorTotal,
        dataPagamento: new Date(),
        pedido: { id: pedido.id },
        codigoTransacao: resultado.codigoTransacao
      });
      await pagamentoRepo.save(pagamento);

      // Atualizar status do pedido
      pedido.status = "EM PRODUÇÃO";
      pedido.ultimaAcao = "PAGO";
      await pedidoRepo.save(pedido);

      // Atualizar / Criar pontos de fidelidade
      let fidelidade = await fidelidadeRepo.findOne({
        where: { usuario: { id: pedido.usuario.id } },
        relations: ["usuario"]
      });

      if (fidelidade) {
        fidelidade.pontos += Math.floor(parseFloat(pedido.valorTotal));
        await fidelidadeRepo.save(fidelidade);
      } else {
        const novaFidelidade = fidelidadeRepo.create({
          usuario: pedido.usuario,
          pontos: Math.floor(parseFloat(pedido.valorTotal))
        });
        await fidelidadeRepo.save(novaFidelidade);
      }

      // Auditoria completa
      await auditoriaRepo.save({
        usuarioId: req.usuario.id,
        acao: "PAGAR_PEDIDO",
        recurso: `/pedidos/${pedido.id}/pagar`,
        detalhes: JSON.stringify({
          pedidoId: pedido.id,
          valor: pedido.valorTotal,
          metodo: metodo
        }),

      
        
      });
    });

    const pedidoAtualizado = await AppDataSource.getRepository("Pedido").findOne({
      where: { id: pedidoId },
      relations: ["usuario", "unidade", "itens", "pagamentos"]
    });
    res.json({ 
      message: "Pagamento realizado com sucesso",
      pedido: pedidoAtualizado,
      pagamento: pedidoAtualizado.pagamentos[pedidoAtualizado.pagamentos.length - 1]
     });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar dados do pedido (auth) [CLIENTE pode atualizar o próprio, ADMIN pode atualizar qualquer]
router.put("/:id", autenticarToken, async (req, res) => {
  try {
    const pedidoRepo = AppDataSource.getRepository("Pedido");
    const pedidoId = parseInt(req.params.id);

    const pedido = await pedidoRepo.findOne({ where: { id: pedidoId }, relations: ["usuario", "unidade", "itens"] });
    if (!pedido) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    // Permitir apenas ADMIN ou o próprio cliente
    if (req.usuario.role !== "ADMIN" && req.usuario.id !== pedido.usuario.id) {
      return res.status(403).json({ error: "Sem permissão para atualizar este pedido" });
    }

    // Bloquear alterações se o pedido já foi pago ou está em andamento
    if (["EM PRODUÇÃO", "PRONTO", "ENTREGUE", "CANCELADO"].includes(pedido.status)) {
      return res.status(400).json({ error: "Não é possível alterar um pedido já pago ou em andamento" });
    }
    const { unidadeId, itens, metodoPagamento, canalPedido } = req.body;

    if (unidadeId) {
      const unidadeRepo = AppDataSource.getRepository("Unidade");
      const unidade = await unidadeRepo.findOne({ where: { id: unidadeId } });
      if (!unidade) return res.status(404).json({ error: "Unidade não encontrada" });
      pedido.unidade = unidade;
    }

    if (metodoPagamento) pedido.metodoPagamento = metodoPagamento;
    if (canalPedido) pedido.canalPedido = canalPedido;

    if (itens) {
      const produtoRepo = AppDataSource.getRepository("Produto");
      let valorTotal = 0;
      const itensPedido = [];
      for (const item of itens) {
        const produto = await produtoRepo.findOne({ where: { id: item.produtoId } });
        if (!produto) return res.status(404).json({ error: `Produto ${item.produtoId} não encontrado` });
        const precoUnitario = produto.preco; //  pega direto do Produto
        itensPedido.push({ produto, quantidade: item.quantidade, precoUnitario });
        valorTotal += item.quantidade * precoUnitario;
      }
      pedido.itens = itensPedido;
      pedido.valorTotal = valorTotal;
    }

    await pedidoRepo.save(pedido);

    // Auditoria de atualização de pedido
    const auditoriaCompletaRepo = AppDataSource.getRepository("Auditoria");
    await auditoriaCompletaRepo.save({
      usuarioId: req.usuario.id, // quem atualizou
      acao: "ATUALIZAR_PEDIDO",
      recurso: `/pedidos/${pedidoId}`,
      detalhes: JSON.stringify({
        pedidoId: pedido.id,
        camposAlterados: Object.keys(req.body)
      }),
    });

    res.json({ message: "Pedido atualizado com sucesso", pedido });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancelar pedido (auth) [CLIENTE cancela o próprio, ADMIN cancela qualquer]
router.patch("/:id/cancelar", autenticarToken, async (req, res) => {
  try {
    const pedidoId = parseInt(req.params.id);

    await AppDataSource.transaction(async (manager) => {
      const pedidoRepo = manager.getRepository("Pedido");
      const produtoRepo = manager.getRepository("Produto");
      const usuarioRepo = manager.getRepository("Usuario");
      const auditoriaRepo = manager.getRepository("Auditoria");

      const pedido = await pedidoRepo.findOne({
        where: { id: pedidoId },
        relations: ["usuario", "itens", "itens.produto"]
      });

      if (!pedido) {
        throw new Error("Pedido não encontrado");
      }

      // Permissão: ADMIN pode cancelar qualquer, CLIENTE só o próprio
      if (req.usuario.role !== "ADMIN" && req.usuario.id !== pedido.usuario.id) {
        throw new Error("Sem permissão para cancelar este pedido");
      }

      // Impedir cancelamento de pedidos já entregues ou já cancelados
      if (pedido.status === "ENTREGUE") {
        throw new Error("Não é possível cancelar um pedido já entregue");
      }
      if (pedido.status === "CANCELADO") {
        throw new Error("Pedido já está cancelado");
      }

      // Devolver estoque
      for (const item of pedido.itens) {
        const produto = item.produto;
        produto.estoque += item.quantidade;
        await produtoRepo.save(produto);
      }

      // Atualizar status e registrar quem cancelou
      const usuario = await usuarioRepo.findOne({ where: { id: req.usuario.id } });
      pedido.status = "CANCELADO";
      pedido.atualizadoPor = usuario;
      pedido.ultimaAcao = "CANCELADO";
      await pedidoRepo.save(pedido);

      // Auditoria de cancelamento de pedido
      await auditoriaRepo.save({
        usuarioId: req.usuario.id,
        acao: "CANCELAR_PEDIDO",
        recurso: `/pedidos/${pedidoId}/cancelar`,
        detalhes: JSON.stringify({
          pedidoId: pedido.id,
          statusAnterior: "PENDENTE", // ou o status real antes
          statusAtual: pedido.status
        }),
      });
    });

    res.json({ message: "Pedido cancelado e estoque devolvido com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar status do pedido (auth) [ATENDENTE, ENTREGADOR, COZINHA, ADMIN]
router.patch("/:id/status", autenticarToken, authorizeRole(["ATENDENTE", "ENTREGADOR", "COZINHA", "ADMIN"]), async (req, res) => {
  try {
    const pedidoId = parseInt(req.params.id);
    const { status } = req.body;

    await AppDataSource.transaction(async (manager) => {
      const pedidoRepo = manager.getRepository("Pedido");
      const usuarioRepo = manager.getRepository("Usuario");
      const auditoriaRepo = manager.getRepository("Auditoria");

      const pedido = await pedidoRepo.findOne({ where: { id: pedidoId } });
      if (!pedido) {
        throw new Error("Pedido não encontrado");
      }

      // não atualiza pedido cancelado ou entregue
      if (pedido.status === "CANCELADO") {
        throw new Error("Não é possível atualizar um pedido já cancelado");
      }
      if (pedido.status === "ENTREGUE") {
        throw new Error("Não é possível atualizar um pedido já entregue");
      }

      const statusPermitidos = ["PENDENTE", "EM PRODUÇÃO", "PRONTO", "A CAMINHO", "ENTREGUE", "CANCELADO"];
      if (!statusPermitidos.includes(status)) {
        throw new Error("Status inválido");
      }

      // Buscar o usuário autenticado
      const usuario = await usuarioRepo.findOne({ where: { id: req.usuario.id } });

      // Atualizar status e registrar quem atualizou
      const statusAnterior = pedido.status;
      pedido.status = status;
      pedido.atualizadoPor = usuario;
      pedido.ultimaAcao = "ATUALIZADO";

      await pedidoRepo.save(pedido);

      // Auditoria de atualização de status
      await auditoriaRepo.save({
        usuarioId: req.usuario.id,
        acao: "ATUALIZAR_STATUS_PEDIDO",
        recurso: `/pedidos/${pedidoId}/status`,
        detalhes: JSON.stringify({
          pedidoId: pedido.id,
          statusAnterior,
          statusAtual: pedido.status
        }),
      });
    });

    res.json({ message: "Status atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RELATÓRIOS
// Relatório financeiro detalhado
router.get("/relatorios/financeiro", autenticarToken, authorizeRole(["ADMIN"]), async (req, res) => {
  try {
    // Auditori de relatório financeiro
    const auditoriaRepo = AppDataSource.getRepository("Auditoria");
    await auditoriaRepo.save({
      usuarioId: req.usuario.id,
      acao: "ACESSAR_RELATORIO_FINANCEIRO",
      recurso: "Relatório financeiro acessado",
      dataAcesso: new Date()
    });
    
    const pagamentoRepo = AppDataSource.getRepository("Pagamento");

    // Buscar todos os pagamentos confirmados
    const pagamentos = await pagamentoRepo.find({ relations: ["pedido", "pedido.unidade", "pedido.usuario"] });

    // Calcular receita total
    const totalReceita = pagamentos.reduce((acc, p) => acc + parseFloat(p.valor), 0);

    // Montar relatório detalhado
    const detalhes = pagamentos.map(p => ({
      id: p.id,
      pedidoId: p.pedido.id,
      unidade: p.pedido.unidade?.nome,
      cliente: anonimizarNome(p.pedido.usuario?.nome),
      metodo: p.metodo,
      valor: p.valor,
      dataPagamento: p.dataPagamento
    }));

    res.json({
      totalReceita,
      quantidadePagamentos: pagamentos.length,
      pagamentos: detalhes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RELATÓRIO DE PRODUTOS MAIS CONSUMIDOS (com receita total)
router.get("/relatorios/produtos", autenticarToken, authorizeRole(["ADMIN"]), async (req, res) => {
  try {
    const itemPedidoRepo = AppDataSource.getRepository("ItemPedido");

    const itens = await itemPedidoRepo.find({ relations: ["produto"] });

    const consumo = {};
    let receitaGlobal = 0;

    // Agrupar por produto e somar quantidades e receita
    for (const item of itens) {
      const produtoId = item.produto.id;
      if (!consumo[produtoId]) {
        consumo[produtoId] = {
          produtoId,
          nome: item.produto.nome,
          quantidadeTotal: 0,
          receitaTotal: 0
        };
      }
      consumo[produtoId].quantidadeTotal += item.quantidade;
      consumo[produtoId].receitaTotal += item.quantidade * item.precoUnitario;
      receitaGlobal += item.quantidade * item.precoUnitario;
    }

    // Converter em array, formatar receita e calcular percentual
    const ranking = Object.values(consumo).map(p => ({
      produtoId: p.produtoId,
      nome: p.nome,
      quantidadeTotal: p.quantidadeTotal,
      receitaTotal: parseFloat(p.receitaTotal.toFixed(2)), // duas casas decimais
      percentualReceita: receitaGlobal > 0 
        ? `${((p.receitaTotal / receitaGlobal) * 100).toFixed(2)}%`
        : "0"
    })).sort((a, b) => b.receitaTotal - a.receitaTotal);

    res.json({
      totalProdutos: ranking.length,
      receitaGlobal: parseFloat(receitaGlobal.toFixed(2)),
      ranking
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RELATÓRIO DE VENDAS POR UNIDADE
router.get("/relatorios/unidades", autenticarToken, authorizeRole(["ADMIN"]), async (req, res) => {
  try {
    const pedidoRepo = AppDataSource.getRepository("Pedido");

    // Buscar todos os pedidos com suas unidades
    const pedidos = await pedidoRepo.find({ relations: ["unidade"] });

    const vendasPorUnidade = {};
    let receitaGlobal = 0;

    // Agrupar por unidade e somar valores
    for (const pedido of pedidos) {
      if (!pedido.unidade) continue; // segurança

      const unidadeId = pedido.unidade.id;
      if (!vendasPorUnidade[unidadeId]) {
        vendasPorUnidade[unidadeId] = {
          unidadeId,
          nome: pedido.unidade.nome,
          totalPedidos: 0,
          receitaTotal: 0
        };
      }
      vendasPorUnidade[unidadeId].totalPedidos += 1;
      vendasPorUnidade[unidadeId].receitaTotal += parseFloat(pedido.valorTotal);
      receitaGlobal += parseFloat(pedido.valorTotal);
    }

    // Converter em array, formatar valores e calcular percentual
    const ranking = Object.values(vendasPorUnidade).map(u => ({
      unidadeId: u.unidadeId,
      nome: u.nome,
      totalPedidos: u.totalPedidos,
      receitaTotal: u.receitaTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      percentualReceita: receitaGlobal > 0 
        ? `${((u.receitaTotal / receitaGlobal) * 100).toFixed(2)}%`
        : "0%"
    })).sort((a, b) => b.totalPedidos - a.totalPedidos);

    res.json({
      totalUnidades: ranking.length,
      receitaGlobal: receitaGlobal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      ranking
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Relatório completo de auditoria
router.get("/relatorios/auditoria-completa", autenticarToken, authorizeRole(["ADMIN"]), async (req, res) => {
  try {
    const auditoriaCompletaRepo = AppDataSource.getRepository("Auditoria");
    const registros = await auditoriaCompletaRepo.find({
      relations: ["usuario"],
      order: { dataAcao: "DESC" }
    });
    res.json(registros);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;