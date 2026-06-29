// src/config/swagger.js
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

// Carrega openapi.yaml se existir (opcional)
const yamlPath = path.resolve(process.cwd(), "openapi.yaml");
let externalDoc = null;
if (fs.existsSync(yamlPath)) {
  externalDoc = YAML.load(yamlPath);
}

const baseDefinition = externalDoc || {
  openapi: "3.0.3",
  info: {
    title: "API Pedidos e Gestão",
    version: "1.0.0",
    description: "API para gerenciamento de usuários, produtos, unidades e pedidos"
  },
  servers: [{ url: process.env.SWAGGER_SERVER_URL || "http://localhost:3000" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    }
  },
  security: [{ bearerAuth: [] }]
};

const options = {
  definition: baseDefinition,
  apis: [
    // ajuste os caminhos conforme sua estrutura de pastas
    "./src/routes/*.js",
    "./src/**/*.js",
    "./src/config/swagger-components/*.yaml"
  ]
};

const swaggerSpec = swaggerJSDoc(options);

/**
 * setupSwagger(app, opts)
 * - app: instância do express
 * - opts:
 *    - protectDocs: boolean (true = protege /docs com autenticação)
 *    - autenticarToken: middleware de autenticação (opcional)
 *    - authorizeRole: middleware de autorização (opcional)
 *    - allowedRolesForDocs: array de roles que podem acessar docs (ex: ['ADMIN'])
 */
export default function setupSwagger(app, opts = {}) {
  const { protectDocs = true, autenticarToken = null, authorizeRole = null, allowedRolesForDocs = ["ADMIN"] } = opts;

  // Rota pública para desenvolvimento
  if (!protectDocs) {
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    return;
  }

  // Protegendo a rota /docs
  if (autenticarToken && authorizeRole) {
    app.get("/docs", autenticarToken, authorizeRole(allowedRolesForDocs), swaggerUi.setup(swaggerSpec));
    app.use("/docs", autenticarToken, authorizeRole(allowedRolesForDocs), swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  } else {
    // Se não houver middlewares, só expõe em NODE_ENV !== 'production'
    if (process.env.NODE_ENV !== "production") {
      app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    } else {
      // Em produção e sem middlewares, não monta a rota
      console.warn("Swagger docs not mounted in production without authentication middlewares");
    }
  }
}

export { swaggerSpec };
