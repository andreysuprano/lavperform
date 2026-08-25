import { Injectable } from '@nestjs/common';
import { UazapiClient } from './uazapi.client';

export type ConnectedCheckInstance = {
  name: string;
  token: string;
};

@Injectable()
export class UazapiCheckInstancePool {
  static readonly CACHE_TTL_MS = 30_000;

  private cached: ConnectedCheckInstance[] | null = null;
  private expiresAt = 0;
  private cursor = 0;
  private inflight: Promise<ConnectedCheckInstance[]> | null = null;

  constructor(private readonly uazapiClient: UazapiClient) {}

  async getConnectedInstances(): Promise<ConnectedCheckInstance[]> {
    if (this.cached && Date.now() < this.expiresAt) {
      return this.cached;
    }

    if (this.inflight) {
      return this.inflight;
    }

    this.inflight = this.fetchConnectedInstances().finally(() => {
      this.inflight = null;
    });

    return this.inflight;
  }

  nextIndex(length: number): number {
    if (length <= 0) {
      return 0;
    }

    const index = this.cursor % length;
    this.cursor += 1;
    return index;
  }

  invalidate(): void {
    this.cached = null;
    this.expiresAt = 0;
  }

  private async fetchConnectedInstances(): Promise<ConnectedCheckInstance[]> {
    const instances = await this.uazapiClient.getAllInstances();
    const connected = instances
      .filter((instance) => instance.status?.toLowerCase() === 'connected')
      .map((instance) => ({ name: instance.name, token: instance.token }));

    this.cached = connected;
    this.expiresAt = Date.now() + UazapiCheckInstancePool.CACHE_TTL_MS;
    return connected;
  }
}
