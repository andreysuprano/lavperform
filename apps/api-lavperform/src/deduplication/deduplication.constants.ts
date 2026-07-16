export const DEDUPLICATION_JOB_NAMES = {
  SCAN_CUSTOMER_ORDERS: 'scan-customer-orders',
  DELETE_ORDER_GROUP: 'delete-order-group',
  SCAN_CAMPAIGN_ATTRIBUTIONS: 'scan-campaign-attributions',
  REMOVE_DUPLICATE_ATTRIBUTIONS: 'remove-duplicate-attributions',
} as const;

export type DeduplicationJobName =
  (typeof DEDUPLICATION_JOB_NAMES)[keyof typeof DEDUPLICATION_JOB_NAMES];

export interface ScanCustomerOrdersPayload {
  companyId: string;
  customerId: string;
}

export interface DeleteOrderGroupPayload {
  companyId: string;
  customerId: string;
  displayId: number;
  integratorOrderId: number | null;
  keepOrderId: string;
  orderIdsToDelete: string[];
}

export interface ScanCampaignAttributionsPayload {
  automaticCampaignId: string;
  customerId?: string;
}

export interface RemoveDuplicateAttributionsPayload {
  automaticCampaignId: string;
  orderId: string;
  keepMessageOrderId: string;
  messageOrderIdsToDelete: string[];
}
