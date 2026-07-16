/**
 * Logger utility para controlar console logs em diferentes ambientes
 * Em produção, remove console.log e console.debug
 * Mantém console.error e console.warn para monitoramento
 */

const isDevelopment = import.meta.env.MODE === 'development'

type LogLevel = 'log' | 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private shouldLog(level: LogLevel): boolean {
    // Em produção, só permite error
    if (!isDevelopment) {
      return level === 'error'
    }
    // Em desenvolvimento, permite tudo
    return true
  }

  log(...args: any[]): void {
    if (this.shouldLog('log')) {
      console.log(...args)
    }
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...args)
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(...args)
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...args)
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(...args)
    }
  }

  /**
   * Usado para contextos específicos onde queremos garantir que o log apareça
   * apenas em desenvolvimento, independente do nível
   */
  devOnly(...args: any[]): void {
    if (isDevelopment) {
      console.log('[DEV]', ...args)
    }
  }
}

export const logger = new Logger()

export function setupConsoleInterceptor(): void {
  if (!isDevelopment) {
    // Sobrescreve console em produção
    console.log = () => {}
    console.debug = () => {}
    console.info = () => {}
  }
}
