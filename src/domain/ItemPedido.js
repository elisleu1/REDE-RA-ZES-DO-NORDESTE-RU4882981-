import { EntitySchema } from "typeorm";

export const ItemPedido = new EntitySchema({
  name: "ItemPedido",
  tableName: "item_pedido",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    quantidade: {
      type: Number,
    },
    precoUnitario: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
  },
  relations: {
    pedido: {
      type: "many-to-one",
      target: "Pedido",
      inverseSide: "itens",
      joinColumn: true,
    },
    produto: {
      type: "many-to-one",
      target: "Produto",
      inverseSide: "itens",
      joinColumn: true,
    },
  },
});
