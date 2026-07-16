/**
 * Representa uma instância retornada pelo endpoint GET /instance/all da Uazapi.
 * Os campos espelham o objeto `instance` presente nos demais endpoints da API.
 */
export interface UazapiInstanceSummaryDto {
  id: string;
  token: string;
  name: string;
  /** "connected" | "disconnected" | "pending" | etc. */
  status: string;
  /** Timestamp ISO da última desconexão (pode ser vazio string ou null) */
  lastDisconnect: string | null;
  /** Timestamp ISO da última atualização da instância */
  updated: string;
  created: string;
  adminField01?: string;
  /** Armazena o companyId da nossa plataforma, definido em adminField02 na criação */
  adminField02?: string;
  systemName?: string;
}
