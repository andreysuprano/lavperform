import { MessageStatus } from '@prisma/client';
import { normalizeStoredPhone } from '../../customers/application/customer-identifier';

export type DailyMessageCleanupCandidate = {
  id: string;
  companyId: string;
  customerId: string;
  phone?: string | null;
  status: MessageStatus;
  createdAt: Date;
};

const ABORTABLE_STATUSES = new Set<MessageStatus>([
  MessageStatus.PENDING,
  MessageStatus.PROCESSING,
]);

class UnionFind {
  private readonly parent: number[];
  private readonly rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index);
    this.rank = Array(size).fill(0);
  }

  find(index: number): number {
    if (this.parent[index] !== index) {
      this.parent[index] = this.find(this.parent[index]);
    }
    return this.parent[index];
  }

  union(left: number, right: number): void {
    const rootLeft = this.find(left);
    const rootRight = this.find(right);
    if (rootLeft === rootRight) {
      return;
    }

    if (this.rank[rootLeft] < this.rank[rootRight]) {
      this.parent[rootLeft] = rootRight;
      return;
    }

    if (this.rank[rootLeft] > this.rank[rootRight]) {
      this.parent[rootRight] = rootLeft;
      return;
    }

    this.parent[rootRight] = rootLeft;
    this.rank[rootLeft] += 1;
  }
}

function compareChronologically(
  left: DailyMessageCleanupCandidate,
  right: DailyMessageCleanupCandidate,
): number {
  const timeDiff = left.createdAt.getTime() - right.createdAt.getTime();
  if (timeDiff !== 0) {
    return timeDiff;
  }
  return left.id.localeCompare(right.id);
}

function isAbortable(status: MessageStatus): boolean {
  return ABORTABLE_STATUSES.has(status);
}

function customerKey(companyId: string, customerId: string): string {
  return `${companyId}:customer:${customerId}`;
}

function phoneKey(companyId: string, phone: string): string {
  return `${companyId}:phone:${phone}`;
}

export function selectDuplicateAutomaticMessageIds(
  messages: DailyMessageCleanupCandidate[],
): string[] {
  if (messages.length <= 1) {
    return [];
  }

  const sorted = [...messages].sort(compareChronologically);
  const unionFind = new UnionFind(sorted.length);
  const customerIndex = new Map<string, number>();
  const phoneIndex = new Map<string, number>();

  for (let index = 0; index < sorted.length; index += 1) {
    const message = sorted[index];
    const customerLookup = customerKey(message.companyId, message.customerId);
    const previousCustomerIndex = customerIndex.get(customerLookup);
    if (previousCustomerIndex !== undefined) {
      unionFind.union(index, previousCustomerIndex);
    } else {
      customerIndex.set(customerLookup, index);
    }

    const normalizedPhone = normalizeStoredPhone(message.phone);
    if (normalizedPhone) {
      const phoneLookup = phoneKey(message.companyId, normalizedPhone);
      const previousPhoneIndex = phoneIndex.get(phoneLookup);
      if (previousPhoneIndex !== undefined) {
        unionFind.union(index, previousPhoneIndex);
      } else {
        phoneIndex.set(phoneLookup, index);
      }
    }
  }

  const components = new Map<number, number[]>();
  for (let index = 0; index < sorted.length; index += 1) {
    const root = unionFind.find(index);
    const group = components.get(root) ?? [];
    group.push(index);
    components.set(root, group);
  }

  const duplicateIds: string[] = [];

  for (const indices of components.values()) {
    if (indices.length <= 1) {
      continue;
    }

    const componentMessages = indices.map((index) => sorted[index]);
    const hasSent = componentMessages.some(
      (message) => message.status === MessageStatus.SENT,
    );

    if (hasSent) {
      for (const message of componentMessages) {
        if (isAbortable(message.status)) {
          duplicateIds.push(message.id);
        }
      }
      continue;
    }

    const ordered = [...componentMessages].sort(compareChronologically);
    for (const message of ordered.slice(1)) {
      if (isAbortable(message.status)) {
        duplicateIds.push(message.id);
      }
    }
  }

  return duplicateIds;
}
