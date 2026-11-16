import {
  Box,
  Button,
  Dialog,
  Flex,
  Input,
  Portal,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { LuCalendar, LuClock } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'

import type { PublishChannel, ScheduleSlot, SocialConnection } from '@/types'

import { formatWhen } from './monthGrid'

const NETWORKS: Array<{
  id: PublishChannel
  label: string
  mark: string
  provider: SocialConnection['provider']
}> = [
  { id: 'FACEBOOK', label: 'Facebook', mark: 'f', provider: 'META' },
  { id: 'INSTAGRAM', label: 'Instagram', mark: 'IG', provider: 'META' },
  { id: 'GOOGLE_BUSINESS', label: 'Google', mark: 'G', provider: 'GOOGLE_BUSINESS' },
]

function saoPauloFields(iso: string) {
  const date = new Date(iso)
  const key = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
  return { key, clock }
}

function connected(connections: SocialConnection[], channel: PublishChannel) {
  const meta = connections.find((item) => item.provider === 'META')
  const google = connections.find((item) => item.provider === 'GOOGLE_BUSINESS')
  if (channel === 'GOOGLE_BUSINESS') return google?.status === 'CONNECTED'
  if (meta?.status !== 'CONNECTED') return false
  if (channel === 'FACEBOOK') return Boolean(meta.accountName)
  return Boolean(meta.accountDetail?.includes('Instagram'))
}

export function ScheduleComposer({
  connections,
  slots,
  caption,
  pending,
  onSubmit,
}: {
  connections: SocialConnection[]
  slots: ScheduleSlot[]
  caption: string
  pending?: boolean
  onSubmit: (input: {
    publishNow: boolean
    scheduledAt?: string
    channels: PublishChannel[]
    caption: string
  }) => Promise<{ when: string; channels: string[] } | void>
}) {
  const navigate = useNavigate()
  const best = slots.find((slot) => slot.best) ?? slots[0]
  const [mode, setMode] = useState<'now' | 'schedule'>('schedule')
  const [slotId, setSlotId] = useState(best?.id ?? '')
  const initial = best ? saoPauloFields(best.at) : null
  const [date, setDate] = useState(initial?.key ?? '')
  const [time, setTime] = useState(initial?.clock ?? '18:30')
  const [text, setText] = useState(caption)
  const [picked, setPicked] = useState<PublishChannel[]>(['FACEBOOK', 'INSTAGRAM'])
  const [done, setDone] = useState<{ when: string; channels: string[] } | null>(null)

  const selectedSlot = slots.find((slot) => slot.id === slotId)
  const whenLabel = useMemo(() => {
    if (mode === 'now') return 'agora'
    if (selectedSlot) return selectedSlot.label.replace(' · melhor horário', '')
    if (!date || !time) return 'o horário escolhido'
    return formatWhen(`${date}T${time}:00`)
  }, [date, mode, selectedSlot, time])

  const toggle = (channel: PublishChannel) => {
    setPicked((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel]
    )
  }

  const submit = async () => {
    const channels = picked.filter((channel) => connected(connections, channel))
    const scheduledAt = selectedSlot?.at || (date && time ? new Date(`${date}T${time}:00`).toISOString() : undefined)
    const result = await onSubmit({
      publishNow: mode === 'now',
      scheduledAt,
      channels,
      caption: text,
    })
    if (result) setDone(result)
  }

  return (
    <Stack
      bg="bg"
      borderColor="border"
      borderRadius="xl"
      borderWidth="1px"
      gap={4}
      p={4}
    >
      <Box>
        <Text
          fontSize="sm"
          fontWeight="medium"
          mb={2}
        >
          Legenda
        </Text>
        <Textarea
          onChange={(event) => setText(event.target.value)}
          rows={3}
          value={text}
        />
      </Box>
      <Box>
        <Text
          fontSize="sm"
          fontWeight="medium"
          mb={2}
        >
          Quando publicar?
        </Text>
        <Flex
          bg="bg.muted"
          borderRadius="lg"
          p={1}
        >
          {([
            ['now', 'Publicar agora'],
            ['schedule', 'Agendar'],
          ] as const).map(([value, label]) => (
            <Button
              bg={mode === value ? 'bg' : 'transparent'}
              flex={1}
              key={value}
              onClick={() => setMode(value)}
              variant="ghost"
            >
              {label}
            </Button>
          ))}
        </Flex>
      </Box>
      {mode === 'schedule' ? (
        <Box>
          <Text
            fontSize="sm"
            fontWeight="medium"
            mb={2}
          >
            Dia e hora
          </Text>
          <Flex gap={2}>
            <Flex
              align="center"
              borderColor="border"
              borderRadius="lg"
              borderWidth="1px"
              flex={1}
              gap={2}
              px={3}
            >
              <LuCalendar />
              <Input
                aria-label="Dia"
                border="0"
                onChange={(event) => {
                  setDate(event.target.value)
                  setSlotId('')
                }}
                type="date"
                value={date}
              />
            </Flex>
            <Flex
              align="center"
              borderColor="border"
              borderRadius="lg"
              borderWidth="1px"
              gap={2}
              px={3}
              w="140px"
            >
              <LuClock />
              <Input
                aria-label="Hora"
                border="0"
                onChange={(event) => {
                  setTime(event.target.value)
                  setSlotId('')
                }}
                type="time"
                value={time}
              />
            </Flex>
          </Flex>
          <Flex
            gap={2}
            mt={2}
            wrap="wrap"
          >
            {slots.map((slot) => (
              <Button
                bg={slotId === slot.id ? '#E6F5FD' : 'transparent'}
                borderColor={slotId === slot.id ? '#093A58' : 'border'}
                borderWidth="1px"
                key={slot.id}
                onClick={() => {
                  setSlotId(slot.id)
                  const fields = saoPauloFields(slot.at)
                  setDate(fields.key)
                  setTime(fields.clock)
                }}
                size="sm"
                variant="outline"
              >
                {slot.label}
              </Button>
            ))}
          </Flex>
        </Box>
      ) : null}
      <Box>
        <Text
          fontSize="sm"
          fontWeight="medium"
          mb={2}
        >
          Onde publicar?
        </Text>
        <Stack gap={2}>
          {NETWORKS.map((network) => {
            const ready = connected(connections, network.id)
            const checked = ready && picked.includes(network.id)
            return (
              <Flex
                align="center"
                borderColor="border"
                borderRadius="lg"
                borderWidth="1px"
                gap={3}
                key={network.id}
                px={3}
                py={2}
              >
                <Button
                  aria-checked={checked}
                  bg={checked ? '#093A58' : 'transparent'}
                  borderColor={checked ? '#093A58' : 'border'}
                  borderRadius="md"
                  borderWidth="1px"
                  boxSize="22px"
                  color="white"
                  minW="22px"
                  onClick={() => {
                    if (ready) toggle(network.id)
                  }}
                  p={0}
                  role="checkbox"
                  variant="outline"
                >
                  {checked ? '✓' : ''}
                </Button>
                <Flex
                  align="center"
                  bg="#093A58"
                  borderRadius="md"
                  boxSize="28px"
                  color="white"
                  fontSize="xs"
                  fontWeight="bold"
                  justify="center"
                >
                  {network.mark}
                </Flex>
                <Text flex={1}>{network.label}</Text>
                {ready ? null : (
                  <Button
                    color="#093A58"
                    onClick={() => navigate('/integrations')}
                    size="xs"
                    variant="ghost"
                  >
                    Conectar
                  </Button>
                )}
              </Flex>
            )
          })}
        </Stack>
      </Box>
      <Flex justify="flex-end">
        <Button
          bg="#093A58"
          color="white"
          disabled={!text.trim() || !picked.length}
          loading={pending}
          onClick={submit}
        >
          {mode === 'now' ? 'Publicar agora' : `Agendar para ${whenLabel}`}
        </Button>
      </Flex>
      <Dialog.Root
        onOpenChange={(details) => {
          if (!details.open) setDone(null)
        }}
        open={Boolean(done)}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="440px">
              <Dialog.Body
                py={8}
                textAlign="center"
              >
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                >
                  {mode === 'now' ? 'Post enviado!' : 'Post agendado!'}
                </Text>
                <Text
                  color="fg.muted"
                  mt={2}
                >
                  {mode === 'now'
                    ? `Estamos publicando agora no ${done?.channels.join(' e ')}.`
                    : `Vai sair ${done?.when} no ${done?.channels.join(' e ')}.`}
                </Text>
              </Dialog.Body>
              <Dialog.Footer gap={2}>
                <Button
                  onClick={() => navigate('/social/generator')}
                  variant="ghost"
                >
                  Criar outro post
                </Button>
                <Button
                  bg="#093A58"
                  color="white"
                  onClick={() => navigate('/social/calendario')}
                >
                  Ver no calendário
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Stack>
  )
}
