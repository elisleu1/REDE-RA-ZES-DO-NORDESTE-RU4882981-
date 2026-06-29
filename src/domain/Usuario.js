import { EntitySchema } from "typeorm";

export const Usuario = new EntitySchema({
  name: "Usuario",
  tableName: "usuario",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    nome: {
      type: String,
      length: 100,
      nullable: false,
    },
    email: {
      type: String,
      unique: true,
    },
    telefone: {
      type: String,
      nullable: true,
      length: 20,
      unique: true,
    },
    senhaHash: {
      type: String,
    },
    role: {
      type: String,
    },
    consentimentoLGPD: {
    type: Boolean,
    default: false,
    cascade: true,
  }
  },
  relations: {
    fidelidade: {
      type: "one-to-one",
      target: "Fidelidade",
      inverseSide: "usuario",
      cascade: true,   
      eager: true,     
      joinColumn: true,
    },
    pedidos: {
      type: "one-to-many",
      target: "Pedido",
      inverseSide: "usuario",
    },
  },
});
