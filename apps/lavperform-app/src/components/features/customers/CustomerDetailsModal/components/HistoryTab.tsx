import { Box, Flex } from '@chakra-ui/react'
import { useMemo } from 'react'

import { LoadingState } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useCustomerDetails } from '@/hooks/useCustomerDetails'

import { TimelineEventCard } from './TimelineEventCard'
import type { TimelineEvent } from './TimelineEvent.types'

type Props = {
  customerId: string
}

export function HistoryTab({ customerId }: Props) {
  const { selectedCompany } = useAuth()
  const { loading } = useCustomerDetails(selectedCompany?.id, customerId)

  // Mock data expandido com eventos variados
  const mockEvents: TimelineEvent[] = useMemo(
    () => [
      {
        id: '1',
        type: 'rfv_changed',
        timestamp: '2025-12-30T02:18:00',
        title: 'Mudou o status RFV',
        description: 'Lealdade potencial',
        rfvChange: {
          from: 'Clientes em risco',
          to: 'Lealdade potencial',
        },
      },
      {
        id: '2',
        type: 'purchase',
        timestamp: '2025-12-28T18:28:00',
        title: 'Realizou uma venda',
        purchase: {
          channel: 'Alloy',
          amount: 75.79,
        },
      },
      {
        id: '3',
        type: 'message_sent',
        timestamp: '2025-12-21T19:06:00',
        title: 'Recebeu um WhatsApp',
        message: {
          channel: 'whatsapp',
          preview: 'Olá Thiago, sentimos sua falta por aq...',
          fullContent:
            'Olá *Thiago*, como vai? ❤️ Está com saudades? Volte e ganhe um cupom especial de 20% OFF em qualquer venda!',
        },
        campaign: {
          id: 'c01',
          name: 'Recuperação 30D+',
        },
      },
      {
        id: '4',
        type: 'rfv_changed',
        timestamp: '2025-12-06T02:16:00',
        title: 'Mudou o status RFV',
        description: 'Clientes em risco',
        rfvChange: {
          from: 'Lealdade potencial',
          to: 'Clientes em risco',
        },
      },
      {
        id: '5',
        type: 'rfv_changed',
        timestamp: '2025-11-23T02:13:00',
        title: 'Mudou o status RFV',
        description: 'Precisam de atenção',
        rfvChange: {
          from: 'Clientes em risco',
          to: 'Precisam de atenção',
        },
      },
      {
        id: '6',
        type: 'message_sent',
        timestamp: '2025-11-02T16:02:00',
        title: 'Recebeu um WhatsApp',
        message: {
          channel: 'whatsapp',
          preview: 'Olá *Thiago*, como vai? ❤️ Está com s...',
          fullContent:
            'Olá *Thiago*, como vai? ❤️ Está com saudades? Sentimos sua falta! Que tal voltar hoje?',
        },
        campaign: {
          id: 'c02',
          name: 'Manter clientes ativos',
        },
      },
      {
        id: '7',
        type: 'rfv_changed',
        timestamp: '2025-11-02T02:40:00',
        title: 'Mudou o status RFV',
        description: 'Lealdade potencial',
        rfvChange: {
          from: 'Precisam de atenção',
          to: 'Lealdade potencial',
        },
      },
      {
        id: '8',
        type: 'purchase',
        timestamp: '2025-10-31T18:12:00',
        title: 'Realizou uma compra',
        purchase: {
          channel: 'Alloy',
          amount: 90.57,
        },
        campaign: {
          id: 'c03',
          name: 'BRAZA20',
        },
      },
      {
        id: '9',
        type: 'coupon_received',
        timestamp: '2025-10-30T14:30:00',
        title: 'Recebeu um cupom',
        description: 'Cupom de 20% OFF - BRAZA20',
        campaign: {
          id: 'c03',
          name: 'BRAZA20',
        },
      },
      {
        id: '10',
        type: 'campaign_entered',
        timestamp: '2025-10-25T10:00:00',
        title: 'Entrou em campanha',
        description: 'Cliente adicionado à campanha de recuperação',
        campaign: {
          id: 'c01',
          name: 'Recuperação 30D+',
        },
      },
      {
        id: '11',
        type: 'risk_detected',
        timestamp: '2025-10-20T08:15:00',
        title: 'Cliente em risco',
        description: 'Sem compras há mais de 30 dias',
      },
      {
        id: '13',
        type: 'recovered',
        timestamp: '2025-08-01T10:00:00',
        title: 'Início do contato com o cliente',
        description: 'Primeiro registro no sistema',
      },
    ],
    []
  )

  if (loading) {
    return <LoadingState />
  }

  return (
    <Box
      css={{
        '&::-webkit-scrollbar': {
          width: '0px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      maxH="600px"
      overflowY="auto"
    >
      {/* Lista de eventos com linha vertical */}
      <Flex
        flexDirection="column"
        gap={6}
        position="relative"
      >
        {/* Linha vertical central */}
        <Box
          bg="gray.200"
          bottom="0"
          left="20px"
          position="absolute"
          top="0"
          w="2px"
        />

        {mockEvents.map((event) => (
          <TimelineEventCard
            event={event}
            key={event.id}
          />
        ))}
      </Flex>
    </Box>
  )
}

