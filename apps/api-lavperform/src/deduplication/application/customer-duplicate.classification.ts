import { isSimilarName } from '../../common/utils/name-similarity';

export type DuplicateMatchType = 'phone' | 'cpf';

export type DuplicateMember = {
  id: string;
  name: string;
  phone: string | null;
  cpf: string | null;
  createdAt: Date;
  orderCount?: number;
};

export type DuplicateGroup = {
  matchType: DuplicateMatchType;
  matchValue: string;
  members: DuplicateMember[];
};

export type GroupClassification = 'auto' | 'review';

export function pickSurvivor<T extends { id: string; createdAt: Date }>(
  members: T[],
): T {
  return [...members].sort((a, b) => {
    const byDate = a.createdAt.getTime() - b.createdAt.getTime();
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  })[0];
}

export function classifyDuplicateGroup(group: DuplicateGroup): GroupClassification {
  if (!group.matchValue) {
    return 'review';
  }

  const members = group.members;
  if (members.length < 2) {
    return 'review';
  }

  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      if (!isSimilarName(members[i].name, members[j].name)) {
        return 'review';
      }
    }
  }

  const otherField: 'phone' | 'cpf' = group.matchType === 'phone' ? 'cpf' : 'phone';
  const otherValues = new Set(
    members
      .map((member) => member[otherField])
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  );
  if (otherValues.size > 1) {
    return 'review';
  }

  return 'auto';
}

function similarNameClusters(members: DuplicateMember[]): DuplicateMember[][] {
  const parent = members.map((_, index) => index);

  const find = (index: number): number => {
    if (parent[index] !== index) parent[index] = find(parent[index]);
    return parent[index];
  };

  const union = (left: number, right: number) => {
    const rootLeft = find(left);
    const rootRight = find(right);
    if (rootLeft !== rootRight) parent[rootRight] = rootLeft;
  };

  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      if (isSimilarName(members[i].name, members[j].name)) {
        union(i, j);
      }
    }
  }

  const clusters = new Map<number, DuplicateMember[]>();
  for (let i = 0; i < members.length; i += 1) {
    const root = find(i);
    const cluster = clusters.get(root) ?? [];
    cluster.push(members[i]);
    clusters.set(root, cluster);
  }

  return [...clusters.values()];
}

export function splitDuplicateGroup(group: DuplicateGroup): {
  autoClusters: DuplicateGroup[];
  reviewMembers: DuplicateMember[];
} {
  const autoClusters: DuplicateGroup[] = [];
  const leftover: DuplicateMember[] = [];

  for (const cluster of similarNameClusters(group.members)) {
    const asGroup: DuplicateGroup = {
      matchType: group.matchType,
      matchValue: group.matchValue,
      members: cluster,
    };
    if (cluster.length >= 2 && classifyDuplicateGroup(asGroup) === 'auto') {
      autoClusters.push(asGroup);
    } else {
      leftover.push(...cluster);
    }
  }

  const reviewById = new Map<string, DuplicateMember>();
  for (const member of leftover) {
    reviewById.set(member.id, member);
  }
  for (const cluster of autoClusters) {
    const survivor = pickSurvivor(cluster.members);
    reviewById.set(survivor.id, survivor);
  }

  const reviewMembers = [...reviewById.values()];
  if (reviewMembers.length < 2) {
    return { autoClusters, reviewMembers: [] };
  }

  return { autoClusters, reviewMembers };
}

export function sharedIdentifiersToClear(
  keeper: Pick<DuplicateMember, 'phone' | 'cpf'>,
  peer: Pick<DuplicateMember, 'phone' | 'cpf'>,
): { phone: boolean; cpf: boolean } {
  return {
    phone: Boolean(keeper.phone && peer.phone && keeper.phone === peer.phone),
    cpf: Boolean(keeper.cpf && peer.cpf && keeper.cpf === peer.cpf),
  };
}
