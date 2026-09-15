import type { ImportStats, LogLevel } from '@shared/types'

export interface ImporterContext {
  log: (level: LogLevel, message: string) => void
  progress: (stats: ImportStats) => void
  isCancelled: () => boolean
}
