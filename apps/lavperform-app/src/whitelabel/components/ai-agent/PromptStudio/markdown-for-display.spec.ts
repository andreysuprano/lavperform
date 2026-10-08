import { describe, expect, it } from 'vitest'

import { markdownForDisplay } from './markdown-for-display'

describe('markdownForDisplay', () => {
  it('descarta HTML cru e preserva markdown', () => {
    expect(markdownForDisplay('Olá <script>alert(1)</script> **sim**')).toBe(
      'Olá alert(1) **sim**',
    )
    expect(markdownForDisplay('<b>negrito</b>')).toBe('negrito')
  })
})
