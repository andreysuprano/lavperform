# API Endpoint Reference

> For detailed API behavior, examples, and integration tests, see [Testing Guide](./guides/testing-guide.md).

This document lists all the API endpoints available in the application, their behaviors, and dependencies.

## Application (`application`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| GET | `/application/preload` | Carregar todas as informações necessárias para o carregamento da aplicação | **Tables**: `Users`, `Companies` (via `UserRepository`). <br> **Behavior**: Loads user data along with their associated companies and addresses. |
| GET | `/application/debug-sentry` | - | Returns current day of week (No DB interaction). |

## Auth (`auth`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| POST | `/auth/login` | Fazer login | **Tables**: `Users`, `Companies`. <br> **Libraries**: `bcrypt` (password check), `jwt`. <br> **Behavior**: Validates credentials and returns JWT with user & company context. |
| POST | `/auth/forgot-password` | Solicitar código de recuperação de senha | **Tables**: `Users`, `ConfirmationCode`. <br> **External**: `SMTP` (Send Email). <br> **Behavior**: Generates code and sends via email. |
| POST | `/auth/confirm-code` | Confirmar código de recuperação de senha | **Tables**: `Users`, `ConfirmationCode`. <br> **Behavior**: Validates code and updates user password (hashed). |

## Automatic Campaigns (`campaigns/automatic/:companyId/`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| POST | `/campaigns/automatic/:companyId/` | Criar uma nova campanha automática | **Tables**: `AutomaticCampaign`, `Gift`. |
| GET | `/campaigns/automatic/:companyId/` | Listar todas as campanhas automáticas de uma empresa | **Tables**: `AutomaticCampaign`. |
| GET | `/campaigns/automatic/:companyId/:id` | Buscar uma campanha automática por ID | **Tables**: `AutomaticCampaign`. |
| PUT | `/campaigns/automatic/:companyId/:id` | Atualizar uma campanha automática | **Tables**: `AutomaticCampaign`, `Gift`. |
| PUT | `/campaigns/automatic/:companyId/:id/toggle-active` | Ativar/Desativar uma campanha automática | **Tables**: `AutomaticCampaign`. |
| DELETE | `/campaigns/automatic/:companyId/:id` | Remover uma campanha automática | **Tables**: `AutomaticCampaign` (Soft Delete). |
| GET | `/campaigns/automatic/:companyId/:id/metrics` | Buscar métricas de uma campanha automática | **Tables**: `AutomaticCampaign` (Metrics aggregation). |
| GET | `/campaigns/automatic/:companyId/:id/messages` | Buscar mensagens de uma campanha automática | **Tables**: `AutomaticCampaign`, `Message`. |

## Campaigns (`companies/:companyId/campaigns`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| POST | `/companies/:companyId/campaigns` | Criar uma nova campanha | **Tables**: `Campaign`. |
| GET | `/companies/:companyId/campaigns` | Listar todas as campanhas | **Tables**: `Campaign`. |
| GET | `/companies/:companyId/campaigns/:id` | Buscar uma campanha por ID | **Tables**: `Campaign`. |
| PATCH | `/companies/:companyId/campaigns/:id/status` | Atualizar status de uma campanha | **Tables**: `Campaign`. |
| PATCH | `/companies/:companyId/campaigns/:id` | Atualizar uma campanha | **Tables**: `Campaign`. |
| DELETE | `/companies/:companyId/campaigns/:id` | Remover uma campanha | **Tables**: `Campaign`. |

## Companies (`companies`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| POST | `/companies` | Criar uma nova empresa | **Tables**: `Company`, `Address`. |
| GET | `/companies` | Listar todas as empresas | **Tables**: `Company`. |
| GET | `/companies/:id` | Buscar uma empresa por ID | **Tables**: `Company`. |
| PATCH | `/companies/:id` | Atualizar uma empresa | **Tables**: `Company`, `Address`. |
| PATCH | `/companies/:id/state/:state` | Status de uma empresa | **Tables**: `Company`. |
| PATCH | `/companies/:id/avatar` | Atualiza o avatar da empresa autenticada | **Tables**: `Company`. |
| POST | `/companies/:companyId/order-history` | Importar histórico de pedidos | **Tables**: `DigitalMenuIntegration`. <br> **External**: `CardapioWeb` (API). <br> **Queue**: `order-history-import` (BullMQ). |
| GET | `/companies/:id/subscription` | Buscar uma assinatura por ID da empresa | **Tables**: `CompanySubscription`. <br> **External**: `Asaas` (Get Subscription). |
| GET | `/companies/:id/subscription/payments` | Buscar os pagamentos de uma assinatura | **Tables**: `CompanySubscription`. <br> **External**: `Asaas` (Get Payments). |
| GET | `/companies/:id/subscription/payments/:paymentId` | Buscar os métodos de pagamento de um pagamento | **External**: `Asaas` (Get Barcode/PixQrCode). |
| PUT | `/companies/:id/subscription/credit-card` | Adicionar um cartão de crédito à assinatura | **Tables**: `CompanySubscription`. <br> **External**: `Asaas` (Update Subscription Billing Info). |
| GET | `/companies/:id/opening-hours` | Buscar os horários de funcionamento de uma empresa | **Tables**: `OpeningHours`. |
| POST | `/companies/:id/opening-hours` | Criar um horário de funcionamento de uma empresa | **Tables**: `OpeningHours`. |
| PUT | `/companies/:id/opening-hours` | Atualizar um horário de funcionamento de uma empresa | **Tables**: `OpeningHours`. |
| GET | `/companies/:id/users` | Listar todos os usuários de uma empresa | **Tables**: `Users`, `UserCompanies`. |

## Courses (`courses`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| POST | `/courses` | Criar Curso | **Tables**: `Course`. |
| GET | `/courses` | Listar Cursos | **Tables**: `Course`. |
| GET | `/courses/educational-carrousel` | Listar Carrousels | **Tables**: `EducationalCarrousel`. |
| GET | `/courses/educational-week-events` | Listar Eventos da Semana | **Tables**: `EducationalWeekEvent`. |
| GET | `/courses/educational-week-events/current-week` | Eventos da Semana Atual | **Tables**: `EducationalWeekEvent`. |
| POST | `/courses/educational-carrousel` | Criar Carrousel | **Tables**: `EducationalCarrousel`. |
| PUT | `/courses/educational-carrousel/:id` | Editar Carrousel | **Tables**: `EducationalCarrousel`. |
| DELETE | `/courses/educational-carrousel/:id` | Deletar Carrousel | **Tables**: `EducationalCarrousel`. |
| GET | `/courses/:id` | Buscar Curso | **Tables**: `Course`, `Module` (Relations). |
| POST | `/courses/:courseId/modules` | Criar Módulo | **Tables**: `Course`, `Module`, `Lesson`. |
| POST | `/courses/educational-week-events` | Criar Evento | **Tables**: `EducationalWeekEvent`. |
| PUT | `/courses/educational-week-events/:id` | Editar Evento | **Tables**: `EducationalWeekEvent`. |
| DELETE | `/courses/educational-week-events/:id` | Deletar Evento | **Tables**: `EducationalWeekEvent`. |

## Customers (`companies/:companyId/customers`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| POST | `/companies/:companyId/customers` | Criar um novo cliente | **Tables**: `Customer`, `Address`. |
| GET | `/companies/:companyId/customers` | Listar todos os clientes | **Tables**: `Customer`. |
| GET | `/companies/:companyId/customers/summary` | Obter resumo de segmentação | **Tables**: `Customer` (Aggregation by RFV). |
| GET | `/companies/:companyId/customers/:id` | Buscar um cliente por ID | **Tables**: `Customer`. |
| PATCH | `/companies/:companyId/customers/:id` | Atualizar um cliente | **Tables**: `Customer`, `Address`. |
| DELETE | `/companies/:companyId/customers/:id` | Remover um cliente | **Tables**: `Customer`, `Address`. |
| GET | `/companies/:companyId/customers/phone/:phone` | Buscar um cliente por telefone | **Tables**: `Customer`. |
| POST | `/companies/:companyId/customers/import` | Importar clientes em massa | **Queue**: `customers-import` (BullMQ). <br> **Behavior**: Offloads import task to background job. |

## Dashboard (`dashboard`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| GET | `/dashboard/customers-summary/:companyId` | Obter resumo de clientes | **Tables**: `Customer`. <br> **Behavior**: Aggregates customers by RFV status (Active, Inactive, New). |
| GET | `/dashboard/campaigns-summary/:companyId` | Obter resumo de campanhas | **Tables**: `Campaign` (or Message metrics). <br> **Behavior**: Aggregates message sends, clicks, sales. |

## Webhooks (`webhooks`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| POST | `/webhooks/cw/:companyId` | Recebe Eventos do Cardapio Web | **Tables**: `WebhookReceived`, `Customer`, `Address`, `Order`. <br> **External**: `CardapioWeb` (Get Order Details). <br> **Behavior**: Syncs Orders and Customers from Cardapio Web events. |

## Link Page (`link-page`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| GET | `/link-page/:slug` | Obter dados da Página de Links | **Tables**: `Company`, `LinkPage`, `Link`, `Gallery`. |
| PUT | `/link-page/:slug` | Atualizar dados da Página de Links | **Tables**: `LinkPage`, `Link`, `Gallery`. |
| DELETE | `/link-page/link/:id` | Deletar link | **Tables**: `Link`. |
| DELETE | `/link-page/gallery/:id` | Deletar imagem da galeria | **Tables**: `Gallery`. |

## Metrics (`metrics`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| POST | `/metrics/interaction/:token` | Registra um evento de interação | **Tables**: `Message` (or Metric logs). <br> **Behavior**: Decodes token and records click. |

## Onboarding (`onboarding`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| POST | `/onboarding` | Criar empresa e usuário administrador | **Tables**: `User`, `Company`, `LinkPage`, `CompanySubscription`. <br> **External**: `Asaas` (Create Customer, Create Subscription). |
| POST | `/onboarding/digital-menu-integration/:companyId` | Criar integração com o digital menu | **Tables**: `DigitalMenuIntegration`. |
| GET | `/onboarding/digital-menu-integration/:companyId` | Obter integração com o digital menu | **Tables**: `DigitalMenuIntegration`. |
| POST | `/onboarding/partner` | Criar parceiro | **Tables**: `Partner`. |
| GET | `/onboarding/partner/:companyId` | Obter parceiros | **Tables**: `Partner`. |
| GET | `/onboarding/business-partner/:id` | Obter business partner | **Tables**: `BusinessPartner`. |
| GET | `/onboarding/plans` | Obter planos | **Tables**: `Plan`. |

## Orders (`orders`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| GET | `/orders` | Listar todos os pedidos de uma empresa | **Tables**: `Order`. |
| GET | `/orders/customer/:customerId` | Buscar um pedido por ID do cliente | **Tables**: `Order`. |

## Users (`users`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| POST | `/users` | Criar um novo usuário | **Tables**: `User`. <br> **Behavior**: Hashes password before saving. |
| GET | `/users` | Listar todos os usuários | **Tables**: `User`. |
| GET | `/users/me` | Buscar dados do usuário autenticado | **Tables**: `User`. |
| PATCH | `/users/:id` | Atualizar um usuário | **Tables**: `User` (Re-hashes password if changed). |
| DELETE | `/users/:id` | Remover um usuário | **Tables**: `User`. |

## Whatsapp Webhook (`whatsapp/webhook`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| POST | `/whatsapp/webhook` | Endpoint para receber eventos do WhatsApp | **Events**: Emits `whatsapp.message.received`, `connection.update`. <br> **Behavior**: Processes incoming messages/status from Evolution API. |

## Whatsapp (`whatsapp`)
| Method | Endpoint | Summary | Details (Tables & Services) |
|---|---|---|---|
| POST | `/whatsapp/companies/:companyId/instances` | Criar uma nova instância do WhatsApp | **Tables**: `WhatsappInstance`. <br> **External**: `Evolution API` (Create & Connect Instance). |
| GET | `/whatsapp/companies/:companyId/instances/connection` | Obter QR Code e informações de conexão | **Tables**: `WhatsappInstance`. <br> **External**: `Evolution API` (Connect Instance). |
| GET | `/whatsapp/companies/:companyId/instances/status` | Obter status atual da instância | **Tables**: `WhatsappInstance`. <br> **External**: `Evolution API` (Get Connection State). |
| DELETE | `/whatsapp/companies/:companyId/instances` | Excluir a instância do WhatsApp | **Tables**: `WhatsappInstance`. <br> **External**: `Evolution API` (Delete Instance). |

---
**Navigation:** [← Architecture](./02-ARCHITECTURE.md) | [Home](./README.md)
