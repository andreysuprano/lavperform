import { useEffect, useRef } from 'react'
import type { ImportLogEntry, ImportStats } from '@shared/types'

export type RunStatus = 'idle' | 'running' | 'done' | 'cancelled' | 'error'

interface RunPanelProps {
  status: RunStatus
  stats: ImportStats
  hasProgress: boolean
  logs: ImportLogEntry[]
  finishedNote: string | null
  dryRun: boolean
}

const STATUS_META: Record<RunStatus, { label: string; cls: string }> = {
  idle: { label: 'Aguardando', cls: '' },
  running: { label: 'Em execução', cls: 'running' },
  done: { label: 'Concluído', cls: 'done' },
  cancelled: { label: 'Cancelado', cls: 'error' },
  error: { label: 'Erro', cls: 'error' },
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour12: false })
}

export function RunPanel({
  status,
  stats,
  hasProgress,
  logs,
  finishedNote,
  dryRun,
}: RunPanelProps) {
  const consoleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = consoleRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  const meta = STATUS_META[status]
  const running = status === 'running'
  const pct =
    stats.daysTotal > 0
      ? Math.min(100, Math.round((stats.daysProcessed / stats.daysTotal) * 100))
      : 0
  const showIndeterminate = running && !hasProgress

  return (
    <section className="panel">
      <div className="run-head">
        <div>
          <h2 className="panel-title">Progresso</h2>
          <p className="panel-sub" style={{ margin: 0 }}>
            {dryRun ? 'Simulação — nenhum dado é enviado.' : 'Envio para a API aberta.'}
          </p>
        </div>
        <span className={`status-pill ${meta.cls}`}>
          <span className="dot" />
          {meta.label}
        </span>
      </div>

      <div className="progress-track">
        <div
          className={`progress-fill ${showIndeterminate ? 'indeterminate' : ''}`}
          style={{ width: showIndeterminate ? undefined : `${pct}%` }}
        />
      </div>

      <div className="stats-grid">
        <div className="stat accent">
          <div className="value">
            {stats.daysProcessed}/{stats.daysTotal}
          </div>
          <div className="label">Dias</div>
        </div>
        <div className="stat">
          <div className="value">{stats.ordersEligible}</div>
          <div className="label">Elegíveis</div>
        </div>
        <div className="stat">
          <div className="value">{stats.ordersSent}</div>
          <div className="label">Processados</div>
        </div>
        <div className="stat ok">
          <div className="value">{stats.queued}</div>
          <div className="label">Enfileirados</div>
        </div>
        <div className="stat">
          <div className="value">{stats.alreadyReceived}</div>
          <div className="label">Já recebidos</div>
        </div>
        <div className="stat err">
          <div className="value">{stats.errors}</div>
          <div className="label">Erros</div>
        </div>
      </div>

      {stats.clientsLoaded > 0 && (
        <p className="panel-sub" style={{ marginTop: -6 }}>
          {stats.clientsLoaded} cliente(s) no catálogo · {stats.skipped} ignorado(s)
        </p>
      )}

      {finishedNote && (
        <p
          className="panel-sub"
          style={{
            color:
              status === 'error' || status === 'cancelled'
                ? 'var(--danger)'
                : 'var(--success)',
          }}
        >
          {finishedNote}
        </p>
      )}

      <div className="console" ref={consoleRef}>
        {logs.length === 0 ? (
          <div className="console-empty">
            Os registros da importação aparecerão aqui.
          </div>
        ) : (
          logs.map((entry, index) => (
            <div key={index} className={`log-line ${entry.level}`}>
              <span className="ts">{formatTime(entry.timestamp)}</span>
              <span className="msg">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
