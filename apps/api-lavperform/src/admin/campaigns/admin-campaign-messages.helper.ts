import { Prisma } from '@prisma/client';

export const adminMessageSelect = {
  id: true,
  phone: true,
  customerName: true,
  status: true,
  channel: true,
  error: true,
  attempts: true,
  messageText: true,
  mediaUrl: true,
  scheduledDate: true,
  createdAt: true,
  updatedAt: true,
  MessageOrders: {
    select: {
      order: {
        select: {
          id: true,
          displayId: true,
          total: true,
          salesChannel: true,
          customerOrigin: true,
        },
      },
    },
  },
} satisfies Prisma.MessageSelect;

type AdminMessageRow = Prisma.MessageGetPayload<{
  select: typeof adminMessageSelect;
}>;

export function mapAdminCampaignMessage(message: AdminMessageRow) {
  const { MessageOrders, ...rest } = message;
  const orders = MessageOrders.map(({ order }) => ({
    id: order.id,
    displayId: order.displayId,
    total: order.total.toString(),
    salesChannel: order.salesChannel,
    customerOrigin: order.customerOrigin,
  }));

  const salesTotalAmount = orders.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );

  const primaryOrder = orders[0];

  return {
    ...rest,
    hasOrder: orders.length > 0,
    orders,
    salesTotalAmount: salesTotalAmount.toFixed(2),
    salesOrigin:
      primaryOrder?.customerOrigin ?? primaryOrder?.salesChannel ?? null,
  };
}
