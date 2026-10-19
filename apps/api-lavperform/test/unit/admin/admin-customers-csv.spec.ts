import {
  ADMIN_CUSTOMERS_CSV_HEADER,
  adminCustomersCsvHeader,
  formatAdminCustomersCsvChunk,
} from 'src/admin/customers/admin-customers-csv';

describe('admin customers csv', () => {
  it('começa por lavanderia, nome e telefone e inclui os dados úteis da base', () => {
    expect(ADMIN_CUSTOMERS_CSV_HEADER).toBe(
      'lavanderia,nome,telefone,email,cpf,data_nascimento,genero,whatsapp_optin,whatsapp_verificado,classificacao,ticket_medio,data_primeira_venda,data_ultima_venda,cidade,estado,bairro,cep,rua,numero,complemento,observacoes',
    );
    expect(adminCustomersCsvHeader()).toBe(`\uFEFF${ADMIN_CUSTOMERS_CSV_HEADER}\n`);
  });

  it('mapeia contato, lavanderia e classificação', () => {
    const csv = formatAdminCustomersCsvChunk([
      {
        name: 'João Silva',
        phone: '(14) 99299-9909',
        email: 'joao@exemplo.com',
        cpf: '12345678900',
        birthDate: new Date('1990-01-01T00:00:00.000Z'),
        gender: 'M',
        whatsappOptin: true,
        whatsappVerified: false,
        rfvClassification: 'fiel',
        averageTicket: 12.5,
        firstOrderDate: new Date('2023-01-01T00:00:00.000Z'),
        lastOrderDate: new Date('2026-10-02T00:00:00.000Z'),
        observations: null,
        address: {
          street: 'Av. Paulista',
          number: '1000',
          complement: null,
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
        },
        company: { name: 'Lavanderia Centro' },
      },
    ]);

    expect(csv).toBe(
      'Lavanderia Centro,João Silva,(14) 99299-9909,joao@exemplo.com,12345678900,1990-01-01,M,Sim,Não,fiel,12.5,2023-01-01,2026-10-02,São Paulo,SP,Bela Vista,01310-100,Av. Paulista,1000,,\n',
    );
  });

  it('escapa vírgula no nome da lavanderia', () => {
    const csv = formatAdminCustomersCsvChunk([
      {
        name: 'Ana',
        phone: '11999999999',
        company: { name: 'Lavanderia A, Unidade 2' },
      },
    ]);

    expect(csv.startsWith('"Lavanderia A, Unidade 2",Ana,11999999999')).toBe(true);
  });
});
