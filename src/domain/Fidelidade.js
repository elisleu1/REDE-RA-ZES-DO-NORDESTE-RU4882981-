import { EntitySchema } from "typeorm";

export const Fidelidade = new EntitySchema({
  name: "Fidelidade",
  tableName: "fidelidade",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    pontos: {
      type: Number,
      default: 0,
    },
  },
  relations: {
    usuario: {
      type: "one-to-one",
      target: "Usuario",
      joinColumn: true,
      inverseSide: "fidelidade",
    },
  },
});
