import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '@/components'

import { DashboardOpsMetrics } from './DashboardOpsMetrics'

const authState = {
  selectedCompany: {
    id: 'company-1',
    serviceModel: 'SELF_SERVICE' as const,
  },
}

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('@/hooks/queries', () => ({
  useDashboardCustomers: () => ({
    data: {
      activeCustomers: 10,
      inactiveCustomers: 3,
      newCustomers: 2,
    },
    isLoading: false,
  }),
  useDashboardPerformance: () => ({
    data: {
      summary: {
        dailySalesAmount: 100,
        dailySalesCount: 4,
        dailyCycleCount: 5,
      },
      chartData: [],
    },
    isLoading: false,
    isPlaceholderData: false,
  }),
}))

vi.mock('../MetricCard/MetricCard', () => ({
  MetricCard: ({
    label,
    value,
  }: {
    label: string
    value: number
  }) => (
    <div data-testid="metric-card">
      {label}:{value}
    </div>
  ),
}))

function renderMetrics() {
  return render(
    <Provider>
      <DashboardOpsMetrics />
    </Provider>,
  )
}

describe('DashboardOpsMetrics', () => {
  afterEach(() => {
    cleanup()
  })
  it('renders six metric cards with daily cycles as third slot', () => {
    authState.selectedCompany.serviceModel = 'SELF_SERVICE'
    renderMetrics()

    expect(
      screen.getAllByTestId('metric-card').map((node) => node.textContent),
    ).toEqual([
      expect.stringContaining('Vendas do dia'),
      expect.stringContaining('Vendas do dia'),
      expect.stringContaining('Ciclos do dia'),
      expect.stringContaining('Clientes ativos'),
      expect.stringContaining('Reconquista'),
      expect.stringContaining('Novos'),
    ])
  })

  it('hides Ciclos do dia for conventional companies', () => {
    authState.selectedCompany.serviceModel = 'CONVENTIONAL'
    renderMetrics()

    expect(screen.queryByText(/Ciclos do dia/)).not.toBeInTheDocument()
    expect(screen.getAllByTestId('metric-card')).toHaveLength(5)
  })
})
