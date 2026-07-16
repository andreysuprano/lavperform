import type { OrderSaleProduct } from '@/types'

export function formatSaleProducts(products: OrderSaleProduct[]): string {
  if (!products.length) {
    return '-'
  }

  return products
    .map((product) => `${product.name} x${product.quantity}`)
    .join(', ')
}
