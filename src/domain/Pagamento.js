import { EntitySchema } from "typeorm";

export const Pagamento = new EntitySchema({
  name: "Pagamento",
  tableName: "pagamento",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    metodo: {
      type: String,
    },
    valor: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
    dataPagamento: {
      type: Date,
    },
    codigoTransacao: {
      type: String,
      nullable: true,
    }
  },
  relations: {
    pedido: {
      type: "many-to-one",
      target: "Pedido",
      inverseSide: "pagamentos",
      joinColumn: true,
    },
  },
});
