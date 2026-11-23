import {
  Badge,
  Box,
  Card,
  Flex,
  Heading,
  Icon,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'
import type { ElementType } from 'react'
import { LuActivity, LuArrowRight, LuTag } from 'react-icons/lu'
import { Link as RouterLink } from 'react-router-dom'

type Props = {
  canConfigure: boolean
}

type SetupLink = {
  to: string
  icon: ElementType
  title: string
  description: string
}

const SETUP_LINKS: SetupLink[] = [
  {
    to: '/trafego/pixel',
    icon: LuActivity,
    title: 'Instalar o Pixel da Meta',
    description: 'Registra as visitas das suas páginas para os anúncios.',
  },
  {
    to: '/trafego/gtm',
    icon: LuTag,
    title: 'Conectar o Tag Manager',
    description: 'Carrega o contêiner do Google nas suas páginas.',
  },
]

const FUNNEL = [
  { width: '100%', bg: '#FFF6D4' },
  { width: '68%', bg: '#FFF6D4' },
  { width: '36%', bg: '#FFC800' },
]

const BARS = [38, 54, 46, 72, 60, 84, 68]

function ReportPreview() {
  return (
    <Box
      aria-hidden="true"
      bg="bg.muted"
      borderRadius="xl"
      borderWidth="1px"
      p={4}
      userSelect="none"
    >
      <Stack gap={3}>
        <SimpleGrid
          columns={3}
          gap={3}
        >
          {[0, 1, 2].map((item) => (
            <Box
              bg="bg"
              borderRadius="md"
              borderWidth="1px"
              key={item}
              p={3}
            >
              <Box
                bg="border.emphasized"
                borderRadius="full"
                h={1.5}
                w="55%"
              />
              <Box
                bg="fg.muted"
                borderRadius="full"
                h={3}
                mt={3}
                opacity={0.45}
                w="75%"
              />
            </Box>
          ))}
        </SimpleGrid>
        <Flex
          align="flex-end"
          bg="bg"
          borderRadius="md"
          borderWidth="1px"
          gap={2}
          h={28}
          px={3}
          py={3}
        >
          {BARS.map((height, index) => (
            <Box
              bg={index === BARS.length - 2 ? '#FFC800' : '#FFF6D4'}
              borderRadius="sm"
              flex={1}
              key={index}
              style={{ height: `${height}%` }}
            />
          ))}
        </Flex>
        <Stack
          bg="bg"
          borderRadius="md"
          borderWidth="1px"
          gap={2}
          p={3}
        >
          {FUNNEL.map((step) => (
            <Box
              borderRadius="sm"
              h={4}
              key={step.width}
              style={{ background: step.bg, width: step.width }}
            />
          ))}
        </Stack>
      </Stack>
    </Box>
  )
}

function SetupLinkRow({ link }: { link: SetupLink }) {
  return (
    <Flex
      _hover={{ bg: 'bg.muted' }}
      align="center"
      asChild
      borderRadius="lg"
      borderWidth="1px"
      gap={3}
      p={3}
      transition="background 0.15s ease-out"
    >
      <RouterLink to={link.to}>
        <Flex
          align="center"
          bg="bg.muted"
          borderRadius="md"
          boxSize={9}
          flexShrink={0}
          justify="center"
        >
          <Icon boxSize={5}>
            <link.icon />
          </Icon>
        </Flex>
        <Stack
          flex={1}
          gap={0}
        >
          <Text fontWeight="medium">{link.title}</Text>
          <Text
            color="fg.muted"
            fontSize="sm"
          >
            {link.description}
          </Text>
        </Stack>
        <Icon
          color="fg.muted"
          flexShrink={0}
        >
          <LuArrowRight />
        </Icon>
      </RouterLink>
    </Flex>
  )
}

function TrafficReportEmptyState({ canConfigure }: Props) {
  return (
    <Card.Root>
      <Card.Body p={{ base: 5, md: 8 }}>
        <SimpleGrid
          alignItems="center"
          columns={{ base: 1, lg: 2 }}
          gap={{ base: 6, lg: 10 }}
        >
          <Stack gap={5}>
            <Stack gap={3}>
              <Badge
                alignSelf="flex-start"
                colorPalette="gray"
              >
                Em breve
              </Badge>
              <Heading
                size="xl"
                textWrap="balance"
              >
                Seu relatório de tráfego pago vai aparecer aqui
              </Heading>
              <Text
                color="fg.muted"
                maxW="55ch"
              >
                Estamos preparando o relatório com os resultados dos seus
                anúncios, do clique até a compra.
                {canConfigure
                  ? ' Enquanto ele não chega, deixe a medição das suas páginas pronta.'
                  : ''}
              </Text>
            </Stack>
            {canConfigure && (
              <Stack gap={3}>
                {SETUP_LINKS.map((link) => (
                  <SetupLinkRow
                    key={link.to}
                    link={link}
                  />
                ))}
              </Stack>
            )}
          </Stack>
          <ReportPreview />
        </SimpleGrid>
      </Card.Body>
    </Card.Root>
  )
}

export { TrafficReportEmptyState }
