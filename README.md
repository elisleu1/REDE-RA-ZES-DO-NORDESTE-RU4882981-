<<<<<<< HEAD
# README - Sistema de Pedidos e Gestão (Raízes Nordeste)

## 1. Sobre o Projeto

Este projeto consiste em uma **API REST** desenvolvida para o gerenciamento de pedidos, produtos, unidades e usuários de uma rede de estabelecimentos (ex.: restaurantes). Foi construído com **Node.js** e **Express**, utilizando **TypeORM** para interação com banco de dados **MySQL** e **JWT** para autenticação.

O sistema contempla:

- Cadastro e autenticação de usuários (CLIENTE, ADMIN, ATENDENTE, COZINHA, ENTREGADOR);
- Gerenciamento de produtos, unidades e pedidos;
- Controle de estoque;
- Pontos de fidelidade;
- Pagamentos (com simulação de gateway externo);
- Relatórios financeiros, de produtos mais vendidos e por unidade;
- Auditoria completa de todas as ações relevantes.

A documentação interativa da API está disponível via **Swagger UI** (acessível em `/docs`).

---

## 2. Tecnologias Utilizadas

| Tecnologia | Versão (indicativa) |
|------------|----------------------|
| Node.js    | v22.x (ou superior)  |
| Express    | v5.2.1               |
| TypeORM    | v0.3.20              |
| MySQL      | v8.0+                |
| JSON Web Token | v9.0.3           |
| bcryptjs   | v3.0.3               |
| Swagger    | v6.3.0 (jsdoc)       |
| Nodemon    | v3.0.2 (desenvolvimento) |

O projeto utiliza **ES Modules** (`"type": "module"` no `package.json`).

---

## 3. Pré‑requisitos

Antes de iniciar, certifique-se de ter instalado:

- **Node.js** (versão compatível com ES Modules – recomendado v22.x ou superior)
- **MySQL Server** (versão 8.0+)
- **Git** (para clonar o repositório, se necessário)

---

## 4. Instalação e Configuração

### 4.1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd sistema-pedidos
```

### 4.2. Instale as dependências

```bash
npm install
```

### 4.3. Configure o banco de dados

1. **Crie um banco de dados MySQL** com o nome indicado no arquivo `data-source.js` (por padrão, `raizes_nordeste_db`):

   ```sql
   CREATE DATABASE raizes_nordeste_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Ajuste as credenciais** no arquivo `src/data-source.js` (ou, de preferência, utilize variáveis de ambiente – veja seção 4.4):

   ```javascript
   host: "localhost",
   port: 3306,
   username: "root",
   password: "sua_senha",
   database: "raizes_nordeste_db",
   ```

   > **Atenção:** O parâmetro `synchronize: true` criará automaticamente as tabelas ao iniciar a aplicação. Em produção, desative essa opção e utilize migrações.

2. | IMPORTANTE | Populando Banco de dados via (script de seed) |
   |------------------------------------------------------------|
   ** para fins de teste a uma vez criado o banco de dados e após instalado todas as ferramentas e dependências nessessárias para rodar a aplicação, basta executar (index.js) que já e insere automaticate dados no banco de dados (populando o bd), dados este que são:

   2.1 USUARIOS INSERIDOS AUTOMATICAMENTE (script de seed)
   ___________________________________________________________________________
   | nome   | email              | telefone    | role    | consentimentoLGPD |
   | ------ | ------------------ | ----------- | ------- | ----------------- |
   | Admin  | admin@example.com  | 11911111111 | ADMIN   | true              |
   | Cliente| cliente@example.com| 22922222222 | CLIENTE | true              |
   __________________________________________________________________________|

   2.1.1 **Para inserção manual direto no bando de dados MySQL  (EXEMPLO)
   INSERT INTO usuario (nome, email, telefone, senhaHash, role, fidelidadeId, consentimentoLGPD)
   VALUES ('Admin', 'admin@example.com', "99999999999" ,'$2b$10$IGqDgqXi/pijOULEKz7/negxm5xNJN1k4GznA1JNwj3xe4//AQQWW', 'ADMIN', 1, 1);

   2.2 **UNIDADES INSERIDAS AUTOMATICAMENTE (script de seed)
   ____________________________________________________________________________
   | nome            | endereco                                   | cep       |
   | --------------- | ------------------------------------------ | --------- |
   | Recife_unid     | Av. Agamenon Magalhães, 2990               | 52021-170 |
   | Salvador_unid   | Av. Tancredo Neves, 620                    | 41820-020 |
   | Fortaleza_unid  | Av. Santos Dumont, 2626                    | 60150-161 |
   | São_Luís_unid   | Av. Jerônimo de Albuquerque, 2000          | 65074-199 |
   | Natal_unid      | Av. Hermes da Fonseca, 950                 | 59020-650 |
   | Maceió_unid     | Av. Fernandes Lima, 1024                   | 57050-000 |
   ___________________________________________________________________________|

   2.2.1 **Para inserção manual de UNIDADES direto no bando de dados MySQL  (EXEMPLO)
   INSERT INTO unidade (nome, endereco, cep) VALUES
   ('Recife', 'Av. Agamenon Magalhães, 2990', '52021-170'),


   2.3 **Produtos INSERIDOS AUTOMATICAMENTE (script de seed)
      ____________________________________________________________________________________________
   | nome                                                   | preco | categoria        | estoque |
   | ------------------------------------------------------ | ----- | ---------------- | ------- |
   | Cuscuz Recheado com Carne de Sol                       | 18.50 | cuscuz           | 50      |
   | Tapioca de Queijo Coalho com Manteiga de Garrafa       | 12.00 | tapiocas         | 60      |
   | Bolo de Macaxeira                                      | 8.50  | bolos            | 30      |
   | Café Coado na Hora (Grande)                            | 5.50  | bebidas quentes  | 200     |
   | Suco de Acerola Natural                                | 7.00  | sucos regionais  | 100     |
   | Suco de Cajá Nordestino                                | 8.00  | sucos regionais  | 80      |
   | Cartola Tradicional (Banana, Queijo, Açúcar e Canela)  | 15.00 | sobremesas       | 25      |
   | Paçoca de Pilão (Porção)                               | 10.00 | porcoes          | 40      |
   | Manteiga de Garrafa (Dose Extra)                       | 3.00  | adicionais       | 150     |
   | Combo Amanhecer Nordestino                             | 28.00 | combos           | 20      |
   ______________________________________________________________________________________________|

   2.3.1 **Para inserção manual de PRODUTOS direto no bando de dados MySQL  (EXEMPLO)
   INSERT INTO produto (nome, preco, categoria, estoque) VALUES
   ('Cuscuz Recheado com Carne de Sol', 18.50, 'cuscuz', 50),

### 4.4. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
PORT=3000
JWT_SECRET=sua_chave_secreta_super_segura 
```

- `PORT`: porta em que o servidor irá rodar (padrão 3000).
- `JWT_SECRET`: chave secreta usada para assinar os tokens JWT – **obrigatória**.

O código já utiliza `dotenv` para carregar essas variáveis.

---

## 5. Execução

### 5.1. Modo desenvolvimento (com auto‑recarregamento)

```bash
npm run dev
```

### 5.2. Modo produção

```bash
npm start
```

Após iniciar, a API estará disponível em `http://localhost:3000` (ou na porta definida no `.env`). O Swagger UI estará em `http://localhost:3000/docs` (acesso liberado para **ADMIN**).

---

## 6. Estrutura de Diretórios

```
.
├── src/
│   ├── config/
│   │   └── swagger.js           # Configuração do Swagger (carrega openapi.yaml)
│   ├── domain/                  # Entidades TypeORM (Usuario, Pedido, Produto, etc.)
│   ├── middleware/
│   │   ├── auth.js              # Middleware de autenticação JWT
│   │   └── authorize.js         # Middleware de autorização por role
│   ├── routes/
│   │   ├── usuarios.js
│   │   ├── pedidos.js
│   │   ├── produtos.js
│   │   └── unidades.js
│   ├── services/
│   │   └── servicoPagamentoMock.js  # Simula gateway de pagamento
│   ├── data-source.js           # Configuração do TypeORM
│   └── index.js                 # Ponto de entrada da aplicação
├── openapi.yaml                 # Especificação OpenAPI para a documentação
├── package.json
├── package-lock.json
├── .env                         
└── README.md
```

> **Nota:** As entidades do domínio (`Usuario.js`, `Pedido.js`, etc.) não estão detalhadas aqui, mas seguem a estrutura definida no `openapi.yaml` e nos repositórios.

---

## 7. Autenticação e Autorização

- A maioria dos endpoints exige um token JWT, enviado no cabeçalho `Authorization: Bearer <token>`.
- O token é obtido no login (`POST /usuarios/login`) e contém o `id`, `email` e `role` do usuário.
- Os papéis (`role`) disponíveis são: `CLIENTE`, `ADMIN`, `ATENDENTE`, `COZINHA`, `ENTREGADOR`.
- As permissões são verificadas pelo middleware `authorizeRole`, que restringe o acesso conforme a função.

---

## 8. Endpoints Principais
Base URL: http://localhost:3000  (caso a pota que esteja usando nao seja a 3000, usa a que você configurou no index e no seu bd)
Exemplo de caminho completo inserino a URL Base colando o endpoint ao final dela:
REGITAR USUÁRIO: http://localhost:3000/usuarios/register

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST   | `/usuarios/register` | Cadastro de novo cliente (consentimento LGPD obrigatório) | Público |
| POST   | `/usuarios/login` | Login e obtenção do token JWT | Público |
| GET    | `/usuarios` | Lista todos os usuários | ADMIN, ATENDENTE |
| GET    | `/usuarios/:id` | Busca usuário por ID | ADMIN, ATENDENTE |
| PUT    | `/usuarios/:id` | Atualiza dados do usuário | ADMIN ou próprio |
| DELETE | `/usuarios/:id` | Exclui conta (própria ou qualquer uma se ADMIN) | ADMIN ou próprio |
| POST   | `/usuarios/register-admin` | Registra funcionário (ADMIN, ATENDENTE, COZINHA, ENTREGADOR) | ADMIN |
| GET    | `/usuarios/:id/fidelidade` | Consulta pontos de fidelidade | Autenticado |
| GET    | `/produtos` | Lista produtos | Público |
| POST   | `/produtos` | Cria produto | ADMIN |
| PUT    | `/produtos/:id` | Atualiza produto | ADMIN |
| DELETE | `/produtos/:id` | Remove produto | ADMIN |
| GET    | `/unidades` | Lista unidades | Público |
| POST   | `/unidades` | Cria unidade | ADMIN |
| PUT    | `/unidades/:id` | Atualiza unidade | ADMIN |
| DELETE | `/unidades/:id` | Remove unidade | ADMIN |
| POST   | `/pedidos` | Cria um pedido (com baixa de estoque) | CLIENTE, ADMIN |
| GET    | `/pedidos` | Lista todos os pedidos | ADMIN, ATENDENTE |
| GET    | `/pedidos/status/:status` | Filtra pedidos por status | Público (mas retorna dados) |
| GET    | `/pedidos/:id` | Busca pedido por ID (restrição para CLIENTE ver só o seu) | ADMIN, ATENDENTE, CLIENTE |
| PUT    | `/pedidos/:id` | Atualiza dados do pedido | ADMIN ou próprio CLIENTE |
| POST   | `/pedidos/:id/pagar` | Registra pagamento e gera pontos de fidelidade | CLIENTE, ADMIN |
| PATCH  | `/pedidos/:id/cancelar` | Cancela pedido e devolve estoque | ADMIN ou próprio CLIENTE |
| PATCH  | `/pedidos/:id/status` | Atualiza o status do pedido | ATENDENTE, ENTREGADOR, COZINHA, ADMIN |
| GET    | `/pedidos/relatorios/financeiro` | Relatório financeiro detalhado | ADMIN |
| GET    | `/pedidos/relatorios/produtos` | Ranking de produtos mais consumidos | ADMIN |
| GET    | `/pedidos/relatorios/unidades` | Vendas por unidade | ADMIN |
| GET    | `/pedidos/relatorios/auditoria-completa` | Registro de auditoria | ADMIN |

> **Importante:** Os relatórios e a página do Swagger são restritos a **ADMIN**.

---

## 9. Exemplo de Fluxo de Uso

1. **Cadastro de cliente**  
   `POST /usuarios/register` com `nome`, `senha` e `consentimentoLGPD: true`.

2. **Login**  
   `POST /usuarios/login` com `email` (ou `telefone`) e `senha`.  
   Resposta contém o `token` JWT.

3. **Criar um pedido** (autenticado)  
   `POST /pedidos` informando `unidadeId`, lista de `itens` (com `produtoId` e `quantidade`) e opções de pagamento/entrega.

4. **Pagar o pedido**  
   `POST /pedidos/{id}/pagar` com `metodo` e `valorPago`.  
   O status do pedido muda para `EM PRODUÇÃO` e o cliente ganha pontos de fidelidade.

5. **Acompanhar status**  
   `GET /pedidos/{id}` ou `GET /pedidos/status/{status}`.

6. **Cancelar pedido** (se ainda não entregue)  
   `PATCH /pedidos/{id}/cancelar` – o estoque é devolvido.

7. **Relatórios** (somente ADMIN)  
   Utilize as rotas de relatório para obter dados financeiros, de produtos e de unidades.

---

## 10. Documentação da API (Swagger)

A especificação OpenAPI está disponível no arquivo `openapi.yaml`. Para visualizar a interface interativa:

- Inicie o servidor.
- Acesse `http://localhost:3000/docs` no navegador.
- Faça login (via endpoint `/usuarios/login`) para obter o token.
- Clique em **Authorize** no Swagger, insira o token no formato `Bearer <token>` e teste os endpoints autenticados.

---

## 11. Testes com Postman

Na raiz do projeto, há um arquivo `Trilha Back-End Uninter.postman_collection.json` com todos os endpoints pré‑configurados. Importe‑o no Postman para testar a API rapidamente. Lembre‑se de atualizar o token nos requests que exigem autenticação.

---

## 12. Considerações Finais

- O banco de dados é recriado a cada inicialização se `synchronize: true` estiver ativo – em desenvolvimento é prático, mas em produção utilize migrações.
- O serviço de pagamento é um **mock** – substitua pela integração real em produção.
- As senhas são armazenadas com hash (bcrypt).
- A LGPD é respeitada com o consentimento explícito no cadastro.

---

## 13. Contato

Para dúvidas ou sugestões, entre em contato com o desenvolvedor:  
[ eliseufaris@hotmail.com ]

---

=======
# README - Sistema de Pedidos e Gestão (Raízes Nordeste)

## 1. Sobre o Projeto

Este projeto consiste em uma **API REST** desenvolvida para o gerenciamento de pedidos, produtos, unidades e usuários de uma rede de estabelecimentos (ex.: restaurantes). Foi construído com **Node.js** e **Express**, utilizando **TypeORM** para interação com banco de dados **MySQL** e **JWT** para autenticação.

O sistema contempla:

- Cadastro e autenticação de usuários (CLIENTE, ADMIN, ATENDENTE, COZINHA, ENTREGADOR);
- Gerenciamento de produtos, unidades e pedidos;
- Controle de estoque;
- Pontos de fidelidade;
- Pagamentos (com simulação de gateway externo);
- Relatórios financeiros, de produtos mais vendidos e por unidade;
- Auditoria completa de todas as ações relevantes.

A documentação interativa da API está disponível via **Swagger UI** (acessível em `/docs`).

---

## 2. Tecnologias Utilizadas

| Tecnologia | Versão (indicativa) |
|------------|----------------------|
| Node.js    | v22.x (ou superior)  |
| Express    | v5.2.1               |
| TypeORM    | v0.3.20              |
| MySQL      | v8.0+                |
| JSON Web Token | v9.0.3           |
| bcryptjs   | v3.0.3               |
| Swagger    | v6.3.0 (jsdoc)       |
| Nodemon    | v3.0.2 (desenvolvimento) |

O projeto utiliza **ES Modules** (`"type": "module"` no `package.json`).

---

## 3. Pré‑requisitos

Antes de iniciar, certifique-se de ter instalado:

- **Node.js** (versão compatível com ES Modules – recomendado v22.x ou superior)
- **MySQL Server** (versão 8.0+)
- **Git** (para clonar o repositório, se necessário)

---

## 4. Instalação e Configuração

### 4.1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd sistema-pedidos
```

### 4.2. Instale as dependências

```bash
npm install
```

### 4.3. Configure o banco de dados

1. **Crie um banco de dados MySQL** com o nome indicado no arquivo `data-source.js` (por padrão, `raizes_nordeste_db`):

   ```sql
   CREATE DATABASE raizes_nordeste_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Ajuste as credenciais** no arquivo `src/data-source.js` (ou, de preferência, utilize variáveis de ambiente – veja seção 4.4):

   ```javascript
   host: "localhost",
   port: 3306,
   username: "root",
   password: "sua_senha",
   database: "raizes_nordeste_db",
   ```

   > **Atenção:** O parâmetro `synchronize: true` criará automaticamente as tabelas ao iniciar a aplicação. Em produção, desative essa opção e utilize migrações.

2. | IMPORTANTE | Populando Banco de dados via (script de seed) |
   |------------------------------------------------------------|
   ** para fins de teste a uma vez criado o banco de dados e após instalado todas as ferramentas e dependências nessessárias para rodar a aplicação, basta executar (index.js) que já e insere automaticate dados no banco de dados (populando o bd), dados este que são:

   2.1 USUARIOS INSERIDOS AUTOMATICAMENTE (script de seed)
   ___________________________________________________________________________
   | nome   | email              | telefone    | role    | consentimentoLGPD |
   | ------ | ------------------ | ----------- | ------- | ----------------- |
   | Admin  | admin@example.com  | 11911111111 | ADMIN   | true              |
   | Cliente| cliente@example.com| 22922222222 | CLIENTE | true              |
   __________________________________________________________________________|

   2.1.1 **Para inserção manual direto no bando de dados MySQL  (EXEMPLO)
   INSERT INTO usuario (nome, email, telefone, senhaHash, role, fidelidadeId, consentimentoLGPD)
   VALUES ('Admin', 'admin@example.com', "99999999999" ,'$2b$10$IGqDgqXi/pijOULEKz7/negxm5xNJN1k4GznA1JNwj3xe4//AQQWW', 'ADMIN', 1, 1);

   2.2 **UNIDADES INSERIDAS AUTOMATICAMENTE (script de seed)
   ____________________________________________________________________________
   | nome            | endereco                                   | cep       |
   | --------------- | ------------------------------------------ | --------- |
   | Recife_unid     | Av. Agamenon Magalhães, 2990               | 52021-170 |
   | Salvador_unid   | Av. Tancredo Neves, 620                    | 41820-020 |
   | Fortaleza_unid  | Av. Santos Dumont, 2626                    | 60150-161 |
   | São_Luís_unid   | Av. Jerônimo de Albuquerque, 2000          | 65074-199 |
   | Natal_unid      | Av. Hermes da Fonseca, 950                 | 59020-650 |
   | Maceió_unid     | Av. Fernandes Lima, 1024                   | 57050-000 |
   ___________________________________________________________________________|

   2.2.1 **Para inserção manual de UNIDADES direto no bando de dados MySQL  (EXEMPLO)
   INSERT INTO unidade (nome, endereco, cep) VALUES
   ('Recife', 'Av. Agamenon Magalhães, 2990', '52021-170'),


   2.3 **Produtos INSERIDOS AUTOMATICAMENTE (script de seed)
      ____________________________________________________________________________________________
   | nome                                                   | preco | categoria        | estoque |
   | ------------------------------------------------------ | ----- | ---------------- | ------- |
   | Cuscuz Recheado com Carne de Sol                       | 18.50 | cuscuz           | 50      |
   | Tapioca de Queijo Coalho com Manteiga de Garrafa       | 12.00 | tapiocas         | 60      |
   | Bolo de Macaxeira                                      | 8.50  | bolos            | 30      |
   | Café Coado na Hora (Grande)                            | 5.50  | bebidas quentes  | 200     |
   | Suco de Acerola Natural                                | 7.00  | sucos regionais  | 100     |
   | Suco de Cajá Nordestino                                | 8.00  | sucos regionais  | 80      |
   | Cartola Tradicional (Banana, Queijo, Açúcar e Canela)  | 15.00 | sobremesas       | 25      |
   | Paçoca de Pilão (Porção)                               | 10.00 | porcoes          | 40      |
   | Manteiga de Garrafa (Dose Extra)                       | 3.00  | adicionais       | 150     |
   | Combo Amanhecer Nordestino                             | 28.00 | combos           | 20      |
   ______________________________________________________________________________________________|

   2.3.1 **Para inserção manual de PRODUTOS direto no bando de dados MySQL  (EXEMPLO)
   INSERT INTO produto (nome, preco, categoria, estoque) VALUES
   ('Cuscuz Recheado com Carne de Sol', 18.50, 'cuscuz', 50),

### 4.4. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
PORT=3000
JWT_SECRET=sua_chave_secreta_super_segura 
```

- `PORT`: porta em que o servidor irá rodar (padrão 3000).
- `JWT_SECRET`: chave secreta usada para assinar os tokens JWT – **obrigatória**.

O código já utiliza `dotenv` para carregar essas variáveis.

---

## 5. Execução

### 5.1. Modo desenvolvimento (com auto‑recarregamento)

```bash
npm run dev
```

### 5.2. Modo produção

```bash
npm start
```

Após iniciar, a API estará disponível em `http://localhost:3000` (ou na porta definida no `.env`). O Swagger UI estará em `http://localhost:3000/docs` (acesso liberado para **ADMIN**).

---

## 6. Estrutura de Diretórios

```
.
├── src/
│   ├── config/
│   │   └── swagger.js           # Configuração do Swagger (carrega openapi.yaml)
│   ├── domain/                  # Entidades TypeORM (Usuario, Pedido, Produto, etc.)
│   ├── middleware/
│   │   ├── auth.js              # Middleware de autenticação JWT
│   │   └── authorize.js         # Middleware de autorização por role
│   ├── routes/
│   │   ├── usuarios.js
│   │   ├── pedidos.js
│   │   ├── produtos.js
│   │   └── unidades.js
│   ├── services/
│   │   └── servicoPagamentoMock.js  # Simula gateway de pagamento
│   ├── data-source.js           # Configuração do TypeORM
│   └── index.js                 # Ponto de entrada da aplicação
├── openapi.yaml                 # Especificação OpenAPI para a documentação
├── package.json
├── package-lock.json
├── .env                         
└── README.md
```

> **Nota:** As entidades do domínio (`Usuario.js`, `Pedido.js`, etc.) não estão detalhadas aqui, mas seguem a estrutura definida no `openapi.yaml` e nos repositórios.

---

## 7. Autenticação e Autorização

- A maioria dos endpoints exige um token JWT, enviado no cabeçalho `Authorization: Bearer <token>`.
- O token é obtido no login (`POST /usuarios/login`) e contém o `id`, `email` e `role` do usuário.
- Os papéis (`role`) disponíveis são: `CLIENTE`, `ADMIN`, `ATENDENTE`, `COZINHA`, `ENTREGADOR`.
- As permissões são verificadas pelo middleware `authorizeRole`, que restringe o acesso conforme a função.

---

## 8. Endpoints Principais
Base URL: http://localhost:3000  (caso a pota que esteja usando nao seja a 3000, usa a que você configurou no index e no seu bd)
Exemplo de caminho completo inserino a URL Base colando o endpoint ao final dela:
REGITAR USUÁRIO: http://localhost:3000/usuarios/register

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST   | `/usuarios/register` | Cadastro de novo cliente (consentimento LGPD obrigatório) | Público |
| POST   | `/usuarios/login` | Login e obtenção do token JWT | Público |
| GET    | `/usuarios` | Lista todos os usuários | ADMIN, ATENDENTE |
| GET    | `/usuarios/:id` | Busca usuário por ID | ADMIN, ATENDENTE |
| PUT    | `/usuarios/:id` | Atualiza dados do usuário | ADMIN ou próprio |
| DELETE | `/usuarios/:id` | Exclui conta (própria ou qualquer uma se ADMIN) | ADMIN ou próprio |
| POST   | `/usuarios/register-admin` | Registra funcionário (ADMIN, ATENDENTE, COZINHA, ENTREGADOR) | ADMIN |
| GET    | `/usuarios/:id/fidelidade` | Consulta pontos de fidelidade | Autenticado |
| GET    | `/produtos` | Lista produtos | Público |
| POST   | `/produtos` | Cria produto | ADMIN |
| PUT    | `/produtos/:id` | Atualiza produto | ADMIN |
| DELETE | `/produtos/:id` | Remove produto | ADMIN |
| GET    | `/unidades` | Lista unidades | Público |
| POST   | `/unidades` | Cria unidade | ADMIN |
| PUT    | `/unidades/:id` | Atualiza unidade | ADMIN |
| DELETE | `/unidades/:id` | Remove unidade | ADMIN |
| POST   | `/pedidos` | Cria um pedido (com baixa de estoque) | CLIENTE, ADMIN |
| GET    | `/pedidos` | Lista todos os pedidos | ADMIN, ATENDENTE |
| GET    | `/pedidos/status/:status` | Filtra pedidos por status | Público (mas retorna dados) |
| GET    | `/pedidos/:id` | Busca pedido por ID (restrição para CLIENTE ver só o seu) | ADMIN, ATENDENTE, CLIENTE |
| PUT    | `/pedidos/:id` | Atualiza dados do pedido | ADMIN ou próprio CLIENTE |
| POST   | `/pedidos/:id/pagar` | Registra pagamento e gera pontos de fidelidade | CLIENTE, ADMIN |
| PATCH  | `/pedidos/:id/cancelar` | Cancela pedido e devolve estoque | ADMIN ou próprio CLIENTE |
| PATCH  | `/pedidos/:id/status` | Atualiza o status do pedido | ATENDENTE, ENTREGADOR, COZINHA, ADMIN |
| GET    | `/pedidos/relatorios/financeiro` | Relatório financeiro detalhado | ADMIN |
| GET    | `/pedidos/relatorios/produtos` | Ranking de produtos mais consumidos | ADMIN |
| GET    | `/pedidos/relatorios/unidades` | Vendas por unidade | ADMIN |
| GET    | `/pedidos/relatorios/auditoria-completa` | Registro de auditoria | ADMIN |

> **Importante:** Os relatórios e a página do Swagger são restritos a **ADMIN**.

---

## 9. Exemplo de Fluxo de Uso

1. **Cadastro de cliente**  
   `POST /usuarios/register` com `nome`, `senha` e `consentimentoLGPD: true`.

2. **Login**  
   `POST /usuarios/login` com `email` (ou `telefone`) e `senha`.  
   Resposta contém o `token` JWT.

3. **Criar um pedido** (autenticado)  
   `POST /pedidos` informando `unidadeId`, lista de `itens` (com `produtoId` e `quantidade`) e opções de pagamento/entrega.

4. **Pagar o pedido**  
   `POST /pedidos/{id}/pagar` com `metodo` e `valorPago`.  
   O status do pedido muda para `EM PRODUÇÃO` e o cliente ganha pontos de fidelidade.

5. **Acompanhar status**  
   `GET /pedidos/{id}` ou `GET /pedidos/status/{status}`.

6. **Cancelar pedido** (se ainda não entregue)  
   `PATCH /pedidos/{id}/cancelar` – o estoque é devolvido.

7. **Relatórios** (somente ADMIN)  
   Utilize as rotas de relatório para obter dados financeiros, de produtos e de unidades.

---

## 10. Documentação da API (Swagger)

A especificação OpenAPI está disponível no arquivo `openapi.yaml`. Para visualizar a interface interativa:

- Inicie o servidor.
- Acesse `http://localhost:3000/docs` no navegador.
- Faça login (via endpoint `/usuarios/login`) para obter o token.
- Clique em **Authorize** no Swagger, insira o token no formato `Bearer <token>` e teste os endpoints autenticados.

---

## 11. Testes com Postman

Na raiz do projeto, há um arquivo `Trilha Back-End Uninter.postman_collection.json` com todos os endpoints pré‑configurados. Importe‑o no Postman para testar a API rapidamente. Lembre‑se de atualizar o token nos requests que exigem autenticação.

---

## 12. Considerações Finais

- O banco de dados é recriado a cada inicialização se `synchronize: true` estiver ativo – em desenvolvimento é prático, mas em produção utilize migrações.
- O serviço de pagamento é um **mock** – substitua pela integração real em produção.
- As senhas são armazenadas com hash (bcrypt).
- A LGPD é respeitada com o consentimento explícito no cadastro.

---

## 13. Contato

Para dúvidas ou sugestões, entre em contato com o desenvolvedor:  
[ eliseufaris@hotmail.com ]

---

>>>>>>> 6634d5918bb763b0558a4682321abe7094fc58c4
**Desenvolvido como trabalho acadêmico para a disciplina Trilha Back‑End – Uninter.**