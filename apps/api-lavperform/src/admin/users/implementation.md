# Admin Users — Guia de Implementação

## Visão geral

O módulo de usuários admin permite gerenciar todos os usuários da plataforma: listar, criar, atualizar, remover, trocar senha e gerenciar os vínculos entre usuários e empresas.

**Todos os endpoints exigem autenticação.** Obtenha o token em `POST /auth/login` e inclua em cada request:

```
Authorization: Bearer {{TOKEN}}
```

**Base URL:** `http://localhost:{{ADMIN_PORT}}`
**Prefixo:** `/admin/users`

---

## Endpoints

### GET /admin/users

Lista todos os usuários com paginação e filtros opcionais. A resposta nunca inclui o campo `password`.

#### Query params

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `page` | number | Não | `1` | Número da página (mínimo 1) |
| `limit` | number | Não | `100` | Itens por página (máximo 100) |
| `orderBy` | string | Não | `createdAt` | Campo para ordenação |
| `orderDirection` | `asc` \| `desc` | Não | `desc` | Direção da ordenação |
| `id` | string | Não | — | Filtrar por ID exato |
| `startDate` | ISO 8601 | Não | — | Data de criação mínima |
| `endDate` | ISO 8601 | Não | — | Data de criação máxima |

#### Exemplo curl

```bash
curl -X GET "{{BASE_URL}}/admin/users?page=1&limit=20&orderBy=name&orderDirection=asc" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

```json
{
  "items": [
    {
      "id": "uuid-do-usuario",
      "name": "João Silva",
      "email": "joao@exemplo.com",
      "phone": "(11) 99999-9999",
      "avatarUrl": null,
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

#### Respostas de erro

| Status | Descrição |
|---|---|
| `401 Unauthorized` | Token ausente, inválido ou expirado |

---

### GET /admin/users/:id

Retorna os dados de um único usuário pelo ID. O campo `password` nunca é retornado.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID do usuário |

#### Exemplo curl

```bash
curl -X GET "{{BASE_URL}}/admin/users/uuid-do-usuario" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

```json
{
  "id": "uuid-do-usuario",
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "phone": "(11) 99999-9999",
  "avatarUrl": null,
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Usuário não encontrado"` | ID não existe no banco |

```json
{
  "statusCode": 404,
  "message": "Usuário não encontrado",
  "error": "Not Found"
}
```

---

### POST /admin/users

Cria um novo usuário. O campo `password` é hasheado automaticamente antes de salvar.

#### Body

```json
{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "password": "senha123",
  "phone": "(11) 99999-9999"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | Sim | Nome completo do usuário |
| `email` | string (email) | Sim | Email único do usuário |
| `password` | string | Sim | Senha em texto plano (será hasheada) |
| `phone` | string | Sim | Telefone do usuário |

#### Exemplo curl

```bash
curl -X POST "{{BASE_URL}}/admin/users" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "password": "senha123",
    "phone": "(11) 99999-9999"
  }'
```

#### Resposta de sucesso — `201 Created`

```json
{
  "id": "uuid-novo",
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "phone": "(11) 99999-9999",
  "avatarUrl": null,
  "createdAt": "2026-05-22T10:00:00.000Z",
  "updatedAt": "2026-05-22T10:00:00.000Z"
}
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `400 Bad Request` | `"Já existe um usuário cadastrado com este email"` | Email duplicado |
| `400 Bad Request` | array de strings de validação | Campo obrigatório ausente ou formato inválido |
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |

```json
{
  "statusCode": 400,
  "message": "Já existe um usuário cadastrado com este email",
  "error": "Bad Request"
}
```

---

### PATCH /admin/users/:id

Atualiza os dados de um usuário existente. Se `password` for enviado, ele será rehasheado.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID do usuário |

#### Body

Mesmos campos do `POST /admin/users`. Todos são tecnicamente aceitos, envie apenas o que deseja alterar.

```json
{
  "name": "João Silva Atualizado",
  "email": "joao.novo@exemplo.com",
  "password": "nova-senha",
  "phone": "(11) 88888-8888"
}
```

#### Exemplo curl

```bash
curl -X PATCH "{{BASE_URL}}/admin/users/uuid-do-usuario" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva Atualizado",
    "phone": "(11) 88888-8888"
  }'
```

#### Resposta de sucesso — `200 OK`

```json
{
  "id": "uuid-do-usuario",
  "name": "João Silva Atualizado",
  "email": "joao@exemplo.com",
  "phone": "(11) 88888-8888",
  "avatarUrl": null,
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-05-22T10:00:00.000Z"
}
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Usuário não encontrado"` | ID não existe no banco |

---

### DELETE /admin/users/:id

Remove um usuário e todos os seus vínculos com empresas (`UserCompany`) antes de excluí-lo.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID do usuário |

#### Exemplo curl

```bash
curl -X DELETE "{{BASE_URL}}/admin/users/uuid-do-usuario" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

Corpo vazio ou objeto do usuário removido (depende da implementação do repositório).

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Usuário não encontrado"` | ID não existe no banco |

---

### PATCH /admin/users/:id/password

Troca a senha de um usuário diretamente, sem exigir código de confirmação. A senha é hasheada antes de salvar.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID do usuário |

#### Body

```json
{
  "newPassword": "nova-senha-123"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `newPassword` | string | Sim | Nova senha (mínimo 6 caracteres) |

#### Exemplo curl

```bash
curl -X PATCH "{{BASE_URL}}/admin/users/uuid-do-usuario/password" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "nova-senha-123"
  }'
```

#### Resposta de sucesso — `200 OK`

```json
{
  "id": "uuid-do-usuario",
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "phone": "(11) 99999-9999",
  "avatarUrl": null,
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-05-22T10:05:00.000Z"
}
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `400 Bad Request` | `"newPassword must be longer than or equal to 6 characters"` | Senha com menos de 6 caracteres |
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Usuário não encontrado"` | ID não existe no banco |

---

### POST /admin/users/:userId/companies/:companyId

Vincula um usuário a uma empresa, criando um registro na tabela `UserCompany`. Se o vínculo já existir, ele é mantido sem erro (operação idempotente).

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `userId` | string (UUID) | ID do usuário |
| `companyId` | string (UUID) | ID da empresa |

#### Exemplo curl

```bash
curl -X POST "{{BASE_URL}}/admin/users/uuid-do-usuario/companies/uuid-da-empresa" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `201 Created`

```json
{
  "id": "uuid-do-vinculo",
  "userId": "uuid-do-usuario",
  "companyId": "uuid-da-empresa",
  "createdAt": "2026-05-22T10:00:00.000Z",
  "updatedAt": "2026-05-22T10:00:00.000Z"
}
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Usuário não encontrado"` | `userId` não existe |
| `404 Not Found` | `"Empresa não encontrada"` | `companyId` não existe |

---

### DELETE /admin/users/:userId/companies/:companyId

Desvincula um usuário de uma empresa, removendo o registro `UserCompany`.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `userId` | string (UUID) | ID do usuário |
| `companyId` | string (UUID) | ID da empresa |

#### Exemplo curl

```bash
curl -X DELETE "{{BASE_URL}}/admin/users/uuid-do-usuario/companies/uuid-da-empresa" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

Corpo vazio.

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Vínculo entre usuário e empresa não encontrado"` | A combinação userId + companyId não existe na tabela UserCompany |

```json
{
  "statusCode": 404,
  "message": "Vínculo entre usuário e empresa não encontrado",
  "error": "Not Found"
}
```
