import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set; please configure it in your .env before seeding.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Anchors
  const businessPartner = await prisma.businessPartner.upsert({
    where: { id: 'bp-demo' },
    update: {},
    create: {
      id: 'bp-demo',
      name: 'Business Partner Demo',
      email: 'partner@demo.test',
      phone: '+5511980000000',
      cnpj: '12345678000100',
      avatarUrl: 'https://example.com/logo.png',
    },
  });

  const plan = await prisma.plan.upsert({
    where: { id: 'plan-demo' },
    update: {},
    create: {
      id: 'plan-demo',
      name: 'Demo Plan',
      description: 'Demo subscription plan',
      price: 0,
      cycle: 'MONTHLY',
      recommended: true,
      maxPayments: 1,
    },
  });

  const address = await prisma.address.upsert({
    where: { id: 'addr-company' },
    update: {},
    create: {
      id: 'addr-company',
      street: 'Rua Demo',
      number: '123',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01000-000',
      neighborhood: 'Centro',
    },
  });

  const company = await prisma.company.upsert({
    where: { cnpj: '00000000000191' },
    update: {},
    create: {
      id: 'company-demo',
      name: 'FoodCRM Demo',
      cnpj: '00000000000191',
      email: 'contato@foodcrm.test',
      phone: '+5511999999999',
      avatarUrl: 'https://example.com/company.png',
      addressId: address.id,
      slug: 'foodcrm-demo',
      state: 'ACTIVE',
      businessPartnerId: businessPartner.id,
    },
  });

  const partner = await prisma.partner.upsert({
    where: { id: 'partner-demo' },
    update: {},
    create: {
      id: 'partner-demo',
      name: 'Digital Menu Partner',
      logoUrl: 'https://example.com/partner.png',
      baseUrlWebhook: 'https://example.com/webhook',
      partnerSlug: 'demo-partner',
    },
  });

  const vmlavPartner = await prisma.partner.upsert({
    where: { id: 'partner-vmlav' },
    update: { partnerSlug: 'VMLAV' },
    create: {
      id: 'partner-vmlav',
      name: 'VM Lav',
      logoUrl: 'https://example.com/vmlav-logo.png',
      baseUrlWebhook: 'https://vmlav.com/webhook',
      partnerSlug: 'VMLAV',
    },
  });

  const ciccloPartner = await prisma.partner.upsert({
    where: { id: 'partner-cicclo' },
    update: {},
    create: {
      id: 'partner-cicclo',
      name: 'Cicclo',
      logoUrl: 'https://example.com/cicclo-logo.png',
      baseUrlWebhook: null,
      partnerSlug: 'CICCLO',
    },
  });

  const l2automatePartner = await prisma.partner.upsert({
    where: { id: 'partner-l2automate' },
    update: {},
    create: {
      id: 'partner-l2automate',
      name: 'L2 Automate (Bolha de Sabão)',
      logoUrl: null,
      baseUrlWebhook: null,
      partnerSlug: 'L2AUTOMATE',
    },
  });

  const consumerPartner = await prisma.partner.upsert({
    where: { id: 'partner-consumer' },
    update: {},
    create: {
      id: 'partner-consumer',
      name: 'Consumer',
      logoUrl: null,
      baseUrlWebhook: null,
      partnerSlug: 'CONSUMER',
    },
  });

  const maxlavPartner = await prisma.partner.upsert({
    where: { id: 'partner-maxlav' },
    update: { partnerSlug: 'MAXLAV' },
    create: {
      id: 'partner-maxlav',
      name: 'Maxlav',
      logoUrl: null,
      baseUrlWebhook: null,
      partnerSlug: 'MAXLAV',
    },
  });

  const digitalMenuIntegration = await prisma.digitalMenuIntegration.upsert({
    where: { id: 'dmi-demo' },
    update: {},
    create: {
      id: 'dmi-demo',
      companyId: company.id,
      partnerId: partner.id,
      apiKey: 'demo-api-key',
      apiSecret: 'demo-api-secret',
      active: true,
      merchantId: 'merchant-001',
      digitalMenuUrl: 'https://menu.demo.test',
    },
  });

  console.log('Seeding user demo@foodcrm.test with password: foodcrm123');
  const passwordHash = await bcrypt.hash('foodcrm123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@foodcrm.test' },
    update: {
      password: passwordHash,
    },
    create: {
      id: 'user-demo',
      email: 'demo@foodcrm.test',
      name: 'Demo User',
      phone: '+5511988887777',
      password: passwordHash,
    },
  });

  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: company.id,
      },
    },
    update: {},
    create: {
      id: 'user-company-demo',
      userId: user.id,
      companyId: company.id,
    },
  });

  const modules = ['customers', 'orders', 'campaigns', 'automatic-campaign', 'integrations', 'dashboard', 'metrics', 'users', 'companies'];
  await Promise.all(
    modules.map((module) =>
      prisma.accessRule.upsert({
        where: {
          userId_companyId_module_action: {
            userId: user.id,
            companyId: company.id,
            module,
            action: 'manage',
          },
        },
        update: {},
        create: {
          id: `access-${module}`,
          userId: user.id,
          companyId: company.id,
          module,
          action: 'manage',
        },
      }),
    ),
  );

  await prisma.companySubscription.upsert({
    where: { id: 'company-sub-demo' },
    update: {},
    create: {
      id: 'company-sub-demo',
      companyId: company.id,
      planId: plan.id,
      subscriptionId: 'sub-0001',
    },
  });

  await prisma.openingHours.upsert({
    where: { companyId_dayOfWeek: { companyId: company.id, dayOfWeek: 'mon' } },
    update: {},
    create: {
      id: 'opening-mon',
      companyId: company.id,
      dayOfWeek: 'mon',
      openTime: '09:00',
      closeTime: '18:00',
      isOpen: true,
    },
  });

  const customerAddress = await prisma.address.upsert({
    where: { id: 'addr-customer' },
    update: {},
    create: {
      id: 'addr-customer',
      street: 'Rua Cliente',
      number: '456',
      city: 'Sao Paulo',
      state: 'SP',
      neighborhood: 'Centro',
      zipCode: '01000-111',
    },
  });

  const customer = await prisma.customer.upsert({
    where: { id: 'company-demo' },
    update: {},
    create: {
      id: 'company-demo',
      name: 'Cliente Demo',
      phone: '+5511977776666',
      email: 'cliente@demo.test',
      birthDate: new Date('1990-01-01'),
      companyId: company.id,
      addressId: customerAddress.id,
      rfvClassification: 'novo',
      whatsappOptin: true,
      averageTicket: 50,
      firstOrderDate: new Date(),
      lastOrderDate: new Date(),
    },
  });

  const whatsappInstance = await prisma.whatsappInstance.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      id: 'whatsapp-demo',
      name: 'WhatsApp Demo',
      status: 'CONNECTED',
      token: 'wa-token-demo',
      phoneNumber: '+5511999990000',
      companyId: company.id,
    },
  });

  // Cleanup Automatic Campaigns and their dependencies
  const autoCampaigns = await prisma.automaticCampaign.findMany({ where: { companyId: company.id } });
  const autoCampaignIds = autoCampaigns.map((ac) => ac.id);

  if (autoCampaignIds.length > 0) {
    await prisma.gift.deleteMany({ where: { automaticCampaignId: { in: autoCampaignIds } } });
    await prisma.message.deleteMany({ where: { automaticCampaignId: { in: autoCampaignIds } } });
    await prisma.automaticCampaign.deleteMany({ where: { id: { in: autoCampaignIds } } });
  }

  // Cleanup Campaigns and their dependencies
  const campaigns = await prisma.campaign.findMany({ where: { companyId: company.id } });
  const campaignIds = campaigns.map((c) => c.id);

  if (campaignIds.length > 0) {
    await prisma.message.deleteMany({ where: { campaignId: { in: campaignIds } } });
    await prisma.campaignMetric.deleteMany({ where: { campaignId: { in: campaignIds } } });
    await prisma.campaign.deleteMany({ where: { id: { in: campaignIds } } });
  }

  const campaign = await prisma.campaign.upsert({
    where: { id: 'company-demo' },
    update: {},
    create: {
      id: 'company-demo',
      name: 'Campanha Demo',
      scheduledDate: new Date(Date.now() + 3600 * 1000),
      messageText: 'Mensagem de campanha demo',
      segmentation: 'all_customers',
      status: 'WAITING',
      companyId: company.id,
      modifiedByAI: false,
      trakingCode: 'track-001',
    },
  });

  const automaticCampaign = await prisma.automaticCampaign.upsert({
    where: { id: 'company-demo' },
    update: {},
    create: {
      id: 'company-demo',
      name: 'Automática Demo',
      type: 'RECURRENCE',
      companyId: company.id,
      segmentation: 'recorrencia_30_dias',
      active: true,
      images: 'https://example.com/auto.png',
      daysOfWeek: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'],
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      messageText: 'Volte a pedir conosco!',
      lastProcessedAt: new Date(),
    },
  });

  const gift = await prisma.gift.upsert({
    where: { id: 'gift-demo' },
    update: {},
    create: {
      id: 'gift-demo',
      type: 'DESCONTO',
      unit: 'PERCENT',
      value: new Prisma.Decimal('10.00'),
      automaticCampaignId: automaticCampaign.id,
    },
  });

  const order = await prisma.order.upsert({
    where: { id: 'order-demo' },
    update: {},
    create: {
      id: 'order-demo',
      integratorOrderId: 1001,
      displayId: 1,
      merchantId: 1,
      status: 'placed',
      orderType: 'delivery',
      orderTiming: 'immediate',
      salesChannel: 'app',
      customerOrigin: 'direct',
      tableNumber: null,
      estimatedTime: 45,
      cancellationReason: null,
      fiscalDocument: 'NF-e 0001',
      observation: 'Sem cebola',
      deliveryFee: new Prisma.Decimal('5.00'),
      serviceFee: new Prisma.Decimal('0.00'),
      additionalFee: new Prisma.Decimal('0.00'),
      total: new Prisma.Decimal('55.00'),
      createdAt: new Date(),
      updatedAt: new Date(),
      companyId: company.id,
      customerId: customer.id,
    },
  });

  await prisma.orderDeliveryAddress.upsert({
    where: { orderId: order.id },
    update: {},
    create: {
      id: 'order-addr-demo',
      orderId: order.id,
      street: 'Rua Pedido',
      number: '789',
      neighborhood: 'Centro',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01000-222',
      reference: 'Apto 1',
    },
  });

  await prisma.orderSchedule.upsert({
    where: { orderId: order.id },
    update: {},
    create: {
      id: 'order-sched-demo',
      orderId: order.id,
      deliveryDateRaw: '2025-12-31',
      deliveryTimeRaw: '19:00',
      deliveryAt: new Date(),
    },
  });

  const orderItem = await prisma.orderItem.upsert({
    where: { id: 'order-item-demo' },
    update: {},
    create: {
      id: 'order-item-demo',
      orderId: order.id,
      itemId: 1,
      name: 'Pizza Demo',
      quantity: 1,
      unitPrice: new Prisma.Decimal('50.00'),
      totalPrice: new Prisma.Decimal('50.00'),
      kind: 'item',
      status: 'accepted',
      externalCode: 'PZ-001',
      observation: 'Bem assada',
    },
  });

  await prisma.orderOption.upsert({
    where: { id: 'order-opt-demo' },
    update: {},
    create: {
      id: 'order-opt-demo',
      orderItemId: orderItem.id,
      optionId: 101,
      name: 'Borda recheada',
      quantity: 1,
      unitPrice: new Prisma.Decimal('5.00'),
      optionGroupId: 201,
      optionGroupName: 'Adicionais',
      externalCode: 'OPT-101',
    },
  });

  await prisma.orderDiscount.upsert({
    where: { id: 'order-disc-demo' },
    update: {},
    create: {
      id: 'order-disc-demo',
      orderId: order.id,
      type: 'cupom',
      value: new Prisma.Decimal('0.00'),
      description: 'Sem desconto',
    },
  });

  await prisma.orderPayment.upsert({
    where: { id: 'order-pay-demo' },
    update: {},
    create: {
      id: 'order-pay-demo',
      orderId: order.id,
      total: new Prisma.Decimal('55.00'),
      paymentType: 'card',
      paymentMethod: 'credit',
      status: 'paid',
      paymentFee: new Prisma.Decimal('0.00'),
      changeFor: new Prisma.Decimal('0.00'),
      cardBrand: 'VISA',
    },
  });

  await prisma.campaignMetric.upsert({
    where: { id: 'campaign-metric-demo' },
    update: {},
    create: {
      id: 'campaign-metric-demo',
      campaignId: campaign.id,
      messagesSent: 10,
      messagesDelivered: 9,
      interactions: 3,
      messagesError: 1,
      conversionRate: new Prisma.Decimal('10.00'),
      salesTotalAmount: new Prisma.Decimal('100.00'),
      salesTotalQuantity: 5,
      totalCustomers: 10,
    },
  });

  await prisma.campaignMetric.upsert({
    where: { id: 'auto-campaign-metric-demo' },
    update: {},
    create: {
      id: 'auto-campaign-metric-demo',
      automaticCampaignId: automaticCampaign.id,
      messagesSent: 5,
      messagesDelivered: 5,
      interactions: 2,
      messagesError: 0,
      conversionRate: new Prisma.Decimal('20.00'),
      salesTotalAmount: new Prisma.Decimal('50.00'),
      salesTotalQuantity: 2,
      totalCustomers: 5,
    },
  });

  const message = await prisma.message.upsert({
    where: { id: 'message-demo' },
    update: {},
    create: {
      id: 'message-demo',
      attempts: 0,
      segmentation: 'all_customers',
      token: 'msg-token',
      status: 'PENDING',
      messageText: 'Olá, este é um teste!',
      mediaUrl: null,
      customerName: customer.name,
      phone: customer.phone,
      customerId: customer.id,
      companyId: company.id,
      campaignId: campaign.id,
      scheduledDate: new Date(),
    },
  });

  await prisma.messageInteraction.upsert({
    where: { id: 'msg-interaction-demo' },
    update: {},
    create: {
      id: 'msg-interaction-demo',
      messageId: message.id,
    },
  });

  await prisma.messageOrder.upsert({
    where: { id: 'msg-order-demo' },
    update: {},
    create: {
      id: 'msg-order-demo',
      messageId: message.id,
      orderId: order.id,
    },
  });

  await prisma.whatsappInstance.upsert({
    where: { companyId: company.id },
    update: { status: 'CONNECTED' },
    create: {
      id: 'whatsapp-demo',
      name: 'WhatsApp Demo',
      status: 'CONNECTED',
      token: 'wa-token-demo',
      phoneNumber: '+5511999990000',
      companyId: company.id,
    },
  });

  await prisma.webhookReceived.upsert({
    where: { id: 'webhook-received-demo' },
    update: {},
    create: {
      id: 'webhook-received-demo',
      companyId: company.id,
      partnerId: partner.id,
      data: JSON.stringify({ hello: 'webhook' }),
    },
  });

  const linkPage = await prisma.linkPage.upsert({
    where: { id: 'linkpage-demo' },
    update: {},
    create: {
      id: 'linkpage-demo',
      companyId: company.id,
      biography: 'A melhor experiência gastronômica!',
      whatsappMessage: 'Olá, tudo bem?',
      coverImage: 'https://example.com/cover.png',
      bgColor: 'white',
    },
  });

  await prisma.link.upsert({
    where: { id: 'link-demo' },
    update: {},
    create: {
      id: 'link-demo',
      label: 'Site',
      url: 'https://foodcrm.com',
      linkPageId: linkPage.id,
      icon: 'default',
      iconType: 'icon',
    },
  });

  await prisma.gallery.upsert({
    where: { id: 'gallery-demo' },
    update: {},
    create: {
      id: 'gallery-demo',
      title: 'Galeria Demo',
      description: 'Algumas imagens de exemplo',
      images: ['https://example.com/img1.png'],
      linkPageId: linkPage.id,
    },
  });

  const course = await prisma.course.upsert({
    where: { id: 'course-demo' },
    update: {},
    create: {
      id: 'course-demo',
      title: 'Curso Demo',
      description: 'Introdução ao FoodCRM',
      coverImageUrl: 'https://example.com/course.png',
    },
  });

  const module = await prisma.module.upsert({
    where: { id: 'module-demo' },
    update: {},
    create: {
      id: 'module-demo',
      title: 'Módulo 1',
      description: 'Primeiros passos',
      order: 1,
      courseId: course.id,
    },
  });

  const lesson = await prisma.lesson.upsert({
    where: { id: 'lesson-demo' },
    update: {},
    create: {
      id: 'lesson-demo',
      title: 'Lição 1',
      description: 'Introdução',
      videoUrl: 'https://example.com/video.mp4',
      thumbnailUrl: 'https://example.com/thumb.png',
      moduleId: module.id,
    },
  });

  await prisma.lessonFiles.upsert({
    where: { id: 'lesson-file-demo' },
    update: {},
    create: {
      id: 'lesson-file-demo',
      name: 'Material PDF',
      lessonId: lesson.id,
      fileUrl: 'https://example.com/material.pdf',
    },
  });

  await prisma.confirmationCode.upsert({
    where: { id: 'confirm-code-demo' },
    update: {},
    create: {
      id: 'confirm-code-demo',
      code: '12345',
      userId: user.id,
      used: false,
    },
  });

  await prisma.cron_automatic_campaign.upsert({
    where: { id: 'cron-auto-campaign' },
    update: {},
    create: {
      id: 'cron-auto-campaign',
      campaignsFound: 1,
    },
  });

  console.log('Seed completed with demo data across all tables.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
