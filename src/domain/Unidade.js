import { EntitySchema } from "typeorm";

export const Unidade = new EntitySchema({
  name: "Unidade",
  tableName: "unidade",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    nome: {
      type: String,
      unique: true,
      nullable: false,
    },
    endereco: {
      type: String,
      nullable: false,
    },
    cep: {
      type: String,
      length: 9,
      nullable: false,
    },
  },
  relations: {
    pedidos: {
      type: "one-to-many",
      target: "Pedido",
      inverseSide: "unidade",
    },
  },
});
