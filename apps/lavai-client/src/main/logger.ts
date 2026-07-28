export class Logger {
  constructor(private readonly scope: string) {}

  log(message: string, ...args: unknown[]) {
    console.log(`[${this.scope}] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    console.warn(`[${this.scope}] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]) {
    console.error(`[${this.scope}] ${message}`, ...args);
  }
}
