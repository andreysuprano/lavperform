import { describe, expect, it } from 'vitest'

import {
  destinationsTitle,
  filterCounts,
  filterLibrary,
  formatTitle,
  normalizeLibraryPost,
  reopenStep,
  stripHashtags,
  wizardStepOf,
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
    const withGenerating = [
      ...posts,
      post({ id: 'g', status: 'gerando', updatedAt: '2026-10-01T00:00:00.000Z' }),
    ]
    expect(filterLibrary(withGenerating, 'todos').map((item) => item.id)[0]).toBe('g')
    expect(filterCounts(posts).todos).toBe(3)
    expect(filterCounts(posts).gerado).toBe(1)
  })

  it('junta destinos com "e" e descreve o formato', () => {
    expect(destinationsTitle(['ig_feed', 'ig_reels', 'facebook'])).toBe(
      'Feed, Reels e Facebook'
    )
    expect(formatTitle('feed')).toBe('Post único')
    expect(formatTitle('carousel', 4)).toBe('Carrossel · 4 slides')
    expect(formatTitle('video')).toBe('Vídeo')
    expect(wizardStepOf('photos')).toBe(2)
    expect(wizardStepOf('format')).toBe(3)
  })

  it('reabre rascunho no passo salvo e post pronto na revisão', () => {
    expect(reopenStep(post({ status: 'rascunho', wizardStep: 2 }))).toBe(2)
    expect(reopenStep(post({ status: 'gerado', wizardStep: 1 }))).toBe(4)
  })
})