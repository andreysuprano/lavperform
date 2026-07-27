"use client"

import { Box } from "@chakra-ui/react"
import { ReactNode } from "react"

interface BrandThemeProps {
  children: ReactNode
  primaryColor: string
  secondaryColor: string
  tertiaryColor: string
}

/**
 * Componente que aplica as cores da marca como CSS variables
 * Essas variáveis podem ser usadas em todo o template
 */
export function BrandTheme({
  children,
  primaryColor,
  secondaryColor,
  tertiaryColor,
}: BrandThemeProps) {
  return (
    <Box
      style={{
        ["--brand-primary" as string]: primaryColor,
        ["--brand-secondary" as string]: secondaryColor,
        ["--brand-tertiary" as string]: tertiaryColor,
      }}
    >
      {children}
    </Box>
  )
}
