import {
  CUSTOMER_IMPORT_CSV_HEADER,
  customersToImportCsv,
} from 'src/customers/application/customer-import-csv';

describe('customersToImportCsv', () => {
  it('usa o mesmo cabeçalho do CSV de importação', () => {
    const csv = customersToImportCsv([]);

    expect(csv.startsWith(`\uFEFF${CUSTOMER_IMPORT_CSV_HEADER}\n`)).toBe(true);
    expect(CUSTOMER_IMPORT_CSV_HEADER).toBe(
      'nome,telefone,email,data_nascimento,data_primeira_venda,genero,observacoes,valor_medio_ticket,rua,numero,complemento,bairro,cidade,estado,cep',
    );
  });

  it('mapeia os campos do cliente para as colunas da importação', () => {
    const csv = customersToImportCsv([
      {
        name: 'João Silva',
        phone: '(14) 99299-9909',
        email: 'joao@exemplo.com',
        birthDate: new Date('1990-01-01T00:00:00.000Z'),
        firstOrderDate: new Date('2023-01-01T00:00:00.000Z'),
        gender: 'M',
        observations: 'Cliente prefere entrega após as 18h',
        averageTicket: 0,
        address: {
          street: 'Av. Paulista',
          number: '1000',
          complement: 'Apto 123',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
        },
      },
    ]);

    expect(csv).toContain(
      'João Silva,(14) 99299-9909,joao@exemplo.com,1990-01-01,2023-01-01,M,Cliente prefere entrega após as 18h,0,Av. Paulista,1000,Apto 123,Bela Vista,São Paulo,SP,01310-100',
    );
  });

  it('escapa vírgula, aspas e quebra de linha', () => {
    const csv = customersToImportCsv([
      {
        name: 'Ana "Nica"',
        phone: '11999999999',
        observations: 'Linha 1\nLinha 2, com vírgula',
        address: null,
      },
    ]);

    expect(csv).toContain('"Ana ""Nica""",11999999999,,,,,"Linha 1\nLinha 2, com vírgula",,,,,,,,');
  });

  it('ordena pelo nome', () => {
    const csv = customersToImportCsv([
      { name: 'Carlos', phone: '2' },
      { name: 'ana', phone: '1' },
    ]);
    const lines = csv.replace(/^\uFEFF/, '').trim().split('\n');

    expect(lines[1]?.startsWith('ana,')).toBe(true);
    expect(lines[2]?.startsWith('Carlos,')).toBe(true);
  });
});
