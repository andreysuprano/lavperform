import { HelpAlert } from '../shared/types';

export class AlertQueue {
  private alerts: HelpAlert[] = [];
  private listeners: Array<(alerts: HelpAlert[]) => void> = [];

  push(alert: HelpAlert): boolean {
    if (this.alerts.some((a) => a.helpRequestId === alert.helpRequestId)) {
      return false;
    }
    this.alerts.unshift(alert);
    this.notify();
    return true;
  }

  setAll(alerts: HelpAlert[]): void {
    const map = new Map<string, HelpAlert>();
    for (const a of [...alerts, ...this.alerts]) {
      map.set(a.helpRequestId, a);
    }
    this.alerts = Array.from(map.values()).sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
    );
    this.notify();
  }

  remove(helpRequestId: string): void {
    this.alerts = this.alerts.filter((a) => a.helpRequestId !== helpRequestId);
    this.notify();
  }

  getAll(): HelpAlert[] {
    return [...this.alerts];
  }

  onChange(listener: (alerts: HelpAlert[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const snapshot = this.getAll();
    for (const l of this.listeners) l(snapshot);
  }
}

export const alertQueue = new AlertQueue();
