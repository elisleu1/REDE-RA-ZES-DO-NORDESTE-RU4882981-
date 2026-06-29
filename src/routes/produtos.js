import express from "express";
import { AppDataSource } from "../data-source.js";
import autenticarToken from "../middleware/auth.js";
import authorizeRole from "../middleware/authorize.js";

const router = express.Router();

// Criar produto (apenas uma definição, com middleware)
router.post("/", autenticarToken, authorizeRole(["ADMIN"]), async (req, res) => {
  try {
    const produtoRepo = AppDataSource.getRepository("Produto");
    const { nome, preco, categoria, estoque} = req.body;

    const produto = produtoRepo.create({ nome, preco, categoria, estoque });
    await produtoRepo.save(produto);

    //Auditoria de criação de produto
    const auditoriaCompletaRepo = AppDataSource.getRepository("Auditoria");
    await auditoriaCompletaRepo.save({
      usuarioId: req.usuario.id, // ADMIN que criou
      acao: "CRIAR_PRODUTO",
      recurso: "/produtos",
      detalhes: JSON.stringify({
        produtoId: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        categoria: produto.categoria,
        estoque: produto.estoque
      }),
    });

    res.status(201).json(produto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar produtos (sem necessidade de auth)
router.get("/", async (req, res) => {
  try {
    const produtoRepo = AppDataSource.getRepository("Produto");
    const produtos = await produtoRepo.find();
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar produto (auth) [ADMIN]
router.put("/:id", autenticarToken, authorizeRole(["ADMIN"]), async (req, res) => {
  try {
    const produtoRepo = AppDataSource.getRepository("Produto");
    const produtoId = parseInt(req.params.id);

    const produto = await produtoRepo.findOne({ where: { id: produtoId } });
    if (!produto) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const { nome, preco, categoria } = req.body;
    if (nome) produto.nome = nome;
    if (preco) produto.preco = preco;
    if (categoria) produto.categoria = categoria;

    await produtoRepo.save(produto);

        //Auditoria de atualização de produto
    const auditoriaCompletaRepo = AppDataSource.getRepository("Auditoria");
    await auditoriaCompletaRepo.save({
      usuarioId: req.usuario.id, // ADMIN que atualizou
      acao: "ATUALIZAR_PRODUTO",
      recurso: `/produtos/${produtoId}`,
      detalhes: JSON.stringify({
        produtoId: produto.id,
        camposAlterados: Object.keys(req.body)
      }),
    });

    res.json({ message: "Produto atualizado com sucesso", produto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remover produto (auth) [ADMIN]
router.delete("/:id", autenticarToken, authorizeRole(["ADMIN"]), async (req, res) => {
  try {
    const produtoId = parseInt(req.params.id);

    await AppDataSource.transaction(async (manager) => {
      const produtoRepo = manager.getRepository("Produto");
      const auditoriaRepo = manager.getRepository("Auditoria");

      const produto = await produtoRepo.findOne({ where: { id: produtoId } });
      if (!produto) {
        throw new Error("Produto não encontrado");
      }

      // Remover produto
      await produtoRepo.remove(produto);

      // Registrar auditoria
      await auditoriaRepo.save({
        usuarioId: req.usuario.id,
        acao: "REMOVER_PRODUTO",
        recurso: `/produtos/${produtoId}`,
        detalhes: JSON.stringify({
          produtoId: produto.id,
          nome: produto.nome,
          categoria: produto.categoria
        }),
      });
    });

    res.json({ message: "Produto removido com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;