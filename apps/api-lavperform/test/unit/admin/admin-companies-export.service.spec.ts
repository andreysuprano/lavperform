import { AdminCompaniesExportService } from 'src/admin/companies/admin-companies-export.service';

describe('AdminCompaniesExportService', () => {
  it('busca o cadastro inteiro, sem filtrar status nem exclusão', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new AdminCompaniesExportService({
      company: { findMany },
    } as never);

    const chunks: string[] = [];
    for await (const chunk of service.createExportStream()) {
      chunks.push(String(chunk));
    }

    expect(chunks[0]?.startsWith('\uFEFFnome,cnpj,email')).toBe(true);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0]).toEqual({
      include: {
        address: true,
        businessPartner: { select: { name: true } },
      },
      orderBy: { id: 'asc' },
      take: 500,
    });
  });
});
