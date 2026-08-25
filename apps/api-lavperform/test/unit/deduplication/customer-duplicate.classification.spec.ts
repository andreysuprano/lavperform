import {
  classifyDuplicateGroup,
  pickSurvivor,
  splitDuplicateGroup,
  type DuplicateMember,
} from 'src/deduplication/application/customer-duplicate.classification';

const older = new Date('2024-01-01T00:00:00.000Z');
const newer = new Date('2024-06-01T00:00:00.000Z');

function member(overrides: Partial<DuplicateMember>): DuplicateMember {
  return {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'João Silva',
    phone: '5511999999999',
    cpf: null,
    createdAt: older,
    ...overrides,
  };
}

describe('classifyDuplicateGroup', () => {
  it('classifies similar names sharing only phone as auto', () => {
    const result = classifyDuplicateGroup({
      matchType: 'phone',
      matchValue: '5511999999999',
      members: [
        member({ id: 'a', name: 'João Silva', createdAt: older }),
        member({ id: 'b', name: 'Joao Silva', createdAt: newer }),
      ],
    });

    expect(result).toBe('auto');
  });

  it('classifies divergent names as review', () => {
    const result = classifyDuplicateGroup({
      matchType: 'phone',
      matchValue: '5511999999999',
      members: [
        member({ id: 'a', name: 'João Silva' }),
        member({ id: 'b', name: 'Maria Oliveira' }),
      ],
    });

    expect(result).toBe('review');
  });

  it('classifies same phone with distinct cpfs as review', () => {
    const result = classifyDuplicateGroup({
      matchType: 'phone',
      matchValue: '5511999999999',
      members: [
        member({ id: 'a', name: 'João Silva', cpf: '11111111111' }),
        member({ id: 'b', name: 'Joao Silva', cpf: '22222222222' }),
      ],
    });

    expect(result).toBe('review');
  });

  it('does not treat null-only customers as a group to auto-merge', () => {
    const result = classifyDuplicateGroup({
      matchType: 'phone',
      matchValue: '',
      members: [
        member({ id: 'a', phone: null, cpf: null }),
        member({ id: 'b', phone: null, cpf: null }),
      ],
    });

    expect(result).toBe('review');
  });
});

describe('splitDuplicateGroup', () => {
  it('auto-merges similar-name clusters and leaves divergent names for review with the survivor', () => {
    const result = splitDuplicateGroup({
      matchType: 'phone',
      matchValue: '5511999999999',
      members: [
        member({ id: 'joao-old', name: 'João Silva', createdAt: older }),
        member({ id: 'joao-new', name: 'Joao Silva', createdAt: newer }),
        member({ id: 'maria', name: 'Maria Oliveira', createdAt: newer }),
      ],
    });

    expect(result.autoClusters).toHaveLength(1);
    expect(result.autoClusters[0].members.map((item) => item.id).sort()).toEqual([
      'joao-new',
      'joao-old',
    ]);
    expect(result.reviewMembers.map((item) => item.id).sort()).toEqual([
      'joao-old',
      'maria',
    ]);
  });

  it('does not auto-merge similar names that disagree on the other identifier', () => {
    const result = splitDuplicateGroup({
      matchType: 'phone',
      matchValue: '5511999999999',
      members: [
        member({ id: 'a', name: 'João Silva', cpf: '11111111111' }),
        member({ id: 'b', name: 'Joao Silva', cpf: '22222222222' }),
      ],
    });

    expect(result.autoClusters).toHaveLength(0);
    expect(result.reviewMembers).toHaveLength(2);
  });
});

describe('pickSurvivor', () => {
  it('picks the oldest createdAt and smallest id on tie', () => {
    const survivor = pickSurvivor([
      member({ id: 'b', createdAt: older }),
      member({ id: 'a', createdAt: older }),
      member({ id: 'c', createdAt: newer }),
    ]);

    expect(survivor.id).toBe('a');
  });
});
