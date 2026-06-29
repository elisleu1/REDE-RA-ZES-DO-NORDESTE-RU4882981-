// index.js
import express from "express";
import cors from "cors";
import { AppDataSource } from "./data-source.js";
import usuariosRoutes from "./routes/usuarios.js";
import pedidosRoutes from "./routes/pedidos.js";
import unidadesRoutes from "./routes/unidades.js";
import produtosRoutes from "./routes/produtos.js";

// middlewares
import autenticarToken from "./middleware/auth.js";
import authorizeRole from "./middleware/authorize.js";

// swagger
import setupSwagger from "./config/swagger.js";

// entidades
import { Usuario } from "./domain/Usuario.js";
import { Fidelidade } from "./domain/Fidelidade.js";
import { Unidade } from "./domain/Unidade.js";
import { Produto } from "./domain/Produto.js";

const app = express();
app.use(express.json());
app.use(cors());

// Função para garantir usuários (Admin e Cliente)
async function seedUsuarios() {
  const usuarioRepo = AppDataSource.getRepository(Usuario);
  const fidelidadeRepo = AppDataSource.getRepository(Fidelidade);

  // Garante fidelidades para cada usuário
  let fidelidadeAdmin = await fidelidadeRepo.findOne({ where: { id: 1 } });
  if (!fidelidadeAdmin) {
    fidelidadeAdmin = fidelidadeRepo.create({ pontos: 0 });
    await fidelidadeRepo.save(fidelidadeAdmin);
  }

  let fidelidadeCliente = await fidelidadeRepo.findOne({ where: { id: 2 } });
  if (!fidelidadeCliente) {
    fidelidadeCliente = fidelidadeRepo.create({ pontos: 0 });
    await fidelidadeRepo.save(fidelidadeCliente);
  }

  // Usuário Admin
  let admin = await usuarioRepo.findOne({ where: { email: "admin@example.com" } });
  if (!admin) {
    admin = usuarioRepo.create({
      nome: "Admin",
      email: "admin@example.com",
      telefone: "11911111111",
      senhaHash: "$2b$10$IGqDgqXi/pijOULEKz7/negxm5xNJN1k4GznA1JNwj3xe4//AQQWW",
      role: "ADMIN",
      fidelidade: fidelidadeAdmin,
      consentimentoLGPD: true,
    });
  } else {
    admin.nome = "Admin";
    admin.telefone = "11911111111";
    admin.senhaHash = "$2b$10$IGqDgqXi/pijOULEKz7/negxm5xNJN1k4GznA1JNwj3xe4//AQQWW";
    admin.role = "ADMIN";
    admin.fidelidade = fidelidadeAdmin;
    admin.consentimentoLGPD = true;
  }
  await usuarioRepo.save(admin);

  // Usuário Cliente
  let cliente = await usuarioRepo.findOne({ where: { email: "cliente@example.com" } });
  if (!cliente) {
    cliente = usuarioRepo.create({
      nome: "Cliente",
      email: "cliente@example.com",
      telefone: "22922222222",
      senhaHash: "$2b$10$zvFEeG5c7W3wD0tplB/bj.ehjVGhyJ/tP8SzTrQSaqG5qz3UcImo2",
      role: "CLIENTE",
      fidelidade: fidelidadeCliente,
      consentimentoLGPD: true,
    });
  } else {
    cliente.nome = "Cliente";
    cliente.telefone = "22922222222";
    cliente.senhaHash = "$2b$10$zvFEeG5c7W3wD0tplB/bj.ehjVGhyJ/tP8SzTrQSaqG5qz3UcImo2";
    cliente.role = "CLIENTE";
    cliente.fidelidade = fidelidadeCliente;
    cliente.consentimentoLGPD = true;
  }
  await usuarioRepo.save(cliente);

  console.log("✅ Usuários Admin e Cliente garantidos no banco!");
}

// Função para garantir Unidades
async function seedUnidades() {
  const unidadeRepo = AppDataSource.getRepository(Unidade);

  const unidades = [
    { nome: "Recife_unid", endereco: "Av. Agamenon Magalhães, 2990", cep: "52021-170" },
    { nome: "Salvador_unid", endereco: "Av. Tancredo Neves, 620", cep: "41820-020" },
    { nome: "Fortaleza_unid", endereco: "Av. Santos Dumont, 2626", cep: "60150-161" },
    { nome: "São_Luís_unid", endereco: "Av. Jerônimo de Albuquerque, 2000", cep: "65074-199" },
    { nome: "Natal_unid", endereco: "Av. Hermes da Fonseca, 950", cep: "59020-650" },
    { nome: "Maceió_unid", endereco: "Av. Fernandes Lima, 1024", cep: "57050-000" },
  ];

  for (const unidadeData of unidades) {
    let unidade = await unidadeRepo.findOne({ where: { nome: unidadeData.nome } });
    if (!unidade) {
      unidade = unidadeRepo.create(unidadeData);
    } else {
      unidade.endereco = unidadeData.endereco;
      unidade.cep = unidadeData.cep;
    }
    await unidadeRepo.save(unidade);
  }

  console.log("✅ Unidades garantidas no banco!");
}

// Função para garantir Produtos
async function seedProdutos() {
  const produtoRepo = AppDataSource.getRepository(Produto);

  const produtos = [
    { nome: "Cuscuz Recheado com Carne de Sol", preco: 18.50, categoria: "cuscuz", estoque: 50 },
    { nome: "Tapioca de Queijo Coalho com Manteiga de Garrafa", preco: 12.00, categoria: "tapiocas", estoque: 60 },
    { nome: "Bolo de Macaxeira", preco: 8.50, categoria: "bolos", estoque: 30 },
    { nome: "Café Coado na Hora (Grande)", preco: 5.50, categoria: "bebidas quentes", estoque: 200 },
    { nome: "Suco de Acerola Natural", preco: 7.00, categoria: "sucos regionais", estoque: 100 },
    { nome: "Suco de Cajá Nordestino", preco: 8.00, categoria: "sucos regionais", estoque: 80 },
    { nome: "Cartola Tradicional (Banana, Queijo, Açúcar e Canela)", preco: 15.00, categoria: "sobremesas", estoque: 25 },
    { nome: "Paçoca de Pilão (Porção)", preco: 10.00, categoria: "porcoes", estoque: 40 },
    { nome: "Manteiga de Garrafa (Dose Extra)", preco: 3.00, categoria: "adicionais", estoque: 150 },
    { nome: "Combo Amanhecer Nordestino", preco: 28.00, categoria: "combos", estoque: 20 },
  ];

  for (const produtoData of produtos) {
    let produto = await produtoRepo.findOne({ where: { nome: produtoData.nome } });
    if (!produto) {
      produto = produtoRepo.create(produtoData);
    } else {
      produto.preco = produtoData.preco;
      produto.categoria = produtoData.categoria;
      produto.estoque = produtoData.estoque;
    }
    await produtoRepo.save(produto);
  }

  console.log("✅ Produtos garantidos no banco!");
}

// Função principal
async function main() {
  try {
    await AppDataSource.initialize();
    console.log("✅ Conexão com banco estabelecida!");

    // Executa seeds
    await seedUsuarios();
    await seedUnidades();
    await seedProdutos();

    // Rotas
    app.use("/usuarios", usuariosRoutes);
    app.use("/pedidos", pedidosRoutes);
    app.use("/unidades", unidadesRoutes);
    app.use("/produtos", produtosRoutes);
    app.use(express.static("public"));

    // Swagger
    setupSwagger(app, {
      protectDocs: false,
      autenticarToken,
      authorizeRole,
      allowedRolesForDocs: ["ADMIN"]
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`✅ API rodando em http://localhost:${PORT}`);
      console.log(`✅ Docs Swagger: http://localhost:${PORT}/docs`);
    });
  } catch (error) {
    console.error("❌ Erro ao conectar:", error);
  }
}

// Executa aplicação
main();
