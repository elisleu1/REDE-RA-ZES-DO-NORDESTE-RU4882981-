import express from "express";
import { AppDataSource } from "../data-source.js";
import autenticarToken from "../middleware/auth.js";
import authorizeRole from "../middleware/authorize.js";

const router = express.Router();

router.post("/", autenticarToken, authorizeRole(["ADMIN"]), async (req, res) => {
  try {
    const { nome, endereco, cep } = req.body;

    await AppDataSource.transaction(async (manager) => {
      const unidadeRepo = manager.getRepository("Unidade");
      const auditoriaRepo = manager.getRepository("Auditoria");

      // Criar unidade
      const unidade = unidadeRepo.create({ nome, endereco, cep });
      await unidadeRepo.save(unidade);

      // Auditoria de criação de unidade
      await auditoriaRepo.save({
        usuarioId: req.usuario.id,
        acao: "CRIAR_UNIDADE",
        recurso: "/unidades",
        detalhes: JSON.stringify({
          unidadeId: unidade.id,
          nome: unidade.nome,
          endereco: unidade.endereco,
          telefone: unidade.telefone
        }),
      });

      // Retorno dentro da transação
      res.status(201).json({ message: "Unidade criada com sucesso", unidade });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar unidades 
router.get("/", async (req, res) => {
  try {
    const unidadeRepo = AppDataSource.getRepository("Unidade");
    const unidades = await unidadeRepo.find();
    res.json(unidades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar unidade (auth) [ADMIN]
router.put("/:id", autenticarToken, authorizeRole(["ADMIN"]), async (req, res) => {
  try {
    const unidadeId = parseInt(req.params.id);

    await AppDataSource.transaction(async (manager) => {
      const unidadeRepo = manager.getRepository("Unidade");
      const auditoriaRepo = manager.getRepository("Auditoria");

      const unidade = await unidadeRepo.findOne({ where: { id: unidadeId } });
      if (!unidade) {
        throw new Error("Unidade não encontrada");
      }

      const { nome, endereco, cep } = req.body;
      if (nome) unidade.nome = nome;
      if (endereco) unidade.endereco = endereco;
      if (cep) unidade.cep = cep;

      await unidadeRepo.save(unidade);

      // Auditoria de atualização de unidade
      await auditoriaRepo.save({
        usuarioId: req.usuario.id,
        acao: "ATUALIZAR_UNIDADE",
        recurso: `/unidades/${unidadeId}`,
        detalhes: JSON.stringify({
          unidadeId: unidade.id,
          camposAlterados: Object.keys(req.body)
        }),
      });
    });

    res.json({ message: "Unidade atualizada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Remover unidade (auth) [ADMIN]
router.delete("/:id", autenticarToken, authorizeRole(["ADMIN"]), async (req, res) => {
  try {
    const unidadeId = parseInt(req.params.id);

    await AppDataSource.transaction(async (manager) => {
      const unidadeRepo = manager.getRepository("Unidade");
      const auditoriaRepo = manager.getRepository("Auditoria");

      const unidade = await unidadeRepo.findOne({ where: { id: unidadeId } });
      if (!unidade) {
        throw new Error("Unidade não encontrada");
      }

      // Remover unidade
      await unidadeRepo.remove(unidade);

      // Auditoria de remoção de unidade
      await auditoriaRepo.save({
        usuarioId: req.usuario.id,
        acao: "REMOVER_UNIDADE",
        recurso: `/unidades/${unidadeId}`,
        detalhes: JSON.stringify({
          unidadeId: unidade.id,
          nome: unidade.nome,
          endereco: unidade.endereco,
          telefone: unidade.telefone
        }),
      });
    });

    res.json({ message: "Unidade removida com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;