import express from "express";
import { AppDataSource } from "../data-source.js";
import { Usuario } from "../domain/Usuario.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import autenticarToken from "../middleware/auth.js";
import authorizeRole from "../middleware/authorize.js";
import dotenv from "dotenv";
dotenv.config(); // carrega variáveis do .env


const router = express.Router();
const usuarioRepo = AppDataSource.getRepository("Usuario");
const SECRET = process.env.JWT_SECRET; // colocar em variável de ambiente


// Validação (regex) de telefone e email
const isTelefone = (telefone) => /^\d{9,11}$/.test(telefone); // só dígitos, 10 ou 11
const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Controle de tentativas de login
const tentativasLogin = new Map(); // chave: email ou telefone, valor: { tentativas, bloqueadoAte }
const MAX_TENTATIVAS = 5;
const TEMPO_BLOQUEIO_MS = 60 * 1000; // 1 minuto

// Cadastar novo usuário (sem auth) [ALL]
router.post("/register", async (req, res) => {
  try {
    const { nome, email, telefone, senha, consentimentoLGPD } = req.body;

    // Verificação de consentimento LGPD
    if (!consentimentoLGPD) {
      return res.status(400).json({ error: "É necessário consentir com a política de privacidade (LGPD)" });
    }

    // Validar email e telefone
    if (email && !isEmail(email)) {
      return res.status(400).json({ error: "Email inválido" });
    }
    if (telefone && !isTelefone(telefone)) {
      return res.status(400).json({ error: "Telefone inválido, digite somente Números!" });
    }

    // Criptografar senha
    const hashedSenha = await bcrypt.hash(senha, 10);

    const usuario = usuarioRepo.create({
      nome,
      email,
      telefone,
      senhaHash: hashedSenha, // salva no campo correto
      role: "CLIENTE", // padrão CLIENTE
      consentimentoLGPD
    });

    await usuarioRepo.save(usuario);

    // Criar fidelidade inicial com 0 pontos
    const fidelidadeRepo = AppDataSource.getRepository("Fidelidade");
    const fidelidade = fidelidadeRepo.create({
      usuario,
      pontos: 0
    });
    await fidelidadeRepo.save(fidelidade);

    // Auditoria de cadastro de cliente
    const auditoriaCompletaRepo = AppDataSource.getRepository("Auditoria");
    await auditoriaCompletaRepo.save({
      usuarioId: usuario.id, // o próprio cliente que se cadastrou
      acao: "CADASTRO_CLIENTE",
      recurso: "/usuarios/register",
      detalhes: JSON.stringify({
        novoUsuarioId: usuario.id,
        email: usuario.email,
        telefone: usuario.telefone
      }),
    });

    res.status(201).json({ message: "Usuário registrado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Excluir conta de usuário (auth) [ADMIN pode excluir qualquer, CLIENTE pode excluir a própria]
router.delete("/:id", autenticarToken, async (req, res) => {
  try {
    const usuarioId = parseInt(req.params.id);

    await AppDataSource.transaction(async (manager) => {
      const usuarioRepo = manager.getRepository("Usuario");
      const auditoriaRepo = manager.getRepository("Auditoria");

      const usuario = await usuarioRepo.findOne({ where: { id: usuarioId } });
      if (!usuario) {
        throw new Error("Usuário não encontrado");
      }

      // Permitir apenas ADMIN ou o próprio usuário
      if (req.usuario.role !== "ADMIN" && req.usuario.id !== usuario.id) {
        throw new Error("Sem permissão para excluir esta conta");
      }

      // Excluir usuário
      await usuarioRepo.remove(usuario);

      // Auditoria de exclusão de conta
      await auditoriaRepo.save({
        usuarioId: req.usuario.id,
        acao: "EXCLUIR_CONTA",
        recurso: `/usuarios/${usuarioId}`,
        detalhes: JSON.stringify({
          usuarioId: usuario.id,
          nome: usuario.nome,
          email: usuario.email
        }),
      });
    });

    res.json({ message: "Conta excluída com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registrar Funcionário (auth) ["ADMIN"]
router.post("/register-admin", autenticarToken, authorizeRole(["ADMIN"]), async (req, res) => {
  try {
    const { nome, email, telefone, senha, role ,consentimentoLGPD } = req.body;

    // Verificação de consentimento LGPD
    if (!consentimentoLGPD) {
      return res.status(400).json({ error: "É necessário consentir com a política de privacidade (LGPD)" });
    }

    // Validar email e telefone
    if (email && !isEmail(email)) {
      return res.status(400).json({ error: "Email inválido" });
    }
    if (telefone && !isTelefone(telefone)) {
      return res.status(400).json({ error: "Telefone inválido, digite somente Números!" });
    }
    
    // Criptografar senha
    const hashedSenha = await bcrypt.hash(senha, 10);

    const usuario = usuarioRepo.create({
      nome,
      email,
      telefone,
      senhaHash: hashedSenha, // salva no campo correto
      role: role || "ADMIN", // padrão ADMIN Mas aceita "ATENDENTE" se enviado
      consentimentoLGPD
    });

    await usuarioRepo.save(usuario);

    // Auditoria de cadastro de funcionário
    const auditoriaCompletaRepo = AppDataSource.getRepository("Auditoria");
    await auditoriaCompletaRepo.save({
      usuarioId: req.usuario.id, // ADMIN que criou
      acao: "CADASTRO_FUNCIONARIO",
      recurso: "/usuarios/register-admin",
      detalhes: JSON.stringify({ novoUsuarioId: usuario.id, role: usuario.role }),
    });

    // Criar fidelidade inicial com 0 pontos
    const fidelidadeRepo = AppDataSource.getRepository("Fidelidade");
    const fidelidade = fidelidadeRepo.create({
      usuario,
      pontos: 0
    });
    await fidelidadeRepo.save(fidelidade);

    res.status(201).json({ message: "Usuário registrado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login [TODOS]
router.post("/login", async (req, res) => {
  try {
    const { email, telefone, senha } = req.body;

    // Validar email e telefone
    if (email && !isEmail(email)) {
      return res.status(400).json({ error: "Email inválido" });
    }
    if (telefone && !isTelefone(telefone)) {
      return res.status(400).json({ error: "Telefone inválido, digite somente Números!" });
    }

    // Identificador único (email ou telefone)
    const identificador = email || telefone;

    // Verificar se está bloqueado
    let registro = tentativasLogin.get(identificador);
    if (registro) {
      if (registro.bloqueadoAte && Date.now() < registro.bloqueadoAte) {
        return res.status(403).json({
          error: "Conta bloqueada por muitas tentativas. Tente novamente em 1 minuto."
        });
      }

      // reseta após tempo de espera
      if (registro.bloqueadoAte && Date.now() >= registro.bloqueadoAte) {
        tentativasLogin.set(identificador, {tentativas: 0});
        registro = null
      }
    }
  

    // Buscar usuário por email ou telefone
    let usuario;
    if (email) {
      usuario = await usuarioRepo.findOne({ where: { email } });
    } else if (telefone) {
      usuario = await usuarioRepo.findOne({ where: { telefone } });
    }

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Comparar senha com senhaHash
    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      // Incrementar tentativas
      const tentativas = registro ? registro.tentativas + 1 : 1;
      if (tentativas >= MAX_TENTATIVAS) {
        tentativasLogin.set(identificador, { tentativas, bloqueadoAte: Date.now() + TEMPO_BLOQUEIO_MS });

        // Auditoria de login bloqueado
        const auditoriaCompletaRepo = AppDataSource.getRepository("Auditoria");
        await auditoriaCompletaRepo.save({
          usuarioId: usuario?.id || null,
          acao: "LOGIN_BLOQUEADO",
          recurso: "/usuarios/login",
          detalhes: JSON.stringify({ identificador }),
        });

        return res.status(403).json({ error: "Conta bloqueada por muitas tentativas. Tente novamente em 1 minuto." });
      } else {
        tentativasLogin.set(identificador, { tentativas });
        return res.status(401).json({ error: `Senha inválida. Tentativa ${tentativas}/${MAX_TENTATIVAS}` });
      }
    }

    // Resetar tentativas se login for bem-sucedido
    tentativasLogin.delete(identificador);

    // Auditoria de login sucesso
    const auditoriaCompletaRepo = AppDataSource.getRepository("Auditoria");
    await auditoriaCompletaRepo.save({
      usuarioId: usuario.id,
      acao: "LOGIN_SUCESSO",
      recurso: "/usuarios/login",
      detalhes: JSON.stringify({ email: usuario.email || usuario.telefone }),
    });

    // Gerar token JWT
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, role: usuario.role },
      SECRET,
      { expiresIn: "1h" }
    );
    
    // Retornar dados do usuário
    res.json({
      message: "Login realizado com sucesso",
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        role: usuario.role
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar todos os usuários (auth) ["ADMIN", "ATENDENTE"]
router.get("/", autenticarToken, authorizeRole(["ADMIN", "ATENDENTE"]), async (req, res) => {
  try {
    const usuarios = await usuarioRepo.find();
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar usuário por ID: (auth) ["ADMIN", "ATENDENTE"]
router.get("/:id", autenticarToken, authorizeRole(["ADMIN", "ATENDENTE"]), async (req, res) => {
  try {
    const usuario = await usuarioRepo.findOne({
      where: { id: parseInt(req.params.id) }
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar usuário por email
router.get("/email/:email", autenticarToken, authorizeRole(["ADMIN", "ATENDENTE"]), async (req, res) => {
  try {
    const usuario = await usuarioRepo.findOne({
      where: { email: req.params.email }
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remover funcionário
router.delete("/:id", autenticarToken, authorizeRole(["ADMIN"]), async (req, res) => {
  try {
    const usuarioRepo = AppDataSource.getRepository("Usuario");
    const usuarioId = parseInt(req.params.id);

    const usuario = await usuarioRepo.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      return res.status(404).json({ error: "Funcionário não encontrado" });
    }

    await usuarioRepo.remove(usuario);

    // Auditoria pra remoção de funcionário
    const auditoriaCompletaRepo = AppDataSource.getRepository("Auditoria");
    await auditoriaCompletaRepo.save({
      usuarioId: req.usuario.id, // ADMIN que removeu
      acao: "REMOVER_FUNCIONARIO",
      recurso: `/usuarios/${usuarioId}`,
      detalhes: JSON.stringify({ usuarioRemovido: usuario.id }),
    });
    res.json({ message: "Funcionário removido com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar funcionário (auth) [ADMIN]
router.put("/:id", autenticarToken, authorizeRole(["ADMIN"]), async (req, res) => {
  try {
    const funcionarioId = parseInt(req.params.id);

    await AppDataSource.transaction(async (manager) => {
      const funcionarioRepo = manager.getRepository("Funcionario");
      const auditoriaRepo = manager.getRepository("Auditoria");

      const funcionario = await funcionarioRepo.findOne({ where: { id: funcionarioId } });
      if (!funcionario) throw new Error("Funcionário não encontrado");

      const { nome, cargo, salario } = req.body;
      if (nome) funcionario.nome = nome;
      if (cargo) funcionario.cargo = cargo;
      if (salario) funcionario.salario = salario;

      await funcionarioRepo.save(funcionario);

      // Auditoria de atualização de funcionário
      await auditoriaRepo.save({
        usuarioId: req.usuario.id,
        acao: "ATUALIZAR_FUNCIONARIO",
        recurso: `/funcionarios/${funcionarioId}`,
        detalhes: JSON.stringify({
          funcionarioId: funcionario.id,
          camposAlterados: Object.keys(req.body)
        }),
      });
    });

    res.json({ message: "Funcionário atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar usuário (auth) [ADMIN ou o próprio usuário]
router.put("/:id", autenticarToken, async (req, res) => {
  try {
    const usuarioId = parseInt(req.params.id);

    await AppDataSource.transaction(async (manager) => {
      const usuarioRepo = manager.getRepository("Usuario");
      const auditoriaRepo = manager.getRepository("Auditoria");

      const usuario = await usuarioRepo.findOne({ where: { id: usuarioId } });
      if (!usuario) throw new Error("Usuário não encontrado");

      // Permitir apenas ADMIN ou o próprio usuário
      if (req.usuario.role !== "ADMIN" && req.usuario.id !== usuario.id) {
        throw new Error("Sem permissão para atualizar este usuário");
      }

      const { nome, email, telefone } = req.body;
      if (nome) usuario.nome = nome;
      if (email) usuario.email = email;
      if (telefone) usuario.telefone = telefone;

      await usuarioRepo.save(usuario);

      // Auditoria de atualização de usuário
      await auditoriaRepo.save({
        usuarioId: req.usuario.id,
        acao: "ATUALIZAR_USUARIO",
        recurso: `/usuarios/${usuarioId}`,
        detalhes: JSON.stringify({
          usuarioId: usuario.id,
          camposAlterados: Object.keys(req.body)
        }),
      });
    });

    res.json({ message: "Usuário atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Consultar pontos de fidelidade de um cliente
router.get("/:id/fidelidade", autenticarToken, async (req, res) => {
  try {
    const usuarioId = parseInt(req.params.id, 10);
    if (isNaN(usuarioId)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // Registra a auditoria
    const auditoriaCompletaRepo = AppDataSource.getRepository("Auditoria");
    await auditoriaCompletaRepo.save({
      usuarioId: req.usuario.id,
      acao: "CONSULTAR_FIDELIDADE",
      recurso: `/usuarios/${usuarioId}/fidelidade`,
      detalhes: JSON.stringify({ usuarioConsultado: usuarioId }),
    });

    const usuarioRepo = AppDataSource.getRepository("Usuario");
    const fidelidadeRepo = AppDataSource.getRepository("Fidelidade");
    
    // Buscar usuário primeiro
    const usuario = await usuarioRepo.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Buscar fidelidade
    let fidelidade = await fidelidadeRepo.findOne({
      where: { usuario: { id: usuarioId } },
      relations: ["usuario"],
    });

    if (!fidelidade) {
      fidelidade = { pontos: 0, usuario };
    }

    res.json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      },
      pontos: fidelidade.pontos,
    });
  } catch (err) {
    console.error("Erro ao consultar fidelidade:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
