import { Box } from '@chakra-ui/react'
import { NavLink, useLocation } from 'react-router-dom'

import { useColorModeValue } from '@/components/ui/color-mode'

import { useShellMode } from './useShellMode'

const SECTIONS = [
  { label: 'Branding', href: '/whitelabel/landing-page/branding' },
  { label: 'Banner', href: '/whitelabel/landing-page/hero' },
  { label: 'Serviços', href: '/whitelabel/landing-page/services' },
  { label: 'Localização', href: '/whitelabel/landing-page/location' },
  { label: 'FAQ', href: '/whitelabel/landing-page/faq' },
  { label: 'Avaliações', href: '/whitelabel/landing-page/testimonials' },
  { label: 'CTA', href: '/whitelabel/landing-page/cta' },
  { label: 'Rodapé', href: '/whitelabel/landing-page/footer' },
]

export function LandingSectionTabs() {
  const phone = useShellMode() === 'phone'
  const { pathname } = useLocation()
  const activeBg = useColorModeValue('#E8F6FD', 'rgba(123,201,241,0.16)')
  const activeText = useColorModeValue('#093A58', '#7BC9F1')
  const idle = useColorModeValue('#3F3F46', 'gray.300')

  if (!phone) return null

  return (
    <Box
      aria-label="Seções da landing"
      as="nav"
      display="flex"
      gap={2}
      mb={4}
      overflowX="auto"
      pb={1}
    >
      {SECTIONS.map((section) => {
        const selected = pathname.startsWith(section.href)
        return (
          <Box
            alignItems="center"
            asChild
            bg={selected ? activeBg : 'transparent'}
            borderRadius="full"
            color={selected ? activeText : idle}
            display="flex"
            flexShrink={0}
            fontSize="14px"
            fontWeight="medium"
            h="44px"
            key={section.href}
            px={3}
          >
            <NavLink to={section.href}>{section.label}</NavLink>
          </Box>
        )
      })}
    </Box>
  )
}
