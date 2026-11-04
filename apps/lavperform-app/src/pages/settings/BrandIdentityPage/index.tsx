import { useEffect, useState } from 'react'
import { LuPalette } from 'react-icons/lu'

import { AppContentLayout, BrandIdentityForm, LoadingState } from '@/components'
import { useAuth } from '@/context/AuthContext'
import {
  useBrandIdentity,
  useSaveBrandIdentity,
} from '@/hooks/queries/useSocialPosts'
import { DEFAULT_BRAND, type SaveBrandPayload } from '@/types'

export function BrandIdentityPage() {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id ?? ''
  const { data, isLoading } = useBrandIdentity(companyId)
  const save = useSaveBrandIdentity(companyId)
  const [form, setForm] = useState<SaveBrandPayload>(DEFAULT_BRAND)
  const [saved, setSaved] = useState<SaveBrandPayload>(DEFAULT_BRAND)

  useEffect(() => {
    if (!data) return
    const next: SaveBrandPayload = {
      logoLightUrl: data.logoLightUrl,
      logoDarkUrl: data.logoDarkUrl,
      primaryColor: data.primaryColor,
      deepColor: data.deepColor,
      accentColor: data.accentColor,
      neutralColor: data.neutralColor,
      titleFont: data.titleFont,
      bodyFont: data.bodyFont,
      tones: data.tones,
      voiceNotes: data.voiceNotes,
      references: data.references,
    }
    setForm(next)
    setSaved(next)
  }, [data])

  return (
    <AppContentLayout
      icon={<LuPalette />}
      title="Identidade da marca"
    >
      {isLoading ? (
        <LoadingState title="Carregando identidade..." />
      ) : (
        <BrandIdentityForm
          onChange={setForm}
          onDiscard={() => setForm(saved)}
          onSave={() =>
            save.mutate(form, {
              onSuccess: (next) => {
                const snapshot: SaveBrandPayload = {
                  logoLightUrl: next.logoLightUrl,
                  logoDarkUrl: next.logoDarkUrl,
                  primaryColor: next.primaryColor,
                  deepColor: next.deepColor,
                  accentColor: next.accentColor,
                  neutralColor: next.neutralColor,
                  titleFont: next.titleFont,
                  bodyFont: next.bodyFont,
                  tones: next.tones,
                  voiceNotes: next.voiceNotes,
                  references: next.references,
                }
                setSaved(snapshot)
              },
            })
          }
          saving={save.isPending}
          value={form}
        />
      )}
    </AppContentLayout>
  )
}
