import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Provider } from '@/components'

import { TrafficReportPage } from './index'

describe('Relatório de tráfego', () => {
  afterEach(() => {
    cleanup()
  })

  it('mostra o aviso de relatório em breve, sem chamada para integrar', () => {
    render(
      <Provider>
        <TrafficReportPage />
      </Provider>
    )

    expect(
      screen.getByRole('heading', { name: 'Relatório de tráfego' })
    ).toBeInTheDocument()
    expect(screen.getByText('Relatório de anúncios em breve')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})