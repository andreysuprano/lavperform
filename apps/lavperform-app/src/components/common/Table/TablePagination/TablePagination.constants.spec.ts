import { describe, expect, it } from 'vitest'
import { TABLE_PAGE_SIZES } from './TablePagination.constants'

describe('TABLE_PAGE_SIZES', () => {
  it('offers up to 100 records per page', () => {
    expect(TABLE_PAGE_SIZES).toEqual([5, 10, 20, 50, 100])
  })
})
