import { ReactNode } from 'react';

interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function Section({ title, description, children }: SectionProps) {
  return (
    <section className="section">
      <div className="section__head">
        <h2 className="section__title">{title}</h2>
        {description && <p className="section__description">{description}</p>}
      </div>
      <div className="section__body">{children}</div>
    </section>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="toggle-row">
      <span className="toggle-row__copy">
        <span className="toggle-row__label">{label}</span>
        {description && <span className="toggle-row__description">{description}</span>}
      </span>
      <input
        type="checkbox"
        className="toggle-row__input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-row__track" aria-hidden="true">
        <span className="toggle-row__thumb" />
      </span>
    </label>
  );
}
