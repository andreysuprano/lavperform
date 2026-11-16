import { describe, expect, it } from 'vitest'

import {
  isHiddenMenuHref,
  MENU_ITEMS,
  visibleMenuItems,
} from '@/utils/constants/appMenuLinks'

describe('menu de Redes Sociais oculto', () => {
  it('mantém o item definido e o tira da navegação', () => {
    const social = MENU_ITEMS.find((item) => item.href === '/social')

    expect(social).toMatchObject({
      label: 'Redes Sociais',
      href: '/social',
      links: [
        { label: 'Social Media', href: '/social/generator' },
        { label: 'Calendário de posts', href: '/social/calendario' },
        { label: 'Google Meu Negócio', href: '/social/google' },
      ],
    })
    expect(visibleMenuItems(MENU_ITEMS).map((item) => item.href)).not.toContain(
      '/social'
    )
    expect(isHiddenMenuHref('/social')).toBe(true)
    expect(isHiddenMenuHref('/social/generator')).toBe(true)
    expect(isHiddenMenuHref('/dashboard')).toBe(false)
  })
})
