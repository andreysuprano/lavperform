import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { LaundryKitOperation } from './laundrykit-to-ingest.ts'
import {
  groupLaundryKitOperations,
  mapLaundryKitGroupToIngestDto,
  resolveLaundryKitGroupKey,
} from './laundrykit-to-ingest.ts'

const LIST_ID = 'T1789561423975_d1a80212-55e8-4960-bc0c-e927afed00e'
const ACQUIRER = '35963348133309'

function wash(overrides: Partial<LaundryKitOperation> & Pick<LaundryKitOperation, 'OP_ID'>): LaundryKitOperation {
  return {
    TIMESTAMP: 1789561423975,
    STORE_ID: 'STORE_ID_189',
    ACTION_DONE: true,
    PAYMENT_AUTHORIZATION_CODE: ACQUIRER,
    PAYMENT: {
      ACQUIRER_STATUS: true,
      ID: ACQUIRER,
      TYPE: 'DEBIT',
      VALUE: { INITIAL: 15.9, DISCOUNT: 3.98, FINAL: 11.93 },
    },
    SOURCE: { TYPE: 'TOTEM', ID: 'TOTEM_189' },
    USER: { NAME: 'Janaina', IDENTIFIER: '37041735842' },
    Voucher_Code: 'novo25',
    SERVICE: {
      DETAILS: {
        OP_TYPE: 'WASH',
        MACHINE_NAME: 'Lavadora 3',
        IOT_ID: 'Laundry_IOT_M_1338',
      },
    },
    ...overrides,
  }
}

describe('resolveLaundryKitGroupKey', () => {
  it('usa o ID da lista (PAYMENT_ID no formato T{timestamp}_{uuid})', () => {
    const op = wash({
      OP_ID: 'T1789561423975_59fb185c-899d-4c0f-9cc3-19c4bb91b8bf',
      PAYMENT_ID: LIST_ID,
    })
    assert.equal(resolveLaundryKitGroupKey(op), LIST_ID)
  })

  it('cai no adquirente quando não há lista', () => {
    const op = wash({
      OP_ID: 'T1789561423975_59fb185c-899d-4c0f-9cc3-19c4bb91b8bf',
    })
    assert.equal(resolveLaundryKitGroupKey(op), ACQUIRER)
  })

  it('cai no prefixo T{timestamp} sem lista nem adquirente', () => {
    const op = wash({
      OP_ID: 'T1789558532040_cd4993e2-127d-4ae0-8dcd-4fdd988b4766',
      PAYMENT_AUTHORIZATION_CODE: undefined,
      PAYMENT: { ACQUIRER_STATUS: true, TYPE: 'PIX', VALUE: { FINAL: 15.9 } },
    })
    assert.equal(resolveLaundryKitGroupKey(op), 'T1789558532040')
  })
})

describe('groupLaundryKitOperations + mapLaundryKitGroupToIngestDto', () => {
  it('Janaina: duas máquinas, um pagamento de R$ 11,93 e dois itens', () => {
    const ops = [
      wash({
        OP_ID: 'T1789561423975_59fb185c-899d-4c0f-9cc3-19c4bb91b8bf',
        PAYMENT_ID: LIST_ID,
        SERVICE: {
          DETAILS: {
            OP_TYPE: 'WASH',
            MACHINE_NAME: 'Lavadora 3',
            IOT_ID: 'Laundry_IOT_M_1338',
          },
        },
      }),
      wash({
        OP_ID: 'T1789561423975_a9e31773-0f2a-4f94-a99d-b499d4bb9811',
        PAYMENT_ID: LIST_ID,
        SERVICE: {
          DETAILS: {
            OP_TYPE: 'WASH',
            MACHINE_NAME: 'Lavadora 2',
            IOT_ID: 'Laundry_IOT_M_544',
          },
        },
      }),
    ]

    const groups = groupLaundryKitOperations(ops)
    assert.equal(groups.length, 1)
    assert.equal(groups[0].length, 2)

    const dto = mapLaundryKitGroupToIngestDto(groups[0])
    assert.equal(dto.externalOrderId, 'T1789561423975')
    assert.equal(dto.total, 11.93)
    assert.equal(dto.items?.length, 2)
    assert.deepEqual(
      dto.items?.map((item) => item.observation).sort(),
      ['Lavadora 2', 'Lavadora 3'],
    )
    assert.ok(dto.items?.every((item) => item.totalPrice === 0 && item.unitPrice === 0))
    assert.equal(dto.payments?.[0]?.total, 11.93)
    assert.equal(dto.discounts?.length, 1)
    assert.equal(dto.discounts?.[0]?.value, 3.98)
  })

  it('Kellu: uma operação vira um pedido com externalOrderId = OP_ID', () => {
    const op = wash({
      OP_ID: 'T1789558532040_cd4993e2-127d-4ae0-8dcd-4fdd988b4766',
      TIMESTAMP: 1789558532040,
      PAYMENT_AUTHORIZATION_CODE: 'pix-kellu',
      PAYMENT: {
        ACQUIRER_STATUS: true,
        ID: 'pix-kellu',
        TYPE: 'PIX',
        VALUE: { INITIAL: 15.9, DISCOUNT: 0, FINAL: 15.9 },
      },
      USER: { NAME: 'Kellu', IDENTIFIER: '03654378404' },
      Voucher_Code: '-',
      SERVICE: {
        DETAILS: {
          OP_TYPE: 'DRY',
          MACHINE_NAME: 'Secadora 1',
          IOT_ID: 'Laundry_IOT_M_543',
        },
      },
    })

    const groups = groupLaundryKitOperations([op])
    assert.equal(groups.length, 1)
    const dto = mapLaundryKitGroupToIngestDto(groups[0])
    assert.equal(dto.externalOrderId, op.OP_ID)
    assert.equal(dto.total, 15.9)
    assert.equal(dto.items?.length, 1)
    assert.equal(dto.discounts, undefined)
  })

  it('Israel: dois prefixos T minutos depois são duas vendas', () => {
    const first = wash({
      OP_ID: 'T1789534833091_92028621-3d6d-447b-b730-9573bddf0a52',
      TIMESTAMP: 1789534833091,
      PAYMENT_AUTHORIZATION_CODE: 'acq-1',
      PAYMENT: {
        ACQUIRER_STATUS: true,
        ID: 'acq-1',
        TYPE: 'DEBIT',
        VALUE: { FINAL: 13.9 },
      },
      USER: { NAME: 'Israel', IDENTIFIER: '47214818884' },
    })
    const second = wash({
      OP_ID: 'T1789534945215_37cb7be1-1ef0-4259-b6ce-51e9c8d5bcb2',
      TIMESTAMP: 1789534945215,
      PAYMENT_AUTHORIZATION_CODE: 'acq-2',
      PAYMENT: {
        ACQUIRER_STATUS: true,
        ID: 'acq-2',
        TYPE: 'DEBIT',
        VALUE: { FINAL: 13.9 },
      },
      USER: { NAME: 'Israel', IDENTIFIER: '47214818884' },
    })

    const groups = groupLaundryKitOperations([first, second])
    assert.equal(groups.length, 2)
  })

  it('Mailson: mesmo grupo, voucher só numa linha, total é o menor FINAL', () => {
    const withVoucher = wash({
      OP_ID: 'T1789542326291_bf2ec94c-6df5-4a20-8ab8-c456ecac6576',
      PAYMENT_ID: 'T1789542326291_list',
      PAYMENT: {
        ACQUIRER_STATUS: true,
        ID: 'acq-mailson',
        TYPE: 'DEBIT',
        VALUE: { INITIAL: 13.9, DISCOUNT: 1.39, FINAL: 12.51 },
      },
      Voucher_Code: 'cliente10',
    })
    const withoutVoucher = wash({
      OP_ID: 'T1789542326291_146b6323-ddaa-42e0-98be-76d3732d8e45',
      PAYMENT_ID: 'T1789542326291_list',
      PAYMENT: {
        ACQUIRER_STATUS: true,
        ID: 'acq-mailson',
        TYPE: 'DEBIT',
        VALUE: { INITIAL: 13.9, DISCOUNT: 0, FINAL: 13.9 },
      },
      Voucher_Code: '-',
    })

    const groups = groupLaundryKitOperations([withoutVoucher, withVoucher])
    assert.equal(groups.length, 1)
    const dto = mapLaundryKitGroupToIngestDto(groups[0])
    assert.equal(dto.total, 12.51)
    assert.equal(dto.items?.length, 2)
    assert.equal(dto.discounts?.[0]?.value, 1.39)
  })
})
