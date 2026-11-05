import { Flex } from '@chakra-ui/react'
import { NavLink } from 'react-router-dom'

import { useShellMode } from '@/components/layout/AppLayout/useShellMode'

const LINKS = [
  { href: '/social/generator', label: 'Social Media' },
  { href: '/social/calendario', label: 'Calendário' },
  { href: '/social/google', label: 'Google' },
]

export function SocialPhoneLinks() {
  const phone = useShellMode() === 'phone'
  if (!phone) return null
  return (
    <Flex
      gap={2}
      wrap="wrap"
    >
      {LINKS.map((link) => (
        <NavLink
          key={link.href}
          style={({ isActive }) => ({
            color: isActive ? '#093A58' : '#71717A',
            fontWeight: 600,
            fontSize: 14,
            minHeight: 44,
            display: 'inline-flex',
            alignItems: 'center',
          })}
          to={link.href}
        >
          {link.label}
        </NavLink>
      ))}
    </Flex>
  )
}
