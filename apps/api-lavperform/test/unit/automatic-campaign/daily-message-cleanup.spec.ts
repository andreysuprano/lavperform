import { MessageStatus } from '@prisma/client';
import {
  DailyMessageCleanupCandidate,
  selectDuplicateAutomaticMessageIds,
} from 'src/automatic-campaign/application/daily-message-cleanup';
import { parseCleanupScriptArgs } from 'src/scripts/cleanup-duplicate-automatic-messages';

describe('selectDuplicateAutomaticMessageIds', () => {
  const t1 = new Date('2026-09-04T12:00:00.000Z');
  const t2 = new Date('2026-09-04T13:00:00.000Z');
  const t3 = new Date('2026-09-04T14:00:00.000Z');

  const message = (
    id: string,
    overrides: Partial<DailyMessageCleanupCandidate> = {},
  ): DailyMessageCleanupCandidate => ({
    id,
    companyId: 'co1',
    customerId: 'c-default',
    phone: '5511999999999',
    status: MessageStatus.PENDING,
    createdAt: t1,
    ...overrides,
  });

  it('aborts later duplicates for the same customer', () => {
    expect(
      selectDuplicateAutomaticMessageIds([
        message('m1', {
          customerId: 'c1',
          phone: '5511999999999',
          status: MessageStatus.PENDING,
          createdAt: t1,
        }),
        message('m2', {
          customerId: 'c1',
          phone: '5511888888888',
          status: MessageStatus.PENDING,
          createdAt: t2,
        }),
      ]),
    ).toEqual(['m2']);
  });

  it('groups the same canonical phone across different formats', () => {
    expect(
      selectDuplicateAutomaticMessageIds([
        message('m1', {
          customerId: 'c1',
          phone: '+5511999999999',
          createdAt: t1,
        }),
        message('m2', {
          customerId: 'c2',
          phone: '(11) 99999-9999',
          createdAt: t2,
        }),
      ]),
    ).toEqual(['m2']);
  });

  it('handles transitive identity chains through customer and phone links', () => {
    expect(
      selectDuplicateAutomaticMessageIds([
        message('A', { customerId: 'u1', phone: '5511111111111', createdAt: t1 }),
        message('B', { customerId: 'u1', phone: '5511222222222', createdAt: t2 }),
        message('C', { customerId: 'u2', phone: '5511222222222', createdAt: t3 }),
      ]),
    ).toEqual(['B', 'C']);
  });

  it('preserves all SENT and aborts PENDING/PROCESSING when any SENT exists', () => {
    expect(
      selectDuplicateAutomaticMessageIds([
        message('sent', {
          customerId: 'c1',
          phone: '5511999999999',
          status: MessageStatus.SENT,
          createdAt: t1,
        }),
        message('pending', {
          customerId: 'c1',
          phone: '5511888888888',
          status: MessageStatus.PENDING,
          createdAt: t2,
        }),
        message('processing', {
          customerId: 'c2',
          phone: '5511999999999',
          status: MessageStatus.PROCESSING,
          createdAt: t3,
        }),
      ]),
    ).toEqual(['pending', 'processing']);
  });

  it('preserves every SENT and aborts nothing when only SENT messages overlap', () => {
    expect(
      selectDuplicateAutomaticMessageIds([
        message('s1', {
          customerId: 'c1',
          phone: '5511999999999',
          status: MessageStatus.SENT,
          createdAt: t1,
        }),
        message('s2', {
          customerId: 'c1',
          phone: '5511888888888',
          status: MessageStatus.SENT,
          createdAt: t2,
        }),
      ]),
    ).toEqual([]);
  });

  it('does not group duplicates across different companies', () => {
    expect(
      selectDuplicateAutomaticMessageIds([
        message('m1', {
          companyId: 'co-a',
          customerId: 'c1',
          phone: '5511999999999',
          createdAt: t1,
        }),
        message('m2', {
          companyId: 'co-b',
          customerId: 'c1',
          phone: '5511999999999',
          createdAt: t2,
        }),
      ]),
    ).toEqual([]);
  });

  it('returns empty when duplicates were already removed from the active set', () => {
    const activeAfterCleanup = [
      message('winner', {
        customerId: 'c1',
        phone: '5511999999999',
        status: MessageStatus.PENDING,
        createdAt: t1,
      }),
    ];

    expect(selectDuplicateAutomaticMessageIds(activeAfterCleanup)).toEqual([]);
  });

  it('preserves the earliest message by createdAt and id without SENT', () => {
    expect(
      selectDuplicateAutomaticMessageIds([
        message('m2', {
          customerId: 'c1',
          createdAt: t2,
        }),
        message('m1', {
          customerId: 'c1',
          createdAt: t1,
        }),
      ]),
    ).toEqual(['m2']);
  });

  it('returns empty for a single message', () => {
    expect(
      selectDuplicateAutomaticMessageIds([
        message('only', { customerId: 'c1' }),
      ]),
    ).toEqual([]);
  });
});

describe('parseCleanupScriptArgs', () => {
  it('defaults to dry-run when no flags are provided', () => {
    expect(parseCleanupScriptArgs([])).toEqual({ apply: false, companyId: undefined });
  });

  it('enables apply only with --apply', () => {
    expect(parseCleanupScriptArgs(['--apply'])).toEqual({
      apply: true,
      companyId: undefined,
    });
  });

  it('forces dry-run when --dry-run and --apply are both present', () => {
    expect(parseCleanupScriptArgs(['--apply', '--dry-run'])).toEqual({
      apply: false,
      companyId: undefined,
    });
    expect(parseCleanupScriptArgs(['--dry-run', '--apply'])).toEqual({
      apply: false,
      companyId: undefined,
    });
  });

  it('parses --company-id', () => {
    expect(parseCleanupScriptArgs(['--company-id', 'uuid-123'])).toEqual({
      apply: false,
      companyId: 'uuid-123',
    });
  });
});
