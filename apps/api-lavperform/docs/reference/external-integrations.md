[← Documentation Home](../README.md)

# External Integrations

Comprehensive catalog of all external services and integrations used by FoodCRM API.

This document outlines the external services and systems required for the **FoodCRM API** to operate. It focuses on domain-level integrations and details specific resources and endpoints used.

## 1. Data Storage & Infrastructure

| Service | Type | Resources Used |
| :--- | :--- | :--- |
| **PostgreSQL** | Database | **Core Entities:** `Company`, `User`, `Customer`, `Order`, `Campaign`, `Message`, `Subscription`, `WhatsappInstance`, `AutomaticCampaign` |
| **Redis** | Key-Value Store | **Queues (Bull):** <br> • `CAMPAIGNS_ENGINE` <br> • `AUTOMATIC_CAMPAIGNS_ENGINE` <br> • `MESSAGE_ENGINE` <br> • `CUSTOMERS_IMPORT` <br> • `ORDER_HISTORY_IMPORT` |

## 2. Communication Services

| Service | Type | Resources & Endpoints Used |
| :--- | :--- | :--- |
| **SMTP Server** | Email Provider | **Protocol:** Standard SMTP (via `nodemailer`) <br> **Usage:** Transactional emails, Campaign emails. |
| **Evolution API** | Messaging Platform | **Base URL:** Defined via `EVOLUTION_API_URL` <br> **Endpoints:** <br> • `POST /instance/create` (Create Instance) <br> • `GET /instance/connect/{instance}` (Connect QR) <br> • `GET /instance/connectionState/{instance}` (Check Status) <br> • `DELETE /instance/delete/{instance}` (Remove Instance) <br> • `POST /message/sendMedia/{instance}` (Send Message) <br> • `POST /chat/sendPresence/{instance}` (Typing Status) |

## 3. Financial Services

| Service | Type | Resources & Endpoints Used |
| :--- | :--- | :--- |
| **Asaas API** | Payment Gateway | **Base URL:** Defined via `ASAAS_BASE_URL` <br> **Endpoints:** <br> • `GET /v3/subscriptions/{id}` <br> • `GET /v3/subscriptions/{id}/payments` <br> • `POST /v3/subscriptions` <br> • `PUT /v3/subscriptions/{id}` <br> • `DELETE /v3/subscriptions/{id}` <br> • `PUT /v3/subscriptions/{id}/creditCard` <br> • `POST /v3/customers` <br> • `POST /v3/payments` <br> • `PUT /v3/payments/{id}` <br> • `DELETE /v3/payments/{id}` <br> • `POST /v3/payments/{id}/receiveInCash` <br> • `POST /v3/payments/{id}/refund` <br> • `GET /v3/payments/{id}/identificationField` (Boleto) <br> • `GET /v3/payments/{id}/pixQrCode` (Pix) |

## 4. AI & Intelligence

| Service | Type | Resources & Endpoints Used |
| :--- | :--- | :--- |
| **OpenAI API** | AI Service | **Base URL:** Defined via `OPENAI_URL` <br> **Endpoints:** <br> • `POST /webhook/generate-message` (Content Generation) |

## 5. Domain Integrations

| Service | Type | Resources & Endpoints Used |
| :--- | :--- | :--- |
| **Cardapio Web** | Menu System | **Base URL:** Defined via `CARDAPIO_WEB_URL` <br> **Endpoints:** <br> • `GET /api/partner/v1/orders/{id}` (Order Details) <br> • `GET /api/partner/v1/orders/history` (Import History) |

## 6. Observability & Monitoring

| Service | Type | Resources Used |
| :--- | :--- | :--- |
| **Sentry** | Error Tracking | **SDK:** `@sentry/nestjs` <br> **Usage:** Exception capturing, Performance tracing. |

## 7. Operational Dashboards

| Service | Type | Resources Used |
| :--- | :--- | :--- |
| **Bull Board** | Job Queue UI | **Adapter:** `@bull-board/express` <br> **Usage:** Visual management of Redis queues. |
| **Swagger UI** | API Documentation | **Path:** `/api/docs` (typical default) <br> **Usage:** Interactive endpoint testing. |

---

## See Also

- [API Reference](../03-API-REFERENCE.md) - Endpoints using these integrations
- [Technical Backlog](../planning/technical-backlog.md) - Integration improvements

---
**Navigation:** [← Home](../README.md) | [API Reference →](../03-API-REFERENCE.md)
