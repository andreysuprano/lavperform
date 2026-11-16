import { describe, expect, it } from 'vitest'

import { shellModeFromWidth } from './shellMode'

describe('shellModeFromWidth', () => {
  it('separa celular, iPad e desktop nos cortes do Figma', () => {
    expect(shellModeFromWidth(390)).toBe('phone')
    expect(shellModeFromWidth(767)).toBe('phone')
    expect(shellModeFromWidth(768)).toBe('tablet')
    expect(shellModeFromWidth(1024)).toBe('tablet')
    expect(shellModeFromWidth(1199)).toBe('tablet')
    expect(shellModeFromWidth(1200)).toBe('desktop')
    expect(shellModeFromWidth(1366)).toBe('desktop')
  })
})
