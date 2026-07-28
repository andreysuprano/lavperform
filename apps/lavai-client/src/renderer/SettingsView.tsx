import { useEffect, useState } from 'react';
import { ClientSettings, DefaultSoundId } from '../shared/types';
import { AppHeader } from './components/AppHeader';
import { ToggleRow } from './components/Section';
import { TabPanel, Tabs } from './components/Tabs';

type SettingsTab = 'connection' | 'sound' | 'behavior';

const SETTINGS_TABS = [
  { id: 'connection' as const, label: 'Conexão' },
  { id: 'sound' as const, label: 'Som' },
  { id: 'behavior' as const, label: 'Comportamento' },
];

export function SettingsView() {
  const [settings, setSettings] = useState<ClientSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('connection');

  useEffect(() => {
    void (window.lavai ?? window.foodAi).settings.get().then(setSettings);
  }, []);

  if (!settings) {
    return (
      <div className="page">
        <AppHeader eyebrow="Preferências" title="Configurações" />
        <p className="status status--muted">Carregando...</p>
      </div>
    );
  }

  const update = (partial: Partial<ClientSettings>) => {
    setSettings({ ...settings, ...partial });
    setSaved(false);
  };

  const save = async () => {
    const next = await (window.lavai ?? window.foodAi).settings.save(settings);
    setSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page page--settings">
      <AppHeader
        eyebrow="Preferências"
        title="Configurações"
        actions={saved ? <span className="status status--success">Salvo</span> : undefined}
      />

      <Tabs tabs={SETTINGS_TABS} active={activeTab} onChange={setActiveTab}>
        <TabPanel
          id="connection"
          labelledBy="tab-connection"
          hidden={activeTab !== 'connection'}
          description="Ligue este client ao agente que recebe os pedidos de ajuda."
        >
          <div className="field">
            <label htmlFor="api-url">URL da API</label>
            <input
              id="api-url"
              value={settings.apiUrl}
              onChange={(e) => update({ apiUrl: e.target.value })}
              placeholder="http://localhost:3000"
            />
            <p className="field-hint">
              URL do backend <strong>food-agent</strong>, não do dashboard. Ex.:{' '}
              <code>http://localhost:3000</code>
            </p>
          </div>

          <div className="field">
            <label htmlFor="agent-id">ID do Agente</label>
            <input
              id="agent-id"
              value={settings.agentId}
              onChange={(e) => update({ agentId: e.target.value })}
              placeholder="uuid do agente"
            />
          </div>
        </TabPanel>

        <TabPanel
          id="sound"
          labelledBy="tab-sound"
          hidden={activeTab !== 'sound'}
          description="Escolha como ser avisado quando chegar um novo pedido."
        >
          <ToggleRow
            label="Reproduzir som"
            checked={settings.soundEnabled}
            onChange={(checked) => update({ soundEnabled: checked })}
          />

          <div className="field">
            <label htmlFor="sound-type">Tipo de som</label>
            <select
              id="sound-type"
              value={settings.useDefaultSound ? 'default' : 'custom'}
              onChange={(e) => update({ useDefaultSound: e.target.value === 'default' })}
            >
              <option value="default">Som padrão</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {settings.useDefaultSound ? (
            <div className="field">
              <label htmlFor="default-sound">Som padrão</label>
              <select
                id="default-sound"
                value={settings.selectedDefaultSound}
                onChange={(e) =>
                  update({ selectedDefaultSound: e.target.value as DefaultSoundId })
                }
              >
                <option value="default">Notification Default</option>
                <option value="soft">Notification Soft</option>
                <option value="cliente-com-fome">Cliente com fome</option>
              </select>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="custom-sound">Arquivo personalizado</label>
              <div className="input-group">
                <input
                  id="custom-sound"
                  readOnly
                  value={settings.customSoundPath ?? 'Nenhum arquivo selecionado'}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    const path = await (window.lavai ?? window.foodAi).settings.pickSoundFile();
                    if (path) update({ customSoundPath: path, useDefaultSound: false });
                  }}
                >
                  Escolher
                </button>
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="volume">Volume: {Math.round(settings.soundVolume * 100)}%</label>
            <input
              id="volume"
              className="slider"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.soundVolume}
              onChange={(e) => update({ soundVolume: parseFloat(e.target.value) })}
            />
          </div>

          <button type="button" className="btn btn-secondary" onClick={() => void (window.lavai ?? window.foodAi).settings.testSound()}>
            Testar som
          </button>
        </TabPanel>

        <TabPanel
          id="behavior"
          labelledBy="tab-behavior"
          hidden={activeTab !== 'behavior'}
          description="Defina como o client reage quando chega um alerta."
        >
          <ToggleRow
            label="Abrir janela automaticamente"
            description="Mostra os alertas assim que um cliente pedir ajuda."
            checked={settings.autoOpenWindow}
            onChange={(checked) => update({ autoOpenWindow: checked })}
          />
          <ToggleRow
            label="Iniciar com o sistema"
            description="Mantém o client ativo na bandeja ao ligar o computador."
            checked={settings.launchAtStartup}
            onChange={(checked) => update({ launchAtStartup: checked })}
          />
        </TabPanel>
      </Tabs>

      <footer className="page-footer">
        <button type="button" className="btn btn-primary btn-block" onClick={() => void save()}>
          Salvar configurações
        </button>
      </footer>
    </div>
  );
}
