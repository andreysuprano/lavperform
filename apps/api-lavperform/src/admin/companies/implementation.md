# Admin Companies — Guia de Implementação

## Visão geral

O módulo de empresas admin permite gerenciar todas as empresas da plataforma: listar com filtros avançados, criar, atualizar, remover, alterar o status e consultar os usuários vinculados.

**Todos os endpoints exigem autenticação.** Obtenha o token em `POST /auth/login` e inclua em cada request:

```
Authorization: Bearer {{TOKEN}}
```

**Base URL:** `http://localhost:{{ADMIN_PORT}}`
**Prefixo:** `/admin/companies`

---

## Status de empresa (`CompanyStatus`)

O enum `CompanyStatus` define os possíveis estados de uma empresa:

| Valor | Descrição |
|---|---|
| `ACTIVE` | Empresa ativa e operando normalmente |
| `INACTIVE` | Empresa desativada |
| `PENDING` | Empresa aguardando ativação (estado padrão após criação) |

---

## Endpoints

### GET /admin/companies

Lista todas as empresas com paginação, ordenação e filtros opcionais.

#### Query params

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `page` | number | Não | `1` | Número da página (mínimo 1) |
| `limit` | number | Não | `100` | Itens por página (máximo 100) |
| `orderBy` | string | Não | `createdAt` | Campo para ordenação |
| `orderDirection` | `asc` \| `desc` | Não | `desc` | Direção da ordenação |
| `id` | string | Não | — | Filtrar por ID exato |
| `name` | string | Não | — | Busca parcial pelo nome (case-insensitive) |
| `state` | `ACTIVE` \| `INACTIVE` \| `PENDING` | Não | — | Filtrar por status |
| `startDate` | ISO 8601 | Não | — | Data de criação mínima |
| `endDate` | ISO 8601 | Não | — | Data de criação máxima |

#### Exemplo curl

```bash
curl -X GET "{{BASE_URL}}/admin/companies?page=1&limit=20&name=pizzaria&state=ACTIVE&orderBy=name&orderDirection=asc" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

```json
{
  "items": [
    {
      "id": "uuid-da-empresa",
      "name": "Pizzaria Exemplo",
      "cnpj": "12345678000190",
      "email": "contato@pizzaria.com",
      "phone": "(11) 99999-9999",
      "avatarUrl": null,
      "slug": "pizzaria-exemplo",
      "state": "ACTIVE",
      "businessPartnerId": null,
      "addressId": "uuid-do-endereco",
      "createdAt": "2026-01-10T10:00:00.000Z",
      "updatedAt": "2026-01-10T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 85,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
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

### GET /admin/companies/:id

Retorna os dados de uma empresa pelo ID, incluindo o endereço completo.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID da empresa |

#### Exemplo curl

```bash
curl -X GET "{{BASE_URL}}/admin/companies/uuid-da-empresa" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

```json
{
  "id": "uuid-da-empresa",
  "name": "Pizzaria Exemplo",
  "cnpj": "12345678000190",
  "email": "contato@pizzaria.com",
  "phone": "(11) 99999-9999",
  "avatarUrl": null,
  "slug": "pizzaria-exemplo",
  "state": "ACTIVE",
  "businessPartnerId": null,
  "addressId": "uuid-do-endereco",
  "address": {
    "id": "uuid-do-endereco",
    "zipCode": "01310-100",
    "street": "Avenida Paulista",
    "number": "1000",
    "complement": "Sala 1",
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP"
  },
  "createdAt": "2026-01-10T10:00:00.000Z",
  "updatedAt": "2026-01-10T10:00:00.000Z"
}
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Empresa não encontrada"` | ID não existe no banco |

```json
{
  "statusCode": 404,
  "message": "Empresa não encontrada",
  "error": "Not Found"
}
```

---

### POST /admin/companies

Cria uma nova empresa com endereço. O endereço é salvo em tabela separada e vinculado à empresa. Ao criar, também provisiona automaticamente a empresa no serviço de agentes de IA e cria uma configuração RFV padrão.

O status inicial é sempre `PENDING`.

#### Body

```json
{
  "slug": "pizzaria-exemplo",
  "name": "Pizzaria Exemplo",
  "cnpj": "12345678000190",
  "email": "contato@pizzaria.com",
  "phone": "(11) 99999-9999",
  "zipCode": "01310-100",
  "street": "Avenida Paulista",
  "number": "1000",
  "complement": "Sala 1",
  "neighborhood": "Bela Vista",
  "city": "São Paulo",
  "state": "SP",
  "businessPartnerId": null
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `slug` | string | Sim | Identificador único (URL-friendly) |
| `name` | string | Sim | Nome da empresa |
| `cnpj` | string | Sim | CNPJ único (somente números ou formatado) |
| `email` | string (email) | Sim | Email de contato |
| `phone` | string | Não | Telefone de contato |
| `zipCode` | string | Sim | CEP |
| `street` | string | Sim | Rua/Avenida |
| `number` | string | Sim | Número |
| `complement` | string | Não | Complemento |
| `neighborhood` | string | Sim | Bairro |
| `city` | string | Sim | Cidade |
| `state` | string | Sim | UF (ex: `SP`) |
| `businessPartnerId` | string (UUID) | Não | ID do parceiro de negócio |

#### Exemplo curl

```bash
curl -X POST "{{BASE_URL}}/admin/companies" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "pizzaria-exemplo",
    "name": "Pizzaria Exemplo",
    "cnpj": "12345678000190",
    "email": "contato@pizzaria.com",
    "phone": "(11) 99999-9999",
    "zipCode": "01310-100",
    "street": "Avenida Paulista",
    "number": "1000",
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP"
  }'
```

#### Resposta de sucesso — `201 Created`

```json
{
  "id": "uuid-nova-empresa",
  "name": "Pizzaria Exemplo",
  "cnpj": "12345678000190",
  "email": "contato@pizzaria.com",
  "phone": "(11) 99999-9999",
  "avatarUrl": null,
  "slug": "pizzaria-exemplo",
  "state": "PENDING",
  "businessPartnerId": null,
  "addressId": "uuid-do-endereco",
  "address": {
    "id": "uuid-do-endereco",
    "zipCode": "01310-100",
    "street": "Avenida Paulista",
    "number": "1000",
    "complement": null,
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP"
  },
  "createdAt": "2026-05-22T10:00:00.000Z",
  "updatedAt": "2026-05-22T10:00:00.000Z"
}
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `400 Bad Request` | `"Já existe uma empresa cadastrada com este CNPJ"` | CNPJ duplicado |
| `400 Bad Request` | array de strings de validação | Campo obrigatório ausente ou formato inválido |
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |

---

### PATCH /admin/companies/:id

Atualiza os dados de uma empresa existente. O endereço é fornecido aninhado no campo `address`.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID da empresa |

#### Body

```json
{
  "name": "Pizzaria Atualizada",
  "cnpj": "12345678000190",
  "email": "novo@pizzaria.com",
  "phone": "(11) 88888-8888",
  "address": {
    "zipCode": "01310-100",
    "street": "Avenida Paulista",
    "number": "2000",
    "complement": "Loja 2",
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP"
  }
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | Sim | Nome da empresa |
| `cnpj` | string | Sim | CNPJ |
| `email` | string (email) | Sim | Email |
| `phone` | string | Não | Telefone |
| `address` | objeto | Sim | Endereço completo aninhado |
| `address.zipCode` | string | Sim | CEP |
| `address.street` | string | Sim | Rua |
| `address.number` | string | Sim | Número |
| `address.complement` | string | Não | Complemento |
| `address.neighborhood` | string | Sim | Bairro |
| `address.city` | string | Sim | Cidade |
| `address.state` | string | Sim | UF |

> **Atenção:** A estrutura do body do PATCH é diferente do POST. No POST, os campos de endereço são flat (no nível raiz). No PATCH, ficam dentro do objeto `address`.

#### Exemplo curl

```bash
curl -X PATCH "{{BASE_URL}}/admin/companies/uuid-da-empresa" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pizzaria Atualizada",
    "cnpj": "12345678000190",
    "email": "novo@pizzaria.com",
    "address": {
      "zipCode": "01310-100",
      "street": "Avenida Paulista",
      "number": "2000",
      "neighborhood": "Bela Vista",
      "city": "São Paulo",
      "state": "SP"
    }
  }'
```

#### Resposta de sucesso — `200 OK`

```json
{
  "id": "uuid-da-empresa",
  "name": "Pizzaria Atualizada",
  "cnpj": "12345678000190",
  "email": "novo@pizzaria.com",
  "phone": null,
  "avatarUrl": null,
  "slug": "pizzaria-exemplo",
  "state": "ACTIVE",
  "businessPartnerId": null,
  "addressId": "uuid-do-endereco",
  "address": {
    "zipCode": "01310-100",
    "street": "Avenida Paulista",
    "number": "2000",
    "complement": "Loja 2",
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP"
  },
  "createdAt": "2026-01-10T10:00:00.000Z",
  "updatedAt": "2026-05-22T10:05:00.000Z"
}
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Empresa não encontrada"` | ID não existe no banco |

---

### DELETE /admin/companies/:id

Remove uma empresa. A empresa deve existir; caso contrário, retorna `404`.

> **Atenção:** A remoção pode falhar se houver registros dependentes (pedidos, campanhas, etc.) com restrição de chave estrangeira no banco. Prefira desativar a empresa via `PATCH /admin/companies/:id/state/INACTIVE` quando possível.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID da empresa |

#### Exemplo curl

```bash
curl -X DELETE "{{BASE_URL}}/admin/companies/uuid-da-empresa" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

Corpo vazio.

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Empresa não encontrada"` | ID não existe no banco |

---

### PATCH /admin/companies/:id/state/:state

Altera o status de uma empresa sem precisar enviar o body completo. Útil para ativar, inativar ou colocar em pendente.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID da empresa |
| `state` | `ACTIVE` \| `INACTIVE` \| `PENDING` | Novo status |

#### Exemplo curl — Ativar empresa

```bash
curl -X PATCH "{{BASE_URL}}/admin/companies/uuid-da-empresa/state/ACTIVE" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Exemplo curl — Desativar empresa

```bash
curl -X PATCH "{{BASE_URL}}/admin/companies/uuid-da-empresa/state/INACTIVE" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

```json
{
  "id": "uuid-da-empresa",
  "name": "Pizzaria Exemplo",
  "cnpj": "12345678000190",
  "email": "contato@pizzaria.com",
  "phone": "(11) 99999-9999",
  "avatarUrl": null,
  "slug": "pizzaria-exemplo",
  "state": "ACTIVE",
  "businessPartnerId": null,
  "addressId": "uuid-do-endereco",
  "createdAt": "2026-01-10T10:00:00.000Z",
  "updatedAt": "2026-05-22T10:10:00.000Z"
}
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Empresa não encontrada"` | ID não existe no banco |
| `400 Bad Request` | — | Valor de `state` inválido (não pertence ao enum) |

---

### GET /admin/companies/:id/users

Lista todos os usuários vinculados a uma empresa. Retorna apenas os dados básicos (sem `password`).

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID da empresa |

#### Exemplo curl

```bash
curl -X GET "{{BASE_URL}}/admin/companies/uuid-da-empresa/users" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

Array de usuários (pode ser vazio se nenhum usuário estiver vinculado).

```json
[
  {
    "id": "uuid-usuario-1",
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "phone": "(11) 99999-9999"
  },
  {
    "id": "uuid-usuario-2",
    "name": "Maria Santos",
    "email": "maria@exemplo.com",
    "phone": "(11) 88888-8888"
  }
]
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
