/**
 * Exemplos de uso do VmLavService
 */

import { VmLavService } from './vmlav.service';

/**
 * Exemplo 1: Buscar vendas de um período específico
 */
async function exemploGetSales(vmLavService: VmLavService) {
  const apiKey = 'd6bf766c-282d-4667-8bfa-cdcce313b5a7';
  const cnpj = '41964710000119';

  const sales = await vmLavService.getSales(apiKey, {
    dataInicio: '2026-02-01T00:00:00Z',
    dataTermino: '2026-03-01T23:59:59Z',
    somenteSucesso: true,
    cnpj: cnpj,
    pagina: 0,
    quantidade: 10,
  });

  console.log(`Total de vendas: ${sales.length}`);
  console.log(`Primeira venda:`, sales[0]);
  console.log(`Cliente: ${sales[0].nomeCliente}`);
  console.log(`Valor: R$ ${sales[0].valor}`);
}

/**
 * Exemplo 2: Buscar todas as vendas de um dia específico
 */
async function exemploDailySales(vmLavService: VmLavService) {
  const apiKey = 'd6bf766c-282d-4667-8bfa-cdcce313b5a7';
  const cnpj = '41964710000119';
  const date = '2026-02-01'; // Formato: YYYY-MM-DD

  const sales = await vmLavService.getDailySales(apiKey, cnpj, date);

  console.log(`Total de vendas do dia ${date}: ${sales.length}`);
  
  // Processar vendas e extrair informações dos clientes
  for (const sale of sales) {
    console.log(`Venda ${sale.idVenda}: R$ ${sale.valor}`);
    console.log(`  Cliente ID: ${sale.idCliente}`);
    console.log(`  Nome: ${sale.nomeCliente}`);
    console.log(`  Telefone: ${sale.telefoneCliente}`);
    console.log(`  Email: ${sale.emailCliente}`);
    console.log(`  CPF: ${sale.cpfCliente}`);
    console.log(`  Data Nascimento: ${sale.dtaNascimento}`);
    console.log(`  Lavanderia: ${sale.lavanderia}`);
    console.log(`  Pagamento: ${sale.tipoPagamento} - ${sale.tipoCartao} ${sale.bandeiraCartao}`);
  }
}

/**
 * Exemplo 3: Buscar vendas de hoje
 */
async function exemploVendasHoje(vmLavService: VmLavService) {
  const apiKey = 'd6bf766c-282d-4667-8bfa-cdcce313b5a7';
  const cnpj = '41964710000119';
  
  const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const sales = await vmLavService.getDailySales(apiKey, cnpj, hoje);

  console.log(`Vendas de hoje (${hoje}): ${sales.length}`);
  
  const total = sales.reduce((sum, sale) => sum + sale.valor, 0);
  console.log(`Valor total: R$ ${total.toFixed(2)}`);
  
  // Extrair clientes únicos
  const clientesUnicos = new Set(sales.map(s => s.idCliente));
  console.log(`Clientes únicos: ${clientesUnicos.size}`);
}

/**
 * Exemplo 4: Buscar dados detalhados de um cliente por CPF
 */
async function exemploGetCustomer(vmLavService: VmLavService) {
  const apiKey = 'd6bf766c-282d-4667-8bfa-cdcce313b5a7';
  const cpf = '08452235429'; // CPF sem ou com formatação

  const customer = await vmLavService.getCustomerByCpf(apiKey, cpf);

  if (customer) {
    console.log(`Cliente encontrado:`);
    console.log(`  ID: ${customer.id}`);
    console.log(`  Nome: ${customer.nome}`);
    console.log(`  CPF: ${customer.cpf}`);
    console.log(`  Telefone: ${customer.telefone}`);
    console.log(`  Email: ${customer.email}`);
    console.log(`  Gênero: ${customer.genero}`);
    console.log(`  Data Nascimento: ${customer.dataNascimento}`);
    console.log(`  Data Cadastro: ${customer.dataCadastro} (usado como createdAt no sistema)`);
    console.log(`  Quantidade de Compras: ${customer.qtdCompras}`);
    console.log(`  Valor Total Compras: R$ ${customer.valorTotalCompras.toFixed(2)}`);
    console.log(`  Primeira Compra: ${customer.primeiraCompra} (usado como firstOrderDate)`);
    console.log(`  Última Compra: ${customer.ultimaCompra}`);
    console.log(`  Ticket Médio: R$ ${(customer.valorTotalCompras / customer.qtdCompras).toFixed(2)}`);
  } else {
    console.log('Cliente não encontrado');
  }
}

/**
 * Exemplo 5: Buscar cliente ao processar venda (fluxo completo)
 */
async function exemploFluxoCompletoVenda(vmLavService: VmLavService) {
  const apiKey = 'd6bf766c-282d-4667-8bfa-cdcce313b5a7';
  const cnpj = '41964710000119';
  const date = '2026-02-01';

  // 1. Buscar vendas do dia
  const sales = await vmLavService.getDailySales(apiKey, cnpj, date);
  
  console.log(`Processando ${sales.length} vendas...`);

  // 2. Para cada venda, buscar dados detalhados do cliente se tiver CPF
  for (const sale of sales) {
    console.log(`\nVenda ${sale.idVenda}:`);
    console.log(`  Cliente (dados da venda): ${sale.nomeCliente}`);
    console.log(`  CPF: ${sale.cpfCliente || 'Não informado'}`);

    // Se tiver CPF, buscar dados completos
    if (sale.cpfCliente) {
      const customerDetail = await vmLavService.getCustomerByCpf(apiKey, sale.cpfCliente);
      
      if (customerDetail) {
        console.log(`  ✓ Dados detalhados encontrados na API:`);
        console.log(`    - Email: ${customerDetail.email || 'Não informado'}`);
        console.log(`    - Telefone: ${customerDetail.telefone}`);
        console.log(`    - Data Nascimento: ${customerDetail.dataNascimento}`);
        console.log(`    - Gênero: ${customerDetail.genero}`);
        console.log(`    - Total de compras: ${customerDetail.qtdCompras}`);
        console.log(`    - Valor gasto: R$ ${customerDetail.valorTotalCompras.toFixed(2)}`);
      } else {
        console.log(`  ⚠ Dados detalhados não encontrados, usando dados da venda`);
      }
    }
  }
}

export {
  exemploGetSales,
  exemploDailySales,
  exemploVendasHoje,
  exemploGetCustomer,
  exemploFluxoCompletoVenda,
};
