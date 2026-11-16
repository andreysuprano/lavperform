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
import { Fragment, useMemo, useRef, useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuPlus } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'

import type { PostStatus, ScheduledPost } from '@/types'

import {
  addDays,
  addMonths,
  dateKey,
  formatWhen,
  monthLabel,
  monthWeeks,
  saoPauloClock,
  WEEK_SLOTS,
  weekContaining,
  weekdayLabels,
  weekRangeLabel,
  weekSlot,
} from './monthGrid'

const STATUS: Record<Exclude<PostStatus, 'CANCELLED'>, { label: string; bg: string; color: string }> = {
  SCHEDULED: { label: 'Agendado', bg: '#E0F2FE', color: '#075985' },
  PUBLISHING: { label: 'Publicando', bg: '#E0F2FE', color: '#075985' },
  PUBLISHED: { label: 'Publicado', bg: '#ECFDF3', color: '#027A48' },
  FAILED: { label: 'Falhou', bg: '#FEF2F2', color: '#B91C1C' },
}

const CHANNEL_LABEL: Record<string, string> = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  GOOGLE_BUSINESS: 'Google',
}

const CHANNEL_SHORT: Record<string, string> = {
  FACEBOOK: 'FB',
  INSTAGRAM: 'IG',
  GOOGLE_BUSINESS: 'Google',
}

const WEEK_TONE: Record<
  Exclude<PostStatus, 'CANCELLED'>,
  { bg: string; color: string }
> = {
  SCHEDULED: { bg: '#DBEAFE', color: '#1D4ED8' },
  PUBLISHING: { bg: '#DBEAFE', color: '#1D4ED8' },
  PUBLISHED: { bg: '#DCFCE7', color: '#15803D' },
  FAILED: { bg: '#FEE2E2', color: '#B91C1C' },
}

export function PostCalendar({
  posts,
  phone,
  now,
  onSave,
  onCancel,
  onRetry,
}: {
  posts: ScheduledPost[]
  phone?: boolean
  now?: Date
  onSave: (post: ScheduledPost, input: { caption: string; scheduledAt: string }) => Promise<void>
  onCancel: (post: ScheduledPost) => Promise<void>
  onRetry: (post: ScheduledPost) => Promise<void>
}) {
  const navigate = useNavigate()
  const today = now ?? new Date()
  const todayKey = dateKey(today.toISOString())
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    monthIndex: today.getMonth(),
  })
  const [weekAnchor, setWeekAnchor] = useState(todayKey)
  const [view, setView] = useState<'month' | 'week' | 'list'>(phone ? 'list' : 'month')
  const [selected, setSelected] = useState<ScheduledPost | null>(null)
  const [editing, setEditing] = useState(false)
  const [reschedule, setReschedule] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const confirmCancelRef = useRef(false)
  confirmCancelRef.current = confirmCancel
  const [caption, setCaption] = useState('')
  const [when, setWhen] = useState('')
  const weeks = useMemo(
    () => monthWeeks(cursor.year, cursor.monthIndex),
    [cursor.monthIndex, cursor.year]
  )
  const anchor = `${cursor.year}-${String(cursor.monthIndex + 1).padStart(2, '0')}-01`
  const week = weekContaining(weekAnchor)
  const shiftWeek = (direction: number) => {
    const start = addDays(week[0].date, direction * 7)
    const [year, month] = start.split('-').map(Number)
    setWeekAnchor(start)
    setCursor({ year, monthIndex: month - 1 })
  }
  const openWeek = () => {
    const prefix = anchor.slice(0, 7)
    if (!week.some((cell) => cell.date.startsWith(prefix))) {
      setWeekAnchor(todayKey.startsWith(prefix) ? todayKey : anchor)
    }
    setView('week')
  }
  const byDay = new Map<string, ScheduledPost[]>()
  for (const post of posts) {
    const key = dateKey(post.scheduledAt)
    byDay.set(key, [...(byDay.get(key) ?? []), post])
  }

  const open = (post: ScheduledPost) => {
    setSelected(post)
    setCaption(post.caption)
    setWhen(post.scheduledAt.slice(0, 16))
    setEditing(false)
    setReschedule(false)
    setConfirmCancel(false)
  }

  const visibleDays =
    view === 'week' ? week : view === 'list' ? weeks.flat().filter((cell) => cell.inMonth) : []

  return (
    <Stack gap={4}>
      <Flex
        align="center"
        gap={2}
        justify="space-between"
        wrap="wrap"
      >
        <Flex
          align="center"
          gap={1}
        >
          <Button
            aria-label={view === 'week' ? 'Semana anterior' : 'Mês anterior'}
            onClick={() =>
              view === 'week'
                ? shiftWeek(-1)
                : setCursor((current) => addMonths(current.year, current.monthIndex, -1))
            }
            variant="ghost"
          >
            <LuChevronLeft />
          </Button>
          <Text
            fontWeight="semibold"
            minW="180px"
            textAlign="center"
          >
            {view === 'week' ? weekRangeLabel(week) : monthLabel(cursor.year, cursor.monthIndex)}
          </Text>
          <Button
            aria-label={view === 'week' ? 'Próxima semana' : 'Próximo mês'}
            onClick={() =>
              view === 'week'
                ? shiftWeek(1)
                : setCursor((current) => addMonths(current.year, current.monthIndex, 1))
            }
            variant="ghost"
          >
            <LuChevronRight />
          </Button>
          <Button
            onClick={() => {
              const key = dateKey((now ?? new Date()).toISOString())
              const [year, month] = key.split('-').map(Number)
              setCursor({ year, monthIndex: month - 1 })
              setWeekAnchor(key)
            }}
            variant="ghost"
          >
            Hoje
          </Button>
        </Flex>
        <Flex
          align="center"
          gap={3}
          wrap="wrap"
        >
          <Flex
            display={{ base: 'none', md: 'flex' }}
            gap={3}
          >
            {(['SCHEDULED', 'PUBLISHED', 'FAILED'] as const).map((status) => (
              <Flex
                align="center"
                bg={STATUS[status].bg}
                borderRadius="full"
                color={STATUS[status].color}
                fontSize="xs"
                gap={2}
                key={status}
                px={2}
                py={1}
              >
                <Box
                  bg={STATUS[status].color}
                  borderRadius="full"
                  boxSize="6px"
                />
                {STATUS[status].label}
              </Flex>
            ))}
          </Flex>
          <Flex
            bg="bg.muted"
            borderRadius="lg"
            p={1}
          >
            {(phone
              ? (['list', 'week', 'month'] as const)
              : (['month', 'week'] as const)
            ).map((item) => (
              <Button
                bg={view === item ? 'bg' : 'transparent'}
                key={item}
                onClick={() => (item === 'week' ? openWeek() : setView(item))}
                size="sm"
                variant="ghost"
              >
                {item === 'list' ? 'Lista' : item === 'week' ? 'Semana' : 'Mês'}
              </Button>
            ))}
          </Flex>
          <Button
            bg="#093A58"
            color="white"
            onClick={() => navigate('/social/generator')}
          >
            <LuPlus />
            Novo post
          </Button>
        </Flex>
      </Flex>

      {view === 'month' ? (
        <Box
          borderColor="border"
          borderRadius="xl"
          borderWidth="1px"
          data-testid="month-grid"
          data-week-count={weeks.length}
          display="grid"
          gridTemplateColumns="repeat(7, minmax(0, 1fr))"
          overflow="hidden"
        >
          {weekdayLabels().map((label) => (
            <Text
              color="fg.muted"
              fontSize="sm"
              key={label}
              p={2}
            >
              {label}
            </Text>
          ))}
          {weeks.flat().map((cell) => (
            <Box
              borderColor="border"
              borderTopWidth="1px"
              key={cell.date}
              minH="96px"
              opacity={cell.inMonth ? 1 : 0.45}
              p={1.5}
            >
              <Text fontSize="sm">{cell.day}</Text>
              <Stack gap={1}>
                {(byDay.get(cell.date) ?? []).slice(0, 3).map((post) => (
                  <PostChip
                    key={post.id}
                    onClick={() => open(post)}
                    post={post}
                  />
                ))}
              </Stack>
            </Box>
          ))}
        </Box>
      ) : null}

      {view === 'week' ? (
        <Box
          data-testid="week-grid"
          overflowX="auto"
        >
          <Box
            bg="bg"
            borderColor="border"
            borderRadius="xl"
            borderWidth="1px"
            display="grid"
            gridTemplateColumns="64px repeat(7, minmax(96px, 1fr))"
            minW={{ base: '760px', md: '100%' }}
            overflow="hidden"
          >
            <Box
              bg="bg.muted"
              borderBottomWidth="1px"
              borderColor="border"
              borderRightWidth="1px"
            />
            {week.map((cell, index) => {
              const isToday = cell.date === todayKey
              return (
                <Flex
                  bg="bg.muted"
                  borderBottomWidth="1px"
                  borderColor="border"
                  borderRightWidth="1px"
                  direction="column"
                  gap="4px"
                  key={cell.date}
                  minH="104px"
                  p="6px"
                >
                  <Text
                    color={isToday ? '#093A58' : 'fg'}
                    fontSize="12px"
                    fontWeight="semibold"
                  >
                    {weekdayLabels()[index]}
                  </Text>
                  <Text
                    color={isToday ? '#093A58' : 'fg'}
                    fontSize="18px"
                    fontWeight="semibold"
                    textAlign="center"
                    w="full"
                  >
                    {cell.day}
                  </Text>
                </Flex>
              )
            })}
            {WEEK_SLOTS.map((slot) => (
              <Fragment key={slot}>
                <Flex
                  borderBottomWidth="1px"
                  borderColor="border"
                  borderRightWidth="1px"
                  minH="110px"
                  p="6px"
                >
                  <Text
                    color="fg.muted"
                    fontSize="12px"
                  >
                    {slot}
                  </Text>
                </Flex>
                {week.map((cell) => (
                  <Flex
                    borderBottomWidth="1px"
                    borderColor="border"
                    borderRightWidth="1px"
                    data-slot={`${cell.date}|${slot}`}
                    direction="column"
                    gap="4px"
                    key={`${cell.date}-${slot}`}
                    minH="110px"
                    p="6px"
                  >
                    {(byDay.get(cell.date) ?? [])
                      .filter((post) => weekSlot(post.scheduledAt) === slot)
                      .map((post) => (
                        <WeekCard
                          key={post.id}
                          onClick={() => open(post)}
                          post={post}
                        />
                      ))}
                  </Flex>
                ))}
              </Fragment>
            ))}
          </Box>
        </Box>
      ) : null}

      {view === 'list' ? (
        <Stack gap={3}>
          {visibleDays
            .filter((cell) => (byDay.get(cell.date) ?? []).length)
            .map((cell) => (
              <Box key={cell.date}>
                <Text
                  color="fg.muted"
                  fontSize="sm"
                  mb={1}
                >
                  {cell.day}
                </Text>
                <Stack gap={2}>
                  {(byDay.get(cell.date) ?? []).map((post) => (
                    <Button
                      borderColor="border"
                      borderRadius="lg"
                      borderWidth="1px"
                      display="flex"
                      gap={3}
                      h="auto"
                      justifyContent="flex-start"
                      key={post.id}
                      onClick={() => open(post)}
                      p={3}
                      textAlign="left"
                      variant="outline"
                      w="full"
                    >
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        w="48px"
                      >
                        {new Intl.DateTimeFormat('pt-BR', {
                          timeZone: 'America/Sao_Paulo',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(post.scheduledAt))}
                      </Text>
                      <Box flex={1}>
                        <Text fontWeight="medium">
                          {post.headline || post.caption.slice(0, 48)}
                        </Text>
                        <Text
                          color="fg.muted"
                          fontSize="xs"
                        >
                          {post.channels.map((channel) => CHANNEL_LABEL[channel] ?? channel).join(' · ')}
                        </Text>
                      </Box>
                      <StatusPill status={post.status} />
                    </Button>
                  ))}
                </Stack>
              </Box>
            ))}
          {posts.length === 0 ? (
            <Text color="fg.muted">Nenhum post neste período.</Text>
          ) : null}
        </Stack>
      ) : null}

      <Dialog.Root
        onOpenChange={(details) => {
          if (!details.open && !confirmCancelRef.current) setSelected(null)
        }}
        open={Boolean(selected) && !confirmCancel}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="420px">
              {selected ? (
                <>
                  <Dialog.Header>
                    <Dialog.Title>Detalhes do post</Dialog.Title>
                  </Dialog.Header>
                  <Dialog.Body>
                    <Flex
                      align="center"
                      gap={2}
                    >
                      <StatusPill status={selected.status} />
                      <Text fontSize="sm">{formatWhen(selected.scheduledAt)}</Text>
                    </Flex>
                    <Text
                      fontWeight="semibold"
                      mt={3}
                    >
                      {selected.headline || 'Post'}
                    </Text>
                    {editing ? (
                      <Textarea
                        mt={2}
                        onChange={(event) => setCaption(event.target.value)}
                        value={caption}
                      />
                    ) : (
                      <Text
                        color="fg.muted"
                        fontSize="sm"
                        mt={2}
                      >
                        {selected.caption}
                      </Text>
                    )}
                    <Text
                      fontSize="sm"
                      mt={3}
                    >
                      {selected.channels.map((channel) => CHANNEL_LABEL[channel] ?? channel).join(' · ')}
                    </Text>
                    {selected.lastError ? (
                      <Text
                        color="red.600"
                        fontSize="sm"
                        mt={2}
                      >
                        {selected.lastError}
                      </Text>
                    ) : null}
                    {reschedule ? (
                      <Input
                        mt={3}
                        onChange={(event) => setWhen(event.target.value)}
                        type="datetime-local"
                        value={when}
                      />
                    ) : null}
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Flex
                      gap={2}
                      wrap="wrap"
                    >
                    {selected.status === 'SCHEDULED' ? (
                      <>
                        <Button
                          onClick={() => setEditing(true)}
                          variant="outline"
                        >
                          Editar
                        </Button>
                        <Button
                          onClick={() => setReschedule(true)}
                          variant="outline"
                        >
                          Reagendar
                        </Button>
                        <Button
                          onClick={() => setConfirmCancel(true)}
                          variant="outline"
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : null}
                    {selected.status === 'FAILED' ? (
                      <Button
                        bg="#093A58"
                        color="white"
                        onClick={() => onRetry(selected).then(() => setSelected(null))}
                      >
                        Tentar de novo
                      </Button>
                    ) : null}
                    {editing || reschedule ? (
                      <Button
                        bg="#093A58"
                        color="white"
                        onClick={() =>
                          onSave(selected, {
                            caption,
                            scheduledAt: new Date(when).toISOString(),
                          }).then(() => setSelected(null))
                        }
                      >
                        Salvar
                      </Button>
                    ) : null}
                    </Flex>
                  </Dialog.Footer>
                </>
              ) : null}
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <Dialog.Root
        onOpenChange={(details) => {
          if (!details.open) setConfirmCancel(false)
        }}
        open={confirmCancel}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="400px">
              <Dialog.Body py={6}>
                <Dialog.Title>Cancelar este post?</Dialog.Title>
                <Text
                  color="fg.muted"
                  mt={2}
                >
                  Ele sai da fila e não será publicado.
                </Text>
              </Dialog.Body>
              <Dialog.Footer gap={2}>
                <Button
                  onClick={() => setConfirmCancel(false)}
                  variant="ghost"
                >
                  Voltar
                </Button>
                <Button
                  bg="#B91C1C"
                  color="white"
                  onClick={() => {
                    if (!selected) return
                    onCancel(selected).then(() => {
                      setConfirmCancel(false)
                      setSelected(null)
                    })
                  }}
                >
                  Cancelar post
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Stack>
  )
}

function StatusPill({ status }: { status: PostStatus }) {
  if (status === 'CANCELLED') return null
  const tone = STATUS[status]
  return (
    <Text
      bg={tone.bg}
      borderRadius="full"
      color={tone.color}
      fontSize="xs"
      px={2}
      py={1}
      w="fit-content"
    >
      {tone.label}
    </Text>
  )
}

function WeekCard({ post, onClick }: { post: ScheduledPost; onClick: () => void }) {
  if (post.status === 'CANCELLED') return null
  const tone = WEEK_TONE[post.status]
  const title = post.headline || post.caption
  return (
    <Flex
      as="button"
      bg={tone.bg}
      borderRadius="8px"
      gap="6px"
      onClick={onClick}
      p="6px"
      textAlign="left"
      type="button"
      w="full"
    >
      <Box
        bg="linear-gradient(180deg, #BEE6FA 0%, #1E6FA8 70%, #093A58 100%)"
        borderRadius="8px"
        flexShrink={0}
        h="28px"
        w="28px"
      />
      <Box minW={0}>
        <Text
          color={tone.color}
          fontSize="11px"
          fontWeight="semibold"
          lineClamp={2}
        >
          {title}
        </Text>
        <Text
          color={tone.color}
          fontSize="10px"
        >
          {saoPauloClock(post.scheduledAt)} ·{' '}
          {post.channels.map((channel) => CHANNEL_SHORT[channel] ?? channel).join(' ')}
        </Text>
      </Box>
    </Flex>
  )
}

function PostChip({ post, onClick }: { post: ScheduledPost; onClick: () => void }) {
  const tone = post.status === 'CANCELLED' ? null : STATUS[post.status]
  if (!tone) return null
  return (
    <Button
      bg={tone.bg}
      color={tone.color}
      fontSize="xs"
      h="auto"
      justifyContent="flex-start"
      minW={0}
      onClick={onClick}
      px={1.5}
      py={0.5}
      size="xs"
      truncate
      variant="ghost"
      w="full"
    >
      {post.headline || post.caption.slice(0, 22)}
    </Button>
  )
}
