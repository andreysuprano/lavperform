import { describe, expect, it } from 'vitest'

import { buildAutomaticCampaignPayload } from './buildAutomaticCampaignPayload'

const form = {
  campaignType: 'REACTIVATION',
  name: '10 ciclos',
  segmentation: ['fiel'],
  target: [],
  daysOfWeek: ['seg'],
  startDate: '2026-09-28',
  endDate: '2026-09-30',
  messageText: 'Oi',
  incitation: 'none',
  channels: ['whatsapp-web'],
  sendScheduleMode: 'establishment',
  sendMode: 'COVER_BATCH',
} as any

describe('buildAutomaticCampaignPayload', () => {
  it('sends COVER_BATCH when the form asks to finish the batch', () => {
    const payload = buildAutomaticCampaignPayload({
      form,
      creatives: [{ description: 'Oi', imageUrls: [], title: 'A' }] as any,
      maxDailySends: 50,
    })
    expect(payload.sendMode).toBe('COVER_BATCH')
  })

  it('defaults a missing mode to COVER_BATCH', () => {
    const payload = buildAutomaticCampaignPayload({
      form: { ...form, sendMode: undefined },
      creatives: [{ description: 'Oi', imageUrls: [], title: 'A' }] as any,
      maxDailySends: 50,
    })
    expect(payload.sendMode).toBe('COVER_BATCH')
  })
})
