import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Provider } from '@/components'

import { DashboardOpsMetrics } from './DashboardOpsMetrics'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ selectedCompany: { id: 'company-1' } }),
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
  it('renders six metric cards with daily cycles as third slot', () => {
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
})
