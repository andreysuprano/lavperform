export class OrderResponseDto {
  orders: any[]; // Os dados reais virão do Prisma com tipos gerados
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
