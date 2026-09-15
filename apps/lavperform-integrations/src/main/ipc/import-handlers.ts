import { ipcMain, WebContents } from 'electron'
import type { ImportConfig, ImportEvent, ImportStats, LogLevel } from '@shared/types'
import { createEmptyStats } from '@shared/types'
import { IPC } from '@shared/ipc'
import { runLaundrykitImport } from '../importers/laundrykit.importer'
import { runMaxlavImport } from '../importers/maxlav.importer'
import { runSislavImport } from '../importers/sislav.importer'
import type { ImporterContext } from '../importers/types'

interface RunState {
  running: boolean
  cancelled: boolean
}

const state: RunState = { running: false, cancelled: false }

function send(sender: WebContents, event: ImportEvent): void {
  if (!sender.isDestroyed()) {
    sender.send(IPC.importEvent, event)
  }
}

function buildContext(sender: WebContents): ImporterContext {
  return {
    log: (level: LogLevel, message: string) =>
      send(sender, {
        type: 'log',
        entry: { timestamp: new Date().toISOString(), level, message },
      }),
    progress: (stats: ImportStats) => send(sender, { type: 'progress', stats }),
    isCancelled: () => state.cancelled,
  }
}

async function execute(
  config: ImportConfig,
  ctx: ImporterContext,
): Promise<ImportStats> {
  if (config.integration === 'sislav') {
    return runSislavImport(config, ctx)
  }
  if (config.integration === 'maxlav') {
    return runMaxlavImport(config, ctx)
  }
  return runLaundrykitImport(config, ctx)
}

export function registerImportHandlers(): void {
  ipcMain.handle(IPC.startImport, async (event, config: ImportConfig) => {
    if (state.running) {
      throw new Error('Já existe uma importação em andamento.')
    }

    state.running = true
    state.cancelled = false
    const sender = event.sender
    const ctx = buildContext(sender)

    ctx.log(
      'info',
      `Iniciando importação ${config.integration.toUpperCase()} (${config.startDate} → ${config.endDate})${
        config.dryRun ? ' [dry-run]' : ''
      }`,
    )

    let stats: ImportStats = createEmptyStats()
    let errorMessage: string | undefined

    try {
      stats = await execute(config, ctx)
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error)
      ctx.log('error', `Importação interrompida: ${errorMessage}`)
    } finally {
      const cancelled = state.cancelled
      state.running = false
      state.cancelled = false
      send(sender, { type: 'finished', stats, cancelled, error: errorMessage })
    }

    return { ok: !errorMessage }
  })

  ipcMain.handle(IPC.cancelImport, async () => {
    if (state.running) {
      state.cancelled = true
    }
    return { ok: true }
  })
}
