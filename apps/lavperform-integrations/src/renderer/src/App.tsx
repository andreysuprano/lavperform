import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createEmptyStats,
  DEFAULT_LAUNDRYKIT_URL,
  DEFAULT_MAXLAV_API_URL,
  DEFAULT_PUBLIC_API_URL,
  DEFAULT_SISLAV_API_URL,
  type ImportConfig,
  type ImportLogEntry,
  type ImportStats,
  type IntegrationId,
} from '@shared/types'
import logo from './assets/logo.png'
import { ConfigForm, type FormState } from './components/ConfigForm'
import { RunPanel, type RunStatus } from './components/RunPanel'

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function initialForm(): FormState {
  return {
    integration: 'maxlav',
    apiKey: '',
    publicApiUrl: DEFAULT_PUBLIC_API_URL,
    startDate: isoDaysAgo(30),
    endDate: isoDaysAgo(0),
    dryRun: false,
    sendDelayMs: 200,
    dayDelayMs: 500,
    fetchRetries: 3,
    maxlavApiToken: '',
    maxlavApiUrl: DEFAULT_MAXLAV_API_URL,
    laundrykitAccessToken: '',
    laundrykitStoreId: '',
    laundrykitUrl: DEFAULT_LAUNDRYKIT_URL,
    sislavSessionToken: '',
    sislavOrganizationId: '',
    sislavLaundryId: '',
    sislavApiUrl: DEFAULT_SISLAV_API_URL,
  }
}

function buildConfig(form: FormState): ImportConfig {
  const base = {
    apiKey: form.apiKey.trim(),
    publicApiUrl: form.publicApiUrl.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    dryRun: form.dryRun,
    sendDelayMs: Number(form.sendDelayMs) || 0,
    dayDelayMs: Number(form.dayDelayMs) || 0,
    fetchRetries: Number(form.fetchRetries) || 1,
  }

  if (form.integration === 'maxlav') {
    return {
      ...base,
      integration: 'maxlav',
      maxlavApiToken: form.maxlavApiToken.trim(),
      maxlavApiUrl: form.maxlavApiUrl.trim(),
    }
  }

  if (form.integration === 'sislav') {
    return {
      ...base,
      integration: 'sislav',
      sislavSessionToken: form.sislavSessionToken.trim(),
      sislavOrganizationId: form.sislavOrganizationId.trim(),
      sislavLaundryId: form.sislavLaundryId.trim(),
      sislavApiUrl: form.sislavApiUrl.trim(),
    }
  }

  return {
    ...base,
    integration: 'laundrykit',
    laundrykitAccessToken: form.laundrykitAccessToken.trim(),
    laundrykitStoreId: form.laundrykitStoreId.trim(),
    laundrykitUrl: form.laundrykitUrl.trim(),
  }
}

function validate(form: FormState): string | null {
  if (!form.apiKey.trim()) return 'Informe a API key da LavPerform.'
  if (!form.publicApiUrl.trim()) return 'Informe a URL da API aberta.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.startDate)) return 'Data inicial inválida.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.endDate)) return 'Data final inválida.'
  if (form.startDate > form.endDate)
    return 'A data inicial deve ser anterior ou igual à final.'

  if (form.integration === 'maxlav') {
    if (!form.maxlavApiToken.trim()) return 'Informe o token da API MaxLav.'
    if (!form.maxlavApiUrl.trim()) return 'Informe a URL da API MaxLav.'
  } else if (form.integration === 'sislav') {
    if (!form.sislavSessionToken.trim())
      return 'Informe o session token SisLav.'
    if (!form.sislavOrganizationId.trim())
      return 'Informe o Organization ID SisLav.'
    if (!form.sislavLaundryId.trim()) return 'Informe o Laundry ID SisLav.'
    if (!form.sislavApiUrl.trim()) return 'Informe a URL do SisLav.'
  } else {
    if (!form.laundrykitAccessToken.trim())
      return 'Informe o token de acesso Laundry Kit.'
    if (!form.laundrykitStoreId.trim()) return 'Informe o Store ID Laundry Kit.'
    if (!form.laundrykitUrl.trim()) return 'Informe a URL do Laundry Kit.'
  }

  return null
}

export function App() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [status, setStatus] = useState<RunStatus>('idle')
  const [stats, setStats] = useState<ImportStats>(createEmptyStats())
  const [hasProgress, setHasProgress] = useState(false)
  const [logs, setLogs] = useState<ImportLogEntry[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [finishedNote, setFinishedNote] = useState<string | null>(null)
  const logIdRef = useRef(0)

  useEffect(() => {
    const off = window.api.onImportEvent((event) => {
      if (event.type === 'log') {
        setLogs((prev) => [...prev, event.entry])
      } else if (event.type === 'progress') {
        setStats(event.stats)
        setHasProgress(true)
      } else if (event.type === 'finished') {
        setStats(event.stats)
        if (event.error) {
          setStatus('error')
          setFinishedNote(event.error)
        } else if (event.cancelled) {
          setStatus('cancelled')
          setFinishedNote('Importação cancelada.')
        } else {
          setStatus('done')
          setFinishedNote('Importação concluída.')
        }
      }
    })
    return off
  }, [])

  const setIntegration = useCallback((integration: IntegrationId) => {
    setForm((prev) => ({ ...prev, integration }))
  }, [])

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleStart = useCallback(async () => {
    const error = validate(form)
    if (error) {
      setFormError(error)
      return
    }
    setFormError(null)
    setFinishedNote(null)
    setLogs([])
    setStats(createEmptyStats())
    setHasProgress(false)
    setStatus('running')
    logIdRef.current = 0

    try {
      await window.api.startImport(buildConfig(form))
    } catch (err) {
      setStatus('error')
      setFinishedNote(err instanceof Error ? err.message : String(err))
    }
  }, [form])

  const handleCancel = useCallback(async () => {
    await window.api.cancelImport()
  }, [])

  const running = status === 'running'

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src={logo} alt="LavPerform" />
          <div>
            <div className="brand-name">
              Lav<span>Perform</span>
            </div>
            <div className="brand-tag">Importação de integrações</div>
          </div>
        </div>
        <div className="session-badge">
          <span className="dot" />
          Credenciais mantidas apenas nesta sessão
        </div>
      </header>

      <main className="layout">
        <ConfigForm
          form={form}
          disabled={running}
          formError={formError}
          onIntegration={setIntegration}
          onField={updateField}
          onStart={handleStart}
          onCancel={handleCancel}
          running={running}
        />
        <RunPanel
          status={status}
          stats={stats}
          hasProgress={hasProgress}
          logs={logs}
          finishedNote={finishedNote}
          dryRun={form.dryRun}
        />
      </main>
    </div>
  )
}
