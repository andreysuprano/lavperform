import type { LavPerformApi } from './index'

declare global {
  interface Window {
    api: LavPerformApi
  }
}

export {}
