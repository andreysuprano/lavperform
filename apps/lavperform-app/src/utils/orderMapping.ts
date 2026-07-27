/**
 * Mapeia orderType para nome legível
 */
function mapOrderType(orderType: string): string {
  const orderTypeMap: Record<string, string> = {
    delivery: 'Delivery',
    takeout: 'Retirada',
    dine_in: 'Mesa',
    pickup: 'Retirada',
  }

  return orderTypeMap[orderType] || orderType
}

/**
 * Mapeia salesChannel para nome legível
 */
function mapSalesChannel(salesChannel: string): string {
  const salesChannelMap: Record<string, string> = {
    catalog: '-',
    ifood: 'iFood',
    digital_menu: 'Cardápio Digital',
    app: 'App',
    website: 'Site',
  }

  return salesChannelMap[salesChannel] || salesChannel
}

/**
 * Combina orderType e salesChannel para exibir origem completa da venda
 * @param orderType Tipo da venda (delivery, takeout, etc.)
 * @param salesChannel Canal de vendas (catalog, ifood, etc.)
 * @returns Nome legível da origem (ex: "Cardápio Web", "iFood", etc.)
 */
export function getOrderOrigin(
  orderType?: string,
  salesChannel?: string
): string {
  if (!orderType && !salesChannel) {
    return ' '
  }

  // Se temos salesChannel, priorizamos ele (é mais específico)
  if (salesChannel) {
    return mapSalesChannel(salesChannel)
  }

  // Caso contrário, usamos orderType
  if (orderType) {
    return mapOrderType(orderType)
  }

  return ' '
}
