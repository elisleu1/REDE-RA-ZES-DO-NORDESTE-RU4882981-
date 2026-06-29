import { DataSource } from "typeorm";
import { Usuario } from "./domain/Usuario.js";
import { Fidelidade } from "./domain/Fidelidade.js";
import { Pedido } from "./domain/Pedido.js";
import { Unidade } from "./domain/Unidade.js";
import { Produto } from "./domain/Produto.js";
import { ItemPedido } from "./domain/ItemPedido.js";
import { Pagamento } from "./domain/Pagamento.js";
import { Auditoria } from "./domain/Auditoria.js";
import bcrypt from "bcryptjs";

// Configuração da conexão com MySQL
export const AppDataSource = new DataSource({
  type: "mysql",
  host: "localhost",       // endereço do servidor MySQL
  port: 3306,              // porta padrão do MySQL
  username: "root",        // usuário do banco
  password: "1234",   // senha do banco
  database: "raizes_nordeste_db", // nome do banco
  synchronize: true,       // recria tabelas automaticamente (bom para dev)
  logging: true,           // mostra queries no console
  entities: [
    Usuario,
    Fidelidade,
    Pedido,
    Unidade,
    Produto,
    ItemPedido,
    Pagamento,
    Auditoria,
  ],
});