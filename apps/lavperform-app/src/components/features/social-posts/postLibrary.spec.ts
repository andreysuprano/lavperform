import { describe, expect, it } from 'vitest'

import {
  filterCounts,
  filterLibrary,
  normalizeLibraryPost,
  reopenStep,
  stripHashtags,
} from './postLibrary'

describe('biblioteca de Social Media', () => {
  const post = (patch: Record<string, unknown>) =>
    normalizeLibraryPost({ id: '1', theme: 'Coleta grátis', ...patch })

  it('remove hashtags do texto mostrado', () => {
    expect(stripHashtags('Coleta grátis no Batel\n#lavanderia #batel')).toBe(
      'Coleta grátis no Batel'
    )
  })

  it('filtra pelos status do Figma e conta cada um', () => {
    const posts = [
      post({ id: 'a', status: 'rascunho', updatedAt: '2026-11-01T00:00:00.000Z' }),
      post({ id: 'b', status: 'gerado', updatedAt: '2026-11-05T00:00:00.000Z' }),
      post({ id: 'c', status: 'agendado', updatedAt: '2026-11-03T00:00:00.000Z' }),
    ]
    expect(filterLibrary(posts, 'gerado').map((item) => item.id)).toEqual(['b'])
    expect(filterLibrary(posts, 'todos').map((item) => item.id)).toEqual(['b', 'c', 'a'])
    expect(filterCounts(posts).todos).toBe(3)
    expect(filterCounts(posts).gerado).toBe(1)
  })

  it('reabre rascunho no passo salvo e post pronto na revisão', () => {
    expect(reopenStep(post({ status: 'rascunho', wizardStep: 2 }))).toBe(2)
    expect(reopenStep(post({ status: 'gerado', wizardStep: 1 }))).toBe(4)
  })
})