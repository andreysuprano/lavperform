import { HelpAlert } from '../../shared/types';

interface AlertCardProps {
  alert: HelpAlert;
  formatPhone: (phone: string) => string;
  formatTime: (iso: string) => string;
  onOpenWhatsApp: () => void;
  onClaim: () => Promise<void>;
  onDismiss: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AlertCard({
  alert,
  formatPhone,
  formatTime,
  onOpenWhatsApp,
  onClaim,
  onDismiss,
}: AlertCardProps) {
  return (
    <article className="alert-card">
      <div className="alert-card__top">
        <div className="alert-card__identity">
          <div className="alert-card__avatar" aria-hidden="true">
            {getInitials(alert.userName)}
          </div>
          <div>
            <h3 className="alert-card__name">{alert.userName}</h3>
            <p className="alert-card__phone">{formatPhone(alert.userPhone)}</p>
          </div>
        </div>
        <span className="badge badge--urgent">Aguardando</span>
      </div>

      <div className="alert-card__meta">
        <span>Solicitado às {formatTime(alert.requestedAt)}</span>
      </div>

      {alert.lastMessage && (
        <blockquote className="alert-card__message">"{alert.lastMessage}"</blockquote>
      )}

      <div className="alert-card__actions">
        <button type="button" className="btn btn-primary" onClick={onOpenWhatsApp}>
          Abrir WhatsApp
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => void onClaim()}>
          Assumir
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDismiss}>
          Dispensar
        </button>
      </div>
    </article>
  );
}
