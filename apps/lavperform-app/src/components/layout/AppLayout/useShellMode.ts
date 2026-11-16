import { useEffect, useState } from 'react'

import { type ShellMode,shellModeFromWidth } from './shellMode'

export function useShellMode(): ShellMode {
  const [mode, setMode] = useState<ShellMode>(() =>
    typeof window === 'undefined' ? 'desktop' : shellModeFromWidth(window.innerWidth)
  )

  useEffect(() => {
    const update = () => setMode(shellModeFromWidth(window.innerWidth))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return mode
}
