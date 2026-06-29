import { EntitySchema } from "typeorm";

export const Pedido = new EntitySchema({
  name: "Pedido",
  tableName: "pedido",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    dataPedido: {
      type: Date,
    },
    status: {
      type: String,
    },
    valorTotal: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
    canalPedido: {
      type: String,
    },
    localEntrega: {
      type: String,
      nullable: true,
    },
    usuarioId: {
      type: Number, // Certifique-se de que o tipo bate com a PK da tabela Usuario
      nullable: true,
    },
    unidadeId: {
      type: Number, // Certifique-se de que o tipo bate com a PK da tabela Unidade
      nullable: true,
    },
    atualizadoPorId: {
      type: Number, 
      nullable: true,
    },
    ultimaAcao: {
      type: String,
      nullable: true,
    },

  },
  relations: {
    usuario: {
      type: "many-to-one",
      target: "Usuario",
      inverseSide: "pedidos",
      joinColumn: true,
    },
    unidade: {
      type: "many-to-one",
      target: "Unidade",
      inverseSide: "pedidos",
      joinColumn: true,
    },
    itens: {
      type: "one-to-many",
      target: "ItemPedido",
      inverseSide: "pedido",
      cascade: true,
    },
    pagamentos: {
      type: "one-to-many",
      target: "Pagamento",
      inverseSide: "pedido",
      cascade: false,
    },
    atualizadoPor: {
    type: "many-to-one",
    target: "Usuario",
    joinColumn: true,
    nullable: true
    } 
  },
  order: {
    ultimaAcao: "ASC"
  }
});
