import { useEffect, useState } from 'react';
import { HelpAlert } from '../shared/types';
import { AlertCard } from './components/AlertCard';
import { AppHeader } from './components/AppHeader';
import { EmptyState } from './components/EmptyState';
import { SettingsView } from './SettingsView';

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('55')) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  return phone;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getLavaiApi() {
  return window.lavai ?? window.foodAi;
}

function AlertView() {
  const [alerts, setAlerts] = useState<HelpAlert[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getLavaiApi().alerts.get().then(setAlerts);
    return getLavaiApi().alerts.onUpdated(setAlerts);
  }, []);

  const settingsButton = (
    <button type="button" className="btn btn-ghost btn-sm" onClick={() => getLavaiApi().window.openSettings()}>
      Configurações
    </button>
  );

  if (alerts.length === 0) {
    return (
      <div className="page">
        <AppHeader eyebrow="Atendimento" title="Alertas" actions={settingsButton} />
        <EmptyState
          title="Tudo tranquilo por aqui"
          description="Quando um cliente pedir ajuda humana, o alerta aparece aqui com som e notificação."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <AppHeader
        eyebrow="Atendimento"
        title={`${alerts.length} alerta${alerts.length > 1 ? 's' : ''}`}
        actions={settingsButton}
      />
      {error && <p className="status status--error">{error}</p>}
      <div className="alert-list">
        {alerts.map((alert) => (
          <AlertCard
            key={alert.helpRequestId}
            alert={alert}
            formatPhone={formatPhone}
            formatTime={formatTime}
            onOpenWhatsApp={() => void getLavaiApi().alerts.openWhatsApp(alert.userPhone)}
            onClaim={async () => {
              try {
                setError(null);
                await getLavaiApi().alerts.claim(alert.helpRequestId);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Erro ao assumir');
              }
            }}
            onDismiss={() => void getLavaiApi().alerts.dismiss(alert.helpRequestId)}
          />
        ))}
      </div>
    </div>
  );
}

export function App() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view') ?? 'alerts';

  if (view === 'settings') {
    return <SettingsView />;
  }

  return <AlertView />;
}
