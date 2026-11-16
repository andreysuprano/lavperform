import { Box, Button, Center, Icon, Text } from '@chakra-ui/react'
import type { ElementType } from 'react'
import { LuChevronRight, LuDollarSign, LuLogOut, LuMapPin } from 'react-icons/lu'
import { Navigate, useSearchParams } from 'react-router-dom'

import { useColorModeValue } from '@/components/ui/color-mode'
import { useAuth } from '@/context/AuthContext'
import { ACADEMY_MENU_ITEM } from '@/utils/constants/appMenuLinks'

import { ShellLink } from './ShellLink'
import { shellDark } from './shellPalette'
import { initials } from './storeGroups'
import { useAppMenuItems } from './useAppMenuItems'
import { useShellMode } from './useShellMode'

type MenuLink = {
  label: string
  href: string
  icon?: ElementType
  badge?: string
}

type MenuItem = {
  label: string
  href: string
  icon: ElementType
  links?: MenuLink[]
}

type Row = {
  label: string
  href: string
  color: string
  icon?: ElementType
  badge?: string
  section?: boolean
}

const MARKETING: Array<Omit<Row, 'icon'>> = [
  { label: 'Tráfego', href: '/trafego', color: '#2563eb', section: true },
  { label: 'Canais de Comunicação', href: '/channels', color: '#16a34a' },
  { label: 'Agente de IA', href: '/whitelabel/ai-agent', color: '#7c3aed' },
  { label: 'Landing Page', href: '/whitelabel/landing-page', color: '#0891b2', section: true },
]

const OPERATIONS: Array<Omit<Row, 'icon'>> = [
  { label: 'Clima e Tempo', href: '/whitelabel/weather', color: '#f59e0b' },
  { label: 'Integrações', href: '/integrations', color: '#64748b' },
]

const ACCOUNT: Array<Omit<Row, 'icon'>> = [
  { label: 'Ajustes', href: '/settings', color: '#6b7280', section: true },
  { label: 'Carteira', href: '/settings/wallet', color: '#059669' },
  { label: 'Financeiro', href: '/billing', color: '#4f46e5' },
  { label: 'Identidade da marca', href: '/settings/brand-identity', color: '#db2777', badge: 'Novo' },
  { label: 'Minha Página', href: '/my-page', color: '#0ea5e9' },
]

function findMenuItem(items: MenuItem[], href: string) {
  return items.find((item) => item.href === href)
}

function resolveRows(items: MenuItem[], rows: Array<Omit<Row, 'icon'>>): Row[] {
  return rows.flatMap((row): Row[] => {
    if (row.href === '/billing') {
      return [{ ...row, icon: LuDollarSign, section: false }]
    }
    const item = findMenuItem(items, row.href)
    const child = items
      .flatMap((entry) => entry.links ?? [])
      .find((link) => link.href === row.href)
    if (!item && !child && row.href !== '/settings') return []
    return [{
      ...row,
      icon: item?.icon ?? child?.icon,
      badge: row.badge ?? child?.badge,
      section: Boolean(row.section && item?.links?.length),
    }]
  })
}

export function MorePage() {
  const mode = useShellMode()
  const items = useAppMenuItems() as MenuItem[]
  const [params] = useSearchParams()
  if (mode !== 'phone') {
    return <Navigate replace to="/dashboard" />
  }
  const sectionHref = params.get('item')
  if (sectionHref) {
    const section = findMenuItem(items, sectionHref)
    if (section?.links?.length) {
      return (
        <MoreSection
          links={section.links}
          title={section.label}
        />
      )
    }
  }
  return <MoreHome items={items} />
}

function MoreHome({ items }: { items: MenuItem[] }) {
  const { user, companies, signOut } = useAuth()
  const card = useColorModeValue('white', shellDark.card)
  const border = useColorModeValue('#E4E4E7', shellDark.border)
  const muted = useColorModeValue('#71717A', shellDark.muted)
  const text = useColorModeValue('#18181B', 'gray.100')
  const page = useColorModeValue('#F7F7F8', shellDark.background)
  const companyName = user?.companyName || 'Sua lavanderia'
  const admin = items.find((item) => item.href === '/admin')

  return (
    <Box
      bg={page}
      data-testid="more-page"
      mx={-4}
      my={-4}
      p={4}
    >
      <Box
        alignItems="center"
        bg={card}
        borderColor={border}
        borderRadius="12px"
        borderWidth="1px"
        display="flex"
        gap={3}
        mb={3}
        px="14px"
        py={3}
      >
        <Center
          bg="#093A58"
          borderRadius="12px"
          boxSize="44px"
          color="white"
          fontSize="14px"
          fontWeight="bold"
        >
          {initials(companyName)}
        </Center>
        <Box minW={0}>
          <Text
            color={text}
            fontSize="14px"
            fontWeight="semibold"
            truncate
          >
            {companyName}
          </Text>
          <Text
            color={muted}
            fontSize="12px"
            truncate
          >
            {user?.userName}
          </Text>
        </Box>
      </Box>
      <ShellLink
        alignItems="center"
        bg={card}
        borderColor={border}
        borderRadius="10px"
        borderWidth="1px"
        display="flex"
        h="44px"
        justifyContent="space-between"
        mb={4}
        px={3}
        textDecoration="none"
        to="/trocar-loja"
      >
        <Box
          alignItems="center"
          color={text}
          display="flex"
          fontSize="14px"
          gap={2}
        >
          <LuMapPin size={18} />
          Trocar loja · {companies.length} {companies.length === 1 ? 'loja' : 'lojas'}
        </Box>
        <LuChevronRight size={18} />
      </ShellLink>
      <Group
        rows={resolveRows(items, MARKETING)}
        title="Marketing"
      />
      <Group
        rows={resolveRows(items, OPERATIONS)}
        title="Operação"
      />
      <Group
        rows={resolveRows(items, ACCOUNT)}
        title="Conta"
      />
      {admin ? (
        <Group
          rows={(admin.links ?? []).map((link) => ({
            label: link.label,
            href: link.href,
            color: '#093A58',
            icon: link.icon,
          }))}
          title="Admin"
        />
      ) : null}
      <Box pt={2}>
        <RowLink
          color="#093A58"
          href={ACADEMY_MENU_ITEM.href}
          icon={ACADEMY_MENU_ITEM.icon}
          label={ACADEMY_MENU_ITEM.label}
          single
        />
      </Box>
      <Button
        bg={card}
        borderColor={border}
        borderRadius="12px"
        borderWidth="1px"
        color="#DC2626"
        display="flex"
        fontSize="14px"
        fontWeight="semibold"
        gap={3}
        h="52px"
        justifyContent="center"
        mt={3}
        onClick={() => signOut()}
        type="button"
        variant="outline"
        w="full"
      >
        <LuLogOut size={18} />
        Sair
      </Button>
    </Box>
  )
}

function MoreSection({ title, links }: { title: string; links: MenuLink[] }) {
  const card = useColorModeValue('white', shellDark.card)
  const border = useColorModeValue('#E4E4E7', shellDark.border)
  return (
    <Box data-testid="more-section">
      <Text
        color="fg.muted"
        fontSize="12px"
        fontWeight="semibold"
        letterSpacing="0.04em"
        mb={2}
        px={1}
        textTransform="uppercase"
      >
        {title}
      </Text>
      <Box
        bg={card}
        borderColor={border}
        borderRadius="12px"
        borderWidth="1px"
        overflow="hidden"
      >
        {links.map((link, index) => (
          <RowLink
            badge={link.badge}
            color="#64748b"
            divider={index > 0}
            href={link.href}
            icon={link.icon}
            key={link.href}
            label={link.label}
          />
        ))}
      </Box>
    </Box>
  )
}

function Group({ title, rows }: { title: string; rows: Row[] }) {
  const muted = useColorModeValue('#71717A', shellDark.muted)
  const card = useColorModeValue('white', shellDark.card)
  const border = useColorModeValue('#E4E4E7', shellDark.border)
  if (rows.length === 0) return null
  return (
    <Box mb={3}>
      <Text
        color={muted}
        fontSize="12px"
        fontWeight="semibold"
        letterSpacing="0.04em"
        mb={2}
        px={1}
        textTransform="uppercase"
      >
        {title}
      </Text>
      <Box
        bg={card}
        borderColor={border}
        borderRadius="12px"
        borderWidth="1px"
        overflow="hidden"
      >
        {rows.map((row, index) => (
          <RowLink
            badge={row.badge}
            color={row.color}
            divider={index > 0}
            href={row.section ? `/mais/secao?item=${encodeURIComponent(row.href)}` : row.href}
            icon={row.icon}
            key={row.href}
            label={row.label}
          />
        ))}
      </Box>
    </Box>
  )
}

function RowLink({
  href,
  label,
  color,
  icon,
  badge,
  divider,
  single,
}: {
  href: string
  label: string
  color: string
  icon?: ElementType
  badge?: string
  divider?: boolean
  single?: boolean
}) {
  const text = useColorModeValue('#18181B', 'gray.100')
  const line = useColorModeValue('#E4E4E7', shellDark.border)
  const card = useColorModeValue('white', shellDark.card)
  const border = useColorModeValue('#E4E4E7', shellDark.border)
  return (
    <ShellLink
      alignItems="center"
      bg={single ? card : 'transparent'}
      borderColor={single ? border : undefined}
      borderRadius={single ? '12px' : undefined}
      borderWidth={single ? '1px' : undefined}
      display="flex"
      gap={3}
      h="52px"
      minH="44px"
      overflow="hidden"
      position="relative"
      px="14px"
      textDecoration="none"
      to={href}
    >
      {divider ? (
        <Box
          bg={line}
          h="1px"
          left="54px"
          position="absolute"
          right={0}
          top={0}
        />
      ) : null}
      <Center
        bg={color}
        borderRadius="7px"
        boxSize="28px"
        color="white"
        flexShrink={0}
      >
        {icon ? (
          <Icon
            as={icon}
            boxSize="16px"
          />
        ) : (
          <LuLogOut size={16} />
        )}
      </Center>
      <Text
        color={text}
        flex="1"
        fontSize="14px"
        truncate
      >
        {label}
      </Text>
      {badge ? (
        <Box
          bg="#C2410C"
          borderRadius="4px"
          color="white"
          fontSize="10px"
          fontWeight="semibold"
          px="6px"
          py="2px"
        >
          {badge}
        </Box>
      ) : null}
      <Box
        color="fg.muted"
        flexShrink={0}
      >
        <LuChevronRight size={18} />
      </Box>
    </ShellLink>
  )
}

