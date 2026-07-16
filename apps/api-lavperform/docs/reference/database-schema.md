[← Documentation Home](../README.md)

# Database Schema

Complete Prisma schema documentation for the FoodCRM API database. (Prisma Schema Overview)

Snapshot of the Prisma models, key fields, and relationships to guide seeding and integrity checks. Optional/auxiliary models are listed but may remain empty if not needed.

## Core Identity and Access
- **User**: `id, email (unique), name, phone, password, createdAt, updatedAt`; relations: `userCompanies [UserCompany], accessRules [AccessRule]`.
- **Company**: `id, name, cnpj (unique), email, phone?, avatarUrl?, slug? (unique), state (CompanyStatus), addressId?, businessPartnerId?, createdAt/updatedAt`; relations: `address (Address?), businessPartner (BusinessPartner?), userCompanies [UserCompany], accessRules [AccessRule], customers [Customer], campaigns [Campaign], whatsappInstances [WhatsappInstance], digitalMenuIntegration [DigitalMenuIntegration], orders [Order], automaticCampaigns [AutomaticCampaign], companySubscriptions [CompanySubscription], openingHours [OpeningHours], linkPages [LinkPage]`; index `(businessPartnerId)`.
- **UserCompany**: link User↔Company; fields `userId, companyId`; unique `(userId, companyId)`.
- **AccessRule**: per-user/company permission; fields `userId, companyId, module, action`; unique `(userId, companyId, module, action)`.
- **BusinessPartner**: optional partner tied to Company; fields `id, name, email, phone, cnpj?, avatarUrl?, createdAt/updatedAt`; relation `companies [Company]`.
- **Address**: reusable address; fields `id, street?, number?, complement?, neighborhood?, city?, state?, zipCode?, createdAt/updatedAt`; relations: optional `company`, optional `customer`.

## Subscriptions & Plans
- **Plan**: `id, name, description, price, cycle (CycleType), recommended, maxPayments, endDate?, active, createdAt/updatedAt`; relation `companySubscriptions [CompanySubscription]`.
- **CompanySubscription**: links Company↔Plan; fields `companyId, planId, subscriptionId, createdAt/updatedAt`; relation `company (Company), plan (Plan)`; unique `(companyId, planId)`; indexes `(companyId), (planId)`.
- **OpeningHours**: per-company schedule; fields `companyId, dayOfWeek, openTime, closeTime, isOpen, createdAt/updatedAt`; unique `(companyId, dayOfWeek)`.

## Digital Menu Integrations
- **DigitalMenuIntegration**: `companyId, partnerId?, apiKey?, apiSecret?, partnerId?, active, merchantId?, digitalMenuUrl?, createdAt/updatedAt`; relations: `company (Company), partner (Partner?)`; index `(companyId, partnerId)`.
- **Partner**: `id, name, logoUrl?, baseUrlWebhook?, createdAt`; relation `digitalMenuIntegrations [DigitalMenuIntegration]`.

## Customers and Orders
- **Customer**: `id, name, phone, email?, birthDate?, firstOrderDate?, lastOrderDate?, bestOrderDay?, bestOrderHour?, lastContactDate?, rfvClassification (default "novo"), gender?, observations?, whatsappOptin (default true), averageTicket?, companyId, addressId?, createdAt/updatedAt`; relations: `company (Company), address (Address?), orders [Order]`; unique `(phone, companyId)`; indexes `(companyId), (phone), (email)`.
- **Order**: `id, integratorOrderId?, displayId, merchantId, status, orderType, orderTiming, salesChannel, customerOrigin?, tableNumber?, estimatedTime?, cancellationReason?, fiscalDocument?, observation?, monetary fields (deliveryFee, serviceFee, additionalFee, total as Decimal), createdAt/updatedAt, companyId, customerId`; relations: `company (Company), customer (Customer), deliveryAddress (OrderDeliveryAddress?), schedule (OrderSchedule?), items [OrderItem], discounts [OrderDiscount], payments [OrderPayment], messageOrder [MessageOrder]`; indexes `(merchantId, displayId), (companyId, createdAt), (companyId, integratorOrderId), (customerId)`.
- **OrderDeliveryAddress**: `orderId (unique), street?, number?, complement?, neighborhood?, city?, state?, zipCode?, reference?`; relation `order (Order)`.
- **OrderSchedule**: `orderId (unique), deliveryDateRaw, deliveryTimeRaw, deliveryAt?`; relation `order (Order)`.
- **OrderItem**: `orderId, itemId, name, quantity, unitPrice, totalPrice, kind, status, externalCode?, observation?, parentItemId?`; self-relation `parentItem`/`items`; relations: `order (Order), options [OrderOption]`; indexes `(orderId), (itemId)`.
- **OrderOption**: `orderItemId, optionId, name, quantity, unitPrice, optionGroupId, optionGroupName, externalCode?`; relation `orderItem (OrderItem)`; indexes `(orderItemId), (optionId), (optionGroupId)`.
- **OrderDiscount**: `orderId, type, value, description?`; relation `order (Order)`.
- **OrderPayment**: `orderId, total, paymentType, paymentMethod, status, paymentFee, changeFor?, cardNumber?, cardBrand?, observation?`; relation `order (Order)`.

## Campaigns, Messaging, Automations
- **Campaign**: `id, name, scheduledDate, messageText, segmentation, imageUrl?, status (CampaignStatus), modifiedByAI (bool), companyId, trakingCode?, createdAt/updatedAt`; relations: `company (Company), messages [Message], campaignMetric [CampaignMetric]`; index `(companyId)`.
- **AutomaticCampaign**: `id, name, type (AutomaticCampaignType), companyId, segmentation, active, images?, daysOfWeek (string[]), startDate, endDate, messageText, gifts [Gift], messages [Message], campaignMetric [CampaignMetric], createdAt/updatedAt, deletedAt?, lastProcessedAt?`; index `(companyId)`.
- **Gift**: `type, unit, value (Decimal), automaticCampaignId`; relation `automaticCampaign (AutomaticCampaign)`.
- **CampaignMetric**: counts per campaign/auto-campaign; fields `campaignId?, automaticCampaignId?, messagesSent, messagesDelivered, interactions, messagesError, conversionRate (Decimal), salesTotalAmount (Decimal), salesTotalQuantity, totalCustomers, createdAt/updatedAt`; indexes `(campaignId), (automaticCampaignId)`.
- **Message**: outbound message; `segmentation, token?, error?, status (MessageStatus), messageText, mediaUrl?, customerName, phone, customerId, companyId, automaticCampaignId?, campaignId?, scheduledDate?, attempts, createdAt/updatedAt`; relations: `messageInteractions [MessageInteraction], MessageOrders [MessageOrder], automaticCampaign?, campaign?`; indexes `(customerId), (companyId), (campaignId), (status)`.
- **MessageInteraction**: `messageId, createdAt/updatedAt`; relation `message (Message)`.
- **MessageOrder**: link Message↔Order; fields `messageId, orderId, createdAt/updatedAt`; relations: `message (Message), order (Order)`; indexes `(messageId), (orderId)`.
- **MessageStatus enum**: PENDING, SENT, PROCESSING, ERROR, ABORTED.
- **CampaignStatus enum**: WAITING, PROCESSING, COMPLETED, FAILED.
- **AutomaticCampaignType enum**: ACQUISITION, RECURRENCE, REACTIVATION.
- **cron_automatic_campaign**: tracking table for cron runs; fields `campaignsFound, createdAt/updatedAt`.

## WhatsApp
- **WhatsappInstance**: `id, name, status (WhatsappInstanceStatus), token, phoneNumber, companyId (unique), createdAt/updatedAt`; relation `company (Company)`; index `(phoneNumber)`.
- **WhatsappInstanceStatus enum**: CONNECTED, DISCONNECTED, PENDING, ERROR.

## Webhooks & Logs
- **WebhookReceived**: raw inbound webhook storage; `companyId, partnerId, data, createdAt/updatedAt`; indexes `(companyId, createdAt), (partnerId, createdAt)`.

## Auth Flows
- **ConfirmationCode**: `code, userId, used, createdAt/updatedAt`; unique `(code)`.

## Link Pages
- **LinkPage**: `companyId, biography?, whatsappMessage?, coverImage?, bgColor?, createdAt/updatedAt`; relations: `company (Company), links [Link], galleries [Gallery]`; index `(companyId)`.
- **Link**: `label, url, icon (default "default"), iconType (default "icon"), linkPageId, createdAt/updatedAt`; relation `linkPage (LinkPage)`; index `(linkPageId)`.
- **Gallery**: `title, description, images (string[]), linkPageId, createdAt/updatedAt`; relation `linkPage (LinkPage)`.

## Courses
- **Course**: `title, description?, coverImageUrl?, createdAt/updatedAt`; relation `modules [Module]`.
- **Module**: `courseId, title, description?, order, createdAt/updatedAt`; relation `course (Course), lessons [Lesson]`.
- **Lesson**: `moduleId, title, description?, videoUrl?, thumbnailUrl?, createdAt/updatedAt`; relation `module (Module), lessonFiles [LessonFiles]`.
- **LessonFiles**: `lessonId, name, fileUrl, createdAt/updatedAt`; relation `lesson (Lesson)`.

## Education Content (Landing/Marketing)
- **EducationalCarrousel**: `title, description, thumbnailUrl, videoUrl?, ctaLabel?, ctaUrl?, order, isStream, createdAt/updatedAt`.
- **EducationalWeekEvents**: `title, description, coverImage?, ctaLabel?, ctaUrl?, eventDate, isStream, createdAt/updatedAt`.

## Other Entities
- **Gallery, LinkPage, Link** (see Link Pages).
- **WebhookReceived** (raw webhook log).

## Enums Summary
- `CompanyStatus`: ACTIVE, INACTIVE, PENDING
- `CycleType`: MONTHLY, YEARLY, SEMIANNUALLY, QUARTERLY
- `CampaignStatus`: WAITING, PROCESSING, COMPLETED, FAILED
- `AutomaticCampaignType`: ACQUISITION, RECURRENCE, REACTIVATION
- `MessageStatus`: PENDING, SENT, PROCESSING, ERROR, ABORTED
- `WhatsappInstanceStatus`: CONNECTED, DISCONNECTED, PENDING, ERROR

## Seeding Considerations (FK integrity)
- Base anchors: create `Company`, `User`, `UserCompany`, `AccessRule`.
- Dependent anchors: `Customer` (requires Company), `Order` (requires Company, Customer), `Campaign` (requires Company), `AutomaticCampaign` (requires Company), `WhatsappInstance` (requires Company).
- Child records: `OrderItem/Option/Discount/Payment/DeliveryAddress/Schedule`, `Message/MessageInteraction/MessageOrder`, `CampaignMetric`, `Gift`.
- Optional/auxiliary models (can be empty if not needed): `WebhookReceived`, `cron_automatic_campaign`, `DigitalMenuIntegration/Partner`, `LinkPage/Link/Gallery`, `Course/Module/Lesson/LessonFiles`, `BusinessPartner`, `Plan/CompanySubscription/OpeningHours`.


## Workload-Based Perf Hints (from current code)
- Orders list/count (`OrderService.findByCompanyId/findByCustomerId`): filters by `companyId`, optional `customerId/status/createdAt range`, orders by `createdAt desc`. Indexes: `(companyId, createdAt desc)`; add `(companyId, status, createdAt)` if status is common; keep `(customerId)`. Consider selecting fewer nested fields on list responses to reduce payload size.
- Customers list (`CustomersService.findAll`): filters `companyId`, optional `id/createdAt range/name contains`, sorts by `createdAt` by default. Index `(companyId, createdAt)` for pagination; add trigram on `name` only if substring search is hot and Postgres has `pg_trgm`.
- Message scheduler (`MessageTasks.handleScheduledMessages`): scans PENDING messages in a narrow `scheduledDate` window. Index `(status, scheduledDate)` or partial `@@index([scheduledDate] where status='PENDING')`; ensure `automaticCampaignId` and `customerId` are indexed for follow-up lookups.
- Campaign metrics dashboards: likely query by either `campaignId` or `automaticCampaignId` alone keep separate indexes (see Schema Health Notes).
- Multi-tenant pattern: almost every query pins `companyId`; ensure all high-volume tables (orders, customers, messages, metrics, webhooks) have leading `companyId` in their main indexes to avoid seq scans on tenant filters.

---
**Navigation:** [← Home](../README.md) | [Architecture →](../02-ARCHITECTURE.md)
