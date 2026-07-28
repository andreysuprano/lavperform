import { ReactNode } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  children: ReactNode;
}

export function Tabs<T extends string>({ tabs, active, onChange, children }: TabsProps<T>) {
  return (
    <div className="tabs">
      <div className="tabs__list" role="tablist" aria-label="Seções de configuração">
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              className={`tabs__trigger${selected ? ' tabs__trigger--active' : ''}`}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="tabs__panels">{children}</div>
    </div>
  );
}

interface TabPanelProps {
  id: string;
  labelledBy: string;
  hidden: boolean;
  description?: string;
  children: ReactNode;
}

export function TabPanel({ id, labelledBy, hidden, description, children }: TabPanelProps) {
  return (
    <section
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={labelledBy}
      hidden={hidden}
      className="tab-panel"
    >
      {description && <p className="tab-panel__description">{description}</p>}
      <div className="tab-panel__body">{children}</div>
    </section>
  );
}
