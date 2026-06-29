import { EntitySchema } from "typeorm";

export const Produto = new EntitySchema({
  name: "Produto",
  tableName: "produto",
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
    preco: {
      type: "decimal",
      precision: 10,
      scale: 2,
      nullable: false,
    },
    categoria: {
      type: String,
      nullable: false,
    },
    estoque: {
      type: Number,
      default: 0,
      nullable: true,
    },
  },
  relations: {
    itens: {
      type: "one-to-many",
      target: "ItemPedido",
      inverseSide: "produto",
    },
  },
});
