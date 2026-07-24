import { Box, Card, Heading, Icon, SimpleGrid, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { IconType } from 'react-icons'
import {
  LuBrain,
  LuCalendarSync,
  LuPlug,
  LuRadio,
  LuWallet,
} from 'react-icons/lu'
import { PiMonitorPlay } from 'react-icons/pi'
import { Link as RouterLink } from 'react-router-dom'

import { useWhiteLabel } from '@/config'
import { ACADEMY_MENU_ITEM } from '@/utils/constants/appMenuLinks'

type QuickLink = {
  href: string
  icon: IconType
  label: string
  description: string
}

const QUICK_LINKS: QuickLink[] = [
  {
    label: 'Insights de clientes',
    description: 'Oportunidades da base',
    href: '/customers/insights',
    icon: LuBrain,
  },
  {
    label: 'Campanhas',
    description: 'Fidelização e recorrência',
    href: '/campaigns/recurring-campaigns',
    icon: LuCalendarSync,
  },
  {
    label: 'Canais',
    description: 'WhatsApp e comunicação',
    href: '/channels',
    icon: LuRadio,
  },
  {
    label: 'Integrações',
    description: 'Conecte seus sistemas',
    href: '/integrations',
    icon: LuPlug,
  },
  {
    label: 'Carteira',
    description: 'Créditos e saldo',
    href: '/settings/wallet',
    icon: LuWallet,
  },
  {
    label: ACADEMY_MENU_ITEM.label,
    description: 'Aprenda a vender mais',
    href: ACADEMY_MENU_ITEM.href,
    icon: PiMonitorPlay,
  },
]

function DashboardQuickLinksBase() {
  const { colorPalette } = useWhiteLabel()

  return (
    <Box w="full">
      <Heading
        fontWeight="semibold"
        mb={3}
        size="md"
      >
        Atalhos
      </Heading>
      <SimpleGrid
        columns={{ base: 2, md: 3, xl: 6 }}
        gap={3}
      >
        {QUICK_LINKS.map(({ description, href, icon: LinkIcon, label }) => (
          <Card.Root
            _hover={{
              borderColor: 'colorPalette.solid',
              bg: 'bg.subtle',
            }}
            as={RouterLink}
            colorPalette={colorPalette}
            key={href}
            size="sm"
            to={href}
            transition="border-color 0.15s ease, background 0.15s ease"
          >
            <Card.Body
              alignItems="flex-start"
              gap={3}
              p={4}
            >
              <Box
                bg="colorPalette.subtle"
                borderRadius="md"
                color="colorPalette.fg"
                lineHeight={0}
                p={2.5}
              >
                <Icon boxSize={5}>
                  <LinkIcon />
                </Icon>
              </Box>
              <Box>
                <Text
                  color="fg"
                  fontSize="sm"
                  fontWeight="semibold"
                  lineClamp={1}
                >
                  {label}
                </Text>
                <Text
                  color="fg.muted"
                  fontSize="xs"
                  lineClamp={2}
                  mt={0.5}
                >
                  {description}
                </Text>
              </Box>
            </Card.Body>
          </Card.Root>
        ))}
      </SimpleGrid>
    </Box>
  )
}

const DashboardQuickLinks = memo(
  DashboardQuickLinksBase
) as typeof DashboardQuickLinksBase

export { DashboardQuickLinks }
