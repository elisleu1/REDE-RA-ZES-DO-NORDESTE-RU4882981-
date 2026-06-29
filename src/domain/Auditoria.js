import { EntitySchema } from "typeorm";

export const Auditoria = new EntitySchema({
  name: "Auditoria",
  tableName: "auditoria",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: true,
    },
    usuarioId: {
      type: "int",
      nullable: false,
    },
    acao: {
      type: "varchar",
      length: 255,
      nullable: false, // ex: "CRIAR_PEDIDO", "PAGAR_PEDIDO", "CONSULTAR_FIDELIDADE"
    },
    recurso: {
      type: "varchar",
      length: 255,
      nullable: false, // rota ou recurso acessado
    },
    detalhes: {
      type: "text",
      nullable: true, // JSON com dados extras (pedidoId, valor, etc.)
    },
    dataAcao: {
      type: "datetime",
      default: () => "CURRENT_TIMESTAMP",
    },
  },
  relations: {
    usuario: {
      type: "many-to-one",
      target: "Usuario",
      joinColumn: true,
    },
  },
});
