import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  brtDateOf,
  buildMaxlavOrdersParams,
  groupOrdersByBrtDate,
  listMonthWindows,
  orderCreatedOnBrtDate,
} from './maxlav.client.ts'

describe('buildMaxlavOrdersParams', () => {
  it('usa last7days sem begin/end, como o dashboard', () => {
    assert.deepEqual(
      buildMaxlavOrdersParams({ page: 1, limit: 10, period: 'last7days' }),
      {
        page: 1,
        limit: 10,
        period: 'last7days',
        mask: true,
        showName: true,
      },
    )
  })

  it('usa last30days sem begin/end', () => {
    assert.deepEqual(
      buildMaxlavOrdersParams({ page: 1, limit: 100, period: 'last30days' }),
      {
        page: 1,
        limit: 100,
        period: 'last30days',
        mask: true,
        showName: true,
      },
    )
  })

  it('no custom usa início e fim do dia civil BRT no intervalo pedido', () => {
    assert.deepEqual(
      buildMaxlavOrdersParams({
        page: 1,
        limit: 100,
        period: 'custom',
        startDate: '2025-01-01',
        endDate: '2026-09-04',
      }),
      {
        page: 1,
        limit: 100,
        period: 'custom',
        beginDate: '2025-01-01T03:00:00.000Z',
        endDate: '2026-09-05T02:59:59.999Z',
        mask: true,
        showName: true,
      },
    )
  })
})

describe('orderCreatedOnBrtDate', () => {
  it('considera o dia civil BRT, não o UTC', () => {
    assert.equal(
      orderCreatedOnBrtDate('2026-09-04T02:30:00.000Z', '2026-09-03'),
      true,
    )
    assert.equal(
      orderCreatedOnBrtDate('2026-09-04T02:30:00.000Z', '2026-09-04'),
      false,
    )
    assert.equal(
      orderCreatedOnBrtDate('2026-09-04T17:43:25.877Z', '2026-09-04'),
      true,
    )
  })
})

describe('groupOrdersByBrtDate', () => {
  it('agrupa pedidos pelo dia civil BRT', () => {
    const grouped = groupOrdersByBrtDate([
      { id: 'a', createdAt: '2026-09-04T02:30:00.000Z' },
      { id: 'b', createdAt: '2026-09-04T17:43:25.877Z' },
      { id: 'c', createdAt: '2025-03-10T15:00:00.000Z' },
    ])

    assert.deepEqual(
      [...grouped.get('2026-09-03')!.map((order) => order.id)],
      ['a'],
    )
    assert.deepEqual(
      [...grouped.get('2026-09-04')!.map((order) => order.id)],
      ['b'],
    )
    assert.deepEqual(
      [...grouped.get('2025-03-10')!.map((order) => order.id)],
      ['c'],
    )
    assert.equal(brtDateOf('2026-09-04T02:30:00.000Z'), '2026-09-03')
  })
})

describe('listMonthWindows', () => {
  it('parte o intervalo em meses civis', () => {
    assert.deepEqual(listMonthWindows('2025-12-15', '2026-02-03'), [
      { startDate: '2025-12-15', endDate: '2025-12-31' },
      { startDate: '2026-01-01', endDate: '2026-01-31' },
      { startDate: '2026-02-01', endDate: '2026-02-03' },
    ])
  })
})
