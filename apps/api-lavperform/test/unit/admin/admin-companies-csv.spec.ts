import {
  ADMIN_COMPANIES_CSV_HEADER,
  adminCompaniesCsvHeader,
  adminCompanyStatus,
  formatAdminCompaniesCsvChunk,
} from 'src/admin/companies/admin-companies-csv';

const address = {
  street: 'Av. Paulista',
  number: '1000',
  complement: null,
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310-100',
};

describe('admin companies csv', () => {
  it('lista o cadastro da lavanderia e a coluna de status', () => {
    expect(ADMIN_COMPANIES_CSV_HEADER).toBe(
      'nome,cnpj,email,telefone,status,modelo,parceiro,slug,cidade,uf,bairro,cep,rua,numero,complemento,data_cadastro,data_exclusao',
    );
    expect(adminCompaniesCsvHeader()).toBe(`\uFEFF${ADMIN_COMPANIES_CSV_HEADER}\n`);
  });

  it('marca ativo, inativo e pendente', () => {
    expect(adminCompanyStatus({ state: 'ACTIVE' })).toBe('ativo');
    expect(adminCompanyStatus({ state: 'INACTIVE' })).toBe('inativo');
    expect(adminCompanyStatus({ state: 'PENDING' })).toBe('pendente');
  });

  it('marca deletado mesmo quando o estado ficou inativo e devolve o cnpj original', () => {
    const csv = formatAdminCompaniesCsvChunk([
      {
        name: 'Lavanderia Centro',
        cnpj: '12345678000199__deleted__company-1',
        email: 'contato@lavanderia.com',
        phone: '14999999999',
        state: 'INACTIVE',
        deletedAt: new Date('2026-11-01T12:00:00.000Z'),
        serviceModel: 'CONVENTIONAL',
        slug: 'lavanderia-centro__deleted__company-1',
        createdAt: new Date('2024-05-10T00:00:00.000Z'),
        address,
        businessPartner: { name: 'Parceiro Sul' },
      },
    ]);

    expect(csv).toBe(
      'Lavanderia Centro,12345678000199,contato@lavanderia.com,14999999999,deletado,Convencional,Parceiro Sul,lavanderia-centro,São Paulo,SP,Bela Vista,01310-100,Av. Paulista,1000,,2024-05-10,2026-11-01\n',
    );
  });

  it('exporta lavanderia ativa de autoatendimento', () => {
    const csv = formatAdminCompaniesCsvChunk([
      {
        name: 'Lav Express',
        cnpj: '99888777000166',
        email: 'oi@lav.com',
        phone: null,
        state: 'ACTIVE',
        deletedAt: null,
        serviceModel: 'SELF_SERVICE',
        slug: 'lav-express',
        createdAt: new Date('2025-01-02T00:00:00.000Z'),
        address: null,
        businessPartner: null,
      },
    ]);

    expect(csv).toBe(
      'Lav Express,99888777000166,oi@lav.com,,ativo,Autoatendimento,,lav-express,,,,,,,,2025-01-02,\n',
    );
  });

  it('escapa vírgula no nome', () => {
    const csv = formatAdminCompaniesCsvChunk([
      {
        name: 'Lavanderia A, Unidade 2',
        cnpj: '11222333000181',
        state: 'PENDING',
      },
    ]);

    expect(csv.startsWith('"Lavanderia A, Unidade 2",11222333000181')).toBe(true);
    expect(csv).toContain(',pendente,');
  });
});
