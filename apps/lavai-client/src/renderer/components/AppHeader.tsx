import { ReactNode } from 'react';
import logoUrl from '../../../assets/seld/logo_dark.png';

interface AppHeaderProps {
  eyebrow?: string;
  title?: string;
  actions?: ReactNode;
}

export function AppHeader({ eyebrow, title, actions }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <img src={logoUrl} alt="LavAI" className="app-header__logo" />
        {(eyebrow || title) && (
          <div className="app-header__copy">
            {eyebrow && <p className="app-header__eyebrow">{eyebrow}</p>}
            {title && <h1 className="app-header__title">{title}</h1>}
          </div>
        )}
      </div>
      {actions && <div className="app-header__actions">{actions}</div>}
    </header>
  );
}
