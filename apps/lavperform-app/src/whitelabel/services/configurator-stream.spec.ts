import { describe, expect, it } from 'vitest'

import { takeSseEvents } from './configurator-stream'

describe('takeSseEvents', () => {
  it('lê um evento completo e guarda o pedaço seguinte', () => {
    const first = 'data: {"type":"activity","id":"a1","label":"Lendo","status":"running"}\n\n'
    const partial = 'data: {"type":"done"'
    const parsed = takeSseEvents(first + partial)
    expect(parsed.events).toEqual([
      { type: 'activity', id: 'a1', label: 'Lendo', status: 'running' },
    ])
    expect(parsed.rest).toBe(partial)
  })
})
