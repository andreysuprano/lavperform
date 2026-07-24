import { Box, type BoxProps, useChakraContext } from '@chakra-ui/react'
import { useCallback, useMemo, type CSSProperties, type ReactNode } from 'react'

import { useWhiteLabel } from '@/config'

export type RechartsTheme = {
  /** Resolve um token Chakra `colors.*` para valor CSS (ex.: `blue.solid`, `fg.muted`). */
  color: (token: string) => string
  colorPalette: string
  primary: string
  tooltipStyle: CSSProperties
  gridStroke: string
  axisStroke: string
  cursorFill: string
  labelFill: string
}

/**
 * Tema tipado para Recharts, alinhado aos tokens do Chakra / white-label.
 * Substitui o wrapper `@chakra-ui/charts` (`useChart` / `Chart.Root`).
 */
export function useRechartsTheme(): RechartsTheme {
  const sys = useChakraContext()
  const { colorPalette, colors } = useWhiteLabel()

  const color = useCallback(
    (token: string) => {
      const resolved = sys.token(`colors.${token}`, token)
      return typeof resolved === 'string' ? resolved : String(resolved ?? token)
    },
    [sys]
  )

  return useMemo(() => {
    const primary =
      color(`${colorPalette}.solid`) ||
      color(`${colorPalette}.500`) ||
      colors.primary

    return {
      color,
      colorPalette,
      primary,
      tooltipStyle: {
        borderColor: color('border.muted'),
        backgroundColor: color('bg'),
        color: color('fg'),
        borderRadius: 8,
        fontSize: 12,
      },
      gridStroke: color('border.emphasized'),
      axisStroke: color('fg.muted'),
      cursorFill: color('bg.emphasized'),
      labelFill: color('fg'),
    }
  }, [color, colorPalette, colors.primary])
}

type RechartsFrameProps = BoxProps & {
  children: ReactNode
}

/**
 * Container para gráficos Recharts (substitui `Chart.Root` do Chakra Charts).
 * Aplica estilos de eixo/label e deixa o filho controlar o `ResponsiveContainer`.
 */
export function RechartsFrame({ children, css, ...rest }: RechartsFrameProps) {
  return (
    <Box
      css={[
        {
          width: '100%',
          '& .recharts-cartesian-axis-tick-value': { fill: 'fg.muted' },
          '& .recharts-polar-angle-axis-tick-value': { fill: 'fg.muted' },
          '& .recharts-polar-radius-axis-tick-value': { fill: 'fg.muted' },
          '& .recharts-pie-label-text': { fill: 'fg.muted' },
          '& .recharts-cartesian-axis .recharts-label': {
            fill: 'fg',
            fontWeight: 'medium',
          },
          '& *': { outline: 'none' },
          '& svg': { overflow: 'visible' },
        },
        css,
      ]}
      textStyle="xs"
      {...rest}
    >
      {children}
    </Box>
  )
}
