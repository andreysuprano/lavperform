import { describe, expect, it } from 'vitest'

import { progress } from './sheet-progress'

describe('progress', () => {
  it('returns 25 when 1 of 4 answered', () => {
    expect(progress(1, 4)).toBe(25)
  })

  it('returns 0 when total is 0', () => {
    expect(progress(0, 0)).toBe(0)
  })
})
