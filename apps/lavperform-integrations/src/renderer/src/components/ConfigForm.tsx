import type { IntegrationId } from '@shared/types'
import { SecretInput } from './SecretInput'

export interface FormState {
  integration: IntegrationId
  apiKey: string
  publicApiUrl: string
  startDate: string
  endDate: string
  dryRun: boolean
  sendDelayMs: number
  dayDelayMs: number
  fetchRetries: number
  maxlavApiToken: string
  maxlavApiUrl: string
  laundrykitAccessToken: string
  laundrykitStoreId: string
  laundrykitUrl: string
  sislavSessionToken: string
  sislavOrganizationId: string
  sislavLaundryId: string
  sislavApiUrl: string
}

interface ConfigFormProps {
  form: FormState
  disabled: boolean
  running: boolean
  formError: string | null
  onIntegration: (integration: IntegrationId) => void
  onField: <K extends keyof FormState>(key: K, value: FormState[K]) => void
  onStart: () => void
  onCancel: () => void
}

const INTEGRATIONS: { id: IntegrationId; name: string; desc: string }[] = [
  { id: 'maxlav', name: 'MaxLav', desc: 'Pedidos via API de pedidos MaxPan' },
  { id: 'laundrykit', name: 'Laundry Kit', desc: 'Operações via dashboard Laundry Kit' },
  { id: 'sislav', name: 'SisLav', desc: 'Vendas via dashboard SisLav' },
]

export function ConfigForm({
  form,
  disabled,
  running,
  formError,
  onIntegration,
  onField,
  onStart,
  onCancel,
}: ConfigFormProps) {
  return (
    <section className="panel">
      <h2 className="panel-title">Configurar importação</h2>
      <p className="panel-sub">
        Selecione a integração, informe as credenciais e o período. Os dados são
        buscados localmente e enviados à API aberta.
      </p>

      <div className="integration-switch">
        {INTEGRATIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`integration-card ${form.integration === item.id ? 'active' : ''}`}
            onClick={() => onIntegration(item.id)}
            disabled={disabled}
          >
            <span className="name">{item.name}</span>
            <span className="desc">{item.desc}</span>
          </button>
        ))}
      </div>

      <div className="section-label">API aberta LavPerform</div>
      <div className="field">
        <label>API key (x-api-key)</label>
        <SecretInput
          placeholder="fcrm_..."
          value={form.apiKey}
          disabled={disabled}
          onChange={(value) => onField('apiKey', value)}
        />
      </div>
      <div className="field">
        <label>URL da API aberta</label>
        <input
          type="text"
          value={form.publicApiUrl}
          disabled={disabled}
          onChange={(e) => onField('publicApiUrl', e.target.value)}
        />
      </div>

      <div className="divider" />

      {form.integration === 'maxlav' && (
        <>
          <div className="section-label">Credenciais MaxLav</div>
          <div className="field">
            <label>Token da API (Bearer)</label>
            <SecretInput
              placeholder="Token MaxLav"
              value={form.maxlavApiToken}
              disabled={disabled}
              onChange={(value) => onField('maxlavApiToken', value)}
            />
          </div>
          <div className="field">
            <label>URL da API MaxLav</label>
            <input
              type="text"
              value={form.maxlavApiUrl}
              disabled={disabled}
              onChange={(e) => onField('maxlavApiUrl', e.target.value)}
            />
          </div>
        </>
      )}

      {form.integration === 'laundrykit' && (
        <>
          <div className="section-label">Credenciais Laundry Kit</div>
          <div className="field">
            <label>Token de acesso (JWT)</label>
            <SecretInput
              placeholder="JWT do dashboard"
              value={form.laundrykitAccessToken}
              disabled={disabled}
              onChange={(value) => onField('laundrykitAccessToken', value)}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Store ID</label>
              <input
                type="text"
                placeholder="STORE_ID_..."
                value={form.laundrykitStoreId}
                disabled={disabled}
                onChange={(e) => onField('laundrykitStoreId', e.target.value)}
              />
            </div>
            <div className="field">
              <label>URL do Laundry Kit</label>
              <input
                type="text"
                value={form.laundrykitUrl}
                disabled={disabled}
                onChange={(e) => onField('laundrykitUrl', e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {form.integration === 'sislav' && (
        <>
          <div className="section-label">Credenciais SisLav</div>
          <div className="field">
            <label>Session token (authjs.session-token)</label>
            <SecretInput
              placeholder="Cole o cookie ou só o valor do session-token"
              value={form.sislavSessionToken}
              disabled={disabled}
              onChange={(value) => onField('sislavSessionToken', value)}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Organization ID</label>
              <input
                type="text"
                placeholder="x-organization-id"
                value={form.sislavOrganizationId}
                disabled={disabled}
                onChange={(e) => onField('sislavOrganizationId', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Laundry ID</label>
              <input
                type="text"
                placeholder="laundryId"
                value={form.sislavLaundryId}
                disabled={disabled}
                onChange={(e) => onField('sislavLaundryId', e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label>URL do SisLav</label>
            <input
              type="text"
              value={form.sislavApiUrl}
              disabled={disabled}
              onChange={(e) => onField('sislavApiUrl', e.target.value)}
            />
          </div>
        </>
      )}

      <div className="divider" />

      <div className="section-label">Período e execução</div>
      <div className="field-row">
        <div className="field">
          <label>Data inicial</label>
          <input
            type="date"
            value={form.startDate}
            disabled={disabled}
            onChange={(e) => onField('startDate', e.target.value)}
          />
        </div>
        <div className="field">
          <label>Data final</label>
          <input
            type="date"
            value={form.endDate}
            disabled={disabled}
            onChange={(e) => onField('endDate', e.target.value)}
          />
        </div>
      </div>

      <div className="field-row-3">
        <div className="field">
          <label>Delay envio (ms)</label>
          <input
            type="number"
            min={0}
            value={form.sendDelayMs}
            disabled={disabled}
            onChange={(e) => onField('sendDelayMs', Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Delay dia (ms)</label>
          <input
            type="number"
            min={0}
            value={form.dayDelayMs}
            disabled={disabled}
            onChange={(e) => onField('dayDelayMs', Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Retentativas</label>
          <input
            type="number"
            min={1}
            max={10}
            value={form.fetchRetries}
            disabled={disabled}
            onChange={(e) => onField('fetchRetries', Number(e.target.value))}
          />
        </div>
      </div>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={form.dryRun}
          disabled={disabled}
          onChange={(e) => onField('dryRun', e.target.checked)}
        />
        Modo simulação (dry-run) — não envia à API aberta
      </label>

      <div className="actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onStart}
          disabled={running}
        >
          {running ? 'Importando…' : 'Iniciar importação'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
          disabled={!running}
        >
          Cancelar
        </button>
      </div>

      {formError && <div className="form-error">{formError}</div>}
    </section>
  )
}
