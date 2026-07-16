import { useWhitelabelActive } from '../hooks/useWhitelabelActive'

/**
 * Verifica se uma feature específica de whitelabel está disponível
 * Por enquanto, todas as features dependem apenas de whitelabel estar ativo
 * Futuramente pode ser expandido para feature flags individuais
 */
export function useWhitelabelFeature(featureName: string) {
  const { isActive } = useWhitelabelActive()

  // Por enquanto, todas as features dependem apenas de whitelabel estar ativo
  // Futuramente pode ter lógica específica por feature
  return isActive
}
