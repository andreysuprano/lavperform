import type { DashCustomersInsightsProps } from '@/types'
import { formatCurrency } from '@/utils/money'

export type CrmInsightPriority = 'high' | 'medium' | 'opportunity'

export type CrmInsightAction = {
  label: string
  href: string
}

export type CustomerCrmInsight = {
  id: string
  title: string
  message: string
  priority: CrmInsightPriority
  action?: CrmInsightAction
}

const DAY_LABELS: Record<string, string> = {
  domingo: 'domingo',
  segunda: 'segunda-feira',
  'segunda-feira': 'segunda-feira',
  terca: 'terça-feira',
  terça: 'terça-feira',
  'terca-feira': 'terça-feira',
  'terça-feira': 'terça-feira',
  quarta: 'quarta-feira',
  'quarta-feira': 'quarta-feira',
  quinta: 'quinta-feira',
  'quinta-feira': 'quinta-feira',
  sexta: 'sexta-feira',
  'sexta-feira': 'sexta-feira',
  sabado: 'sábado',
  sábado: 'sábado',
  monday: 'segunda-feira',
  tuesday: 'terça-feira',
  wednesday: 'quarta-feira',
  thursday: 'quinta-feira',
  friday: 'sexta-feira',
  saturday: 'sábado',
  sunday: 'domingo',
}

function formatOrderDay(day: string): string {
  const key = day.trim().toLowerCase()
  return DAY_LABELS[key] ?? day
}

/**
 * Gera insights acionáveis de CRM para o dono do restaurante
 * com base na saúde e oportunidades da base.
 */
export function getCustomerCrmInsights(
  data: DashCustomersInsightsProps,
): CustomerCrmInsight[] {
  const insights: CustomerCrmInsight[] = []
  const { summary, opportunities, health, patterns, segments, campaignReadiness } =
    data
  const total = summary.totalCustomers

  if (total <= 0) {
    return [
      {
        id: 'empty-base',
        title: 'Base ainda vazia',
        message:
          'Importe ou sincronize pedidos para começar a gerar inteligência de clientes, segmentos RFV e oportunidades de campanha.',
        priority: 'high',
        action: {
          label: 'Ir para base de clientes',
          href: '/customers/CustomerBase',
        },
      },
    ]
  }

  if (campaignReadiness && campaignReadiness.withBirthDateRate < 40) {
    insights.push({
      id: 'missing-birthdate',
      title: 'Poucos aniversários cadastrados',
      message: `Só ${campaignReadiness.withBirthDateRate}% da base tem data de nascimento (${campaignReadiness.withBirthDate} clientes). Esse dado libera campanhas de aniversário com alta conversão.`,
      priority: 'medium',
      action: {
        label: 'Filtrar na base',
        href: '/customers/CustomerBase',
      },
    })
  }

  if (campaignReadiness && campaignReadiness.withEmailRate < 30) {
    insights.push({
      id: 'missing-email',
      title: 'Base com pouco e-mail',
      message: `Apenas ${campaignReadiness.withEmailRate}% tem e-mail (${campaignReadiness.withEmail} clientes). Completar esse dado amplia canais além do WhatsApp.`,
      priority: 'medium',
      action: {
        label: 'Ver base de clientes',
        href: '/customers/CustomerBase',
      },
    })
  }

  if (opportunities.retention > 0) {
    insights.push({
      id: 'retention',
      title: 'Clientes pedindo atenção',
      message: `${opportunities.retention} clientes estão em risco ou quase dormentes (${health.retentionRate}% da base). Uma campanha de retenção agora pode evitar perda de receita.`,
      priority: 'high',
      action: {
        label: 'Criar campanha de retenção',
        href: '/campaigns/recurring-campaigns',
      },
    })
  }

  if (opportunities.reconquest > 0) {
    insights.push({
      id: 'reconquest',
      title: 'Oportunidade de reconquista',
      message: `${opportunities.reconquest} clientes hibernando ou perdidos (${health.reconquestRate}% da base). Vale um incentivo forte para trazer de volta.`,
      priority: 'high',
      action: {
        label: 'Montar audiência de reconquista',
        href: '/customers/audiences',
      },
    })
  }

  if (health.reachabilityRate < 60 && summary.unattainableCustomers > 0) {
    insights.push({
      id: 'reachability',
      title: 'Baixa alcançabilidade no WhatsApp',
      message: `Só ${health.reachabilityRate}% da base está verificada no WhatsApp. Valide números ou peça opt-in para ampliar o alcance das campanhas.`,
      priority: 'medium',
      action: {
        label: 'Ver base de clientes',
        href: '/customers/CustomerBase',
      },
    })
  }

  if (opportunities.upcomingBirthdays > 0) {
    insights.push({
      id: 'birthdays',
      title: 'Aniversariantes nos próximos 30 dias',
      message: `${opportunities.upcomingBirthdays} clientes fazem aniversário em breve. Uma mensagem personalizada costuma gerar retorno rápido.`,
      priority: 'opportunity',
      action: {
        label: 'Criar campanha de aniversário',
        href: '/campaigns/recurring-campaigns',
      },
    })
  }

  if (opportunities.nurture > 0 && opportunities.loyalty > 0) {
    insights.push({
      id: 'nurture',
      title: 'Nutrir novos e promissórios',
      message: `${opportunities.nurture} clientes novos ou em potencial podem virar fiéis. Combine com os ${opportunities.loyalty} campeões/fiéis para programas de recorrência.`,
      priority: 'opportunity',
      action: {
        label: 'Ver matriz RFV',
        href: '/customers/ClientDetails',
      },
    })
  } else if (opportunities.nurture > 0) {
    insights.push({
      id: 'nurture',
      title: 'Nutrir novos clientes',
      message: `${opportunities.nurture} clientes estão no início do relacionamento. Campanhas de segunda compra aumentam a chance de virarem fiéis.`,
      priority: 'opportunity',
      action: {
        label: 'Criar campanha',
        href: '/campaigns/recurring-campaigns',
      },
    })
  }

  if (opportunities.leads > 0) {
    insights.push({
      id: 'leads',
      title: 'Leads sem primeiro pedido',
      message: `${opportunities.leads} contatos ainda não compraram. Uma oferta de primeira compra pode converter essa lista em clientes ativos.`,
      priority: 'medium',
      action: {
        label: 'Criar audiência de leads',
        href: '/customers/audiences',
      },
    })
  }

  if (patterns.averageTicket > 0) {
    insights.push({
      id: 'ticket',
      title: 'Ticket médio da base',
      message: `O ticket médio dos clientes com pedidos é ${formatCurrency(patterns.averageTicket)}. Use isso como referência para cupons e metas de upsell.`,
      priority: 'opportunity',
    })
  }

  if (patterns.topOrderDays.length > 0) {
    const top = patterns.topOrderDays[0]
    insights.push({
      id: 'peak-day',
      title: 'Dia com mais pedidos',
      message: `O dia mais forte da base é ${formatOrderDay(top.day)} (${top.count} clientes com esse padrão). Programe campanhas 1 dia antes para antecipar a demanda.`,
      priority: 'opportunity',
      action: {
        label: 'Ver campanhas',
        href: '/campaigns',
      },
    })
  }

  if (health.activeRate >= 50 && health.loyaltyRate >= 15) {
    insights.push({
      id: 'healthy-base',
      title: 'Base saudável',
      message: `${health.activeRate}% da base está ativa e ${health.loyaltyRate}% são campeões ou fiéis. Foque em manter o ritmo e expandir a recorrência.`,
      priority: 'opportunity',
    })
  }

  const topSegment = [...segments]
    .filter((s) => s.segmentation !== 'lead' && s.count > 0)
    .sort((a, b) => b.count - a.count)[0]

  if (topSegment && topSegment.count / total >= 0.25) {
    insights.push({
      id: 'dominant-segment',
      title: `Segmento dominante: ${topSegment.label}`,
      message: `${topSegment.count} clientes (${Math.round((topSegment.count / total) * 100)}%) estão em "${topSegment.label}". Vale uma comunicação específica para esse grupo.`,
      priority: 'medium',
      action: {
        label: 'Abrir matriz RFV',
        href: '/customers/ClientDetails',
      },
    })
  }

  const priorityRank: Record<CrmInsightPriority, number> = {
    high: 0,
    medium: 1,
    opportunity: 2,
  }

  return insights
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
    .slice(0, 8)
}
