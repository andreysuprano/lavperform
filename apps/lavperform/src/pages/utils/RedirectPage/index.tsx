import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { messageRedirectService } from '@/services'

export function RedirectPage() {
  const { id } = useParams<{ id: string }>()

  useEffect(() => {
    async function handleRedirect() {
      const response = await messageRedirectService.getMessageRedirect(id!)

      const { redirectUrl } = response.data

      window.location.href = redirectUrl || ''
    }

    handleRedirect()
  }, [id])

  return null
}
