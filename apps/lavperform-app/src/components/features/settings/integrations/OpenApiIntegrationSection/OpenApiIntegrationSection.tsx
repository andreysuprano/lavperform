import { useState } from 'react'

import { OpenApiDocsCard } from '@/components'

import { OpenApiIntegrationModal } from '../OpenApiIntegrationModal/OpenApiIntegrationModal'

export function OpenApiIntegrationSection() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <OpenApiDocsCard onCtaClick={() => setIsOpen(true)} />
      <OpenApiIntegrationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
