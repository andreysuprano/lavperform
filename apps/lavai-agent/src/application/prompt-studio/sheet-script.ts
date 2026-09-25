export type ServiceModel = 'CONVENTIONAL' | 'SELF_SERVICE';

export type SheetField = {
  key: string;
  label: string;
  question: string;
  audience: 'BOTH' | ServiceModel;
};

export const CADASTRO_KEYS = [
  'name',
  'phone',
  'address',
  'hours_seg',
  'hours_ter',
  'hours_qua',
  'hours_qui',
  'hours_sex',
  'hours_sab',
  'hours_dom',
] as const;

function cadastroField(key: (typeof CADASTRO_KEYS)[number], label: string, question: string): SheetField {
  return { key, label, question, audience: 'BOTH' };
}

const CADASTRO_FIELDS: SheetField[] = [
  cadastroField('name', 'Nome', 'Qual é o nome da lavanderia?'),
  cadastroField('phone', 'Telefone', 'Qual é o telefone de contato da unidade?'),
  cadastroField('address', 'Endereço', 'Qual é o endereço completo da lavanderia?'),
  cadastroField('hours_seg', 'Horário de segunda', 'Qual é o horário de funcionamento na segunda-feira?'),
  cadastroField('hours_ter', 'Horário de terça', 'Qual é o horário de funcionamento na terça-feira?'),
  cadastroField('hours_qua', 'Horário de quarta', 'Qual é o horário de funcionamento na quarta-feira?'),
  cadastroField('hours_qui', 'Horário de quinta', 'Qual é o horário de funcionamento na quinta-feira?'),
  cadastroField('hours_sex', 'Horário de sexta', 'Qual é o horário de funcionamento na sexta-feira?'),
  cadastroField('hours_sab', 'Horário de sábado', 'Qual é o horário de funcionamento no sábado?'),
  cadastroField('hours_dom', 'Horário de domingo', 'Qual é o horário de funcionamento no domingo?'),
];

function asked(
  key: string,
  label: string,
  question: string,
  audience: 'BOTH' | ServiceModel = 'BOTH',
): SheetField {
  return { key, label, question, audience };
}

export const ASKED_FIELDS: SheetField[] = [
  asked('referencePoint', 'Ponto de referência', 'Qual é o ponto de referência para encontrar a unidade?'),
  asked('generalHours', 'Horário geral', 'Como você descreve o horário geral de funcionamento?'),
  asked('holidayHours', 'Horário em feriados', 'Qual é o horário de funcionamento em feriados?'),
  asked(
    'humanSupportHours',
    'Horário do atendimento humano',
    'Em quais horários há atendimento humano presencial ou por telefone?',
  ),
  asked('whatsapp', 'WhatsApp', 'Qual é o número ou link do WhatsApp da unidade?'),
  asked('instagram', 'Instagram', 'Qual é o perfil do Instagram da lavanderia?'),
  asked('otherChannels', 'Outros canais', 'Quais outros canais de contato a unidade utiliza?'),
  asked('priceWash', 'Lavagem', 'Qual é o preço da lavagem?'),
  asked('priceDry', 'Secagem', 'Qual é o preço da secagem?'),
  asked('priceFullCycle', 'Ciclo completo', 'Qual é o preço do ciclo completo (lavagem e secagem)?'),
  asked('priceComforter', 'Edredom', 'Qual é o preço para lavar edredom?'),
  asked('priceOther', 'Outros preços', 'Quais outros preços o cliente precisa saber?'),
  asked('payPix', 'Pix', 'A unidade aceita pagamento via Pix?'),
  asked('payCredit', 'Cartão de crédito', 'A unidade aceita cartão de crédito?'),
  asked('payDebit', 'Cartão de débito', 'A unidade aceita cartão de débito?'),
  asked('payCash', 'Dinheiro', 'A unidade aceita pagamento em dinheiro?'),
  asked('payApp', 'Pagamento no app', 'É possível pagar pelo aplicativo?'),
  asked('payOther', 'Outras formas de pagamento', 'Quais outras formas de pagamento são aceitas?'),
  asked('productSoap', 'Sabão', 'A unidade fornece sabão ou o cliente leva o próprio?'),
  asked('productSoftener', 'Amaciante', 'A unidade fornece amaciante ou o cliente leva o próprio?'),
  asked('productOther', 'Outros produtos', 'Quais outros produtos de lavanderia estão disponíveis na unidade?'),
  asked('productOwn', 'Produto próprio', 'O cliente pode usar produtos próprios nas máquinas?'),
  asked('machineWashers', 'Lavadoras', 'Quantas lavadoras há e quais modelos ou tipos?'),
  asked('machineDryers', 'Secadoras', 'Quantas secadoras há e quais modelos ou tipos?'),
  asked('machineCapacities', 'Capacidades', 'Quais são as capacidades das máquinas (kg ou ciclos)?'),
  asked('machineWashTime', 'Tempo de lavagem', 'Quanto tempo dura em média um ciclo de lavagem?'),
  asked('machineDryTime', 'Tempo de secagem', 'Quanto tempo dura em média um ciclo de secagem?'),
  asked(
    'machineLargePiece',
    'Peça grande na máquina',
    'Como funciona a lavagem de peças grandes (edredom, cobertas) nas máquinas?',
  ),
  asked('pieceComforter', 'Edredom (peças)', 'A unidade aceita edredom? Como informar ao cliente?'),
  asked('pieceBlanket', 'Cobertor', 'A unidade aceita cobertas? Como informar ao cliente?'),
  asked('pieceRug', 'Tapete', 'A unidade aceita tapetes? Como informar ao cliente?'),
  asked('pieceSneakers', 'Tênis', 'A unidade aceita tênis? Como informar ao cliente?'),
  asked('piecePet', 'Pet', 'A unidade aceita itens de pet? Como informar ao cliente?'),
  asked('pieceProhibited', 'Peças proibidas', 'Quais peças ou itens são proibidos?'),
  asked('pieceRestrictions', 'Restrições de peças', 'Quais restrições de peças o cliente deve conhecer?'),
  asked('appName', 'Nome do app', 'Qual é o nome do aplicativo da lavanderia?'),
  asked('appLink', 'Link do app', 'Qual é o link para baixar ou acessar o aplicativo?'),
  asked('appFunctions', 'Funções do app', 'Quais funções o aplicativo oferece ao cliente?'),
  asked('appAvailability', 'Disponibilidade no app', 'O app mostra disponibilidade de máquinas em tempo real?'),
  asked('appCycle', 'Ciclo no app', 'É possível iniciar ou acompanhar ciclos pelo aplicativo?'),
  asked('appPayment', 'Pagamento no app', 'Como funciona o pagamento pelo aplicativo?'),
  asked('supportChannel', 'Canal de suporte', 'Qual canal o cliente deve usar para pedir ajuda?'),
  asked('supportHours', 'Horário de suporte', 'Em quais horários o suporte está disponível?'),
  asked('supportProblem', 'Problema no suporte', 'Como a unidade orienta o cliente quando há problema na máquina ou no serviço?'),
  asked('supportPayment', 'Pagamento no suporte', 'Como o suporte trata dúvidas ou problemas de pagamento?'),
  asked('supportRefund', 'Reembolso', 'Qual é a política de reembolso quando algo dá errado?'),
  asked('promotion', 'Promoção', 'Quais promoções ou benefícios a unidade oferece hoje?'),
  asked('wifi', 'Wi-Fi', 'A unidade oferece Wi-Fi para os clientes?'),
  asked('unitSystem', 'Sistema da unidade', 'Qual sistema ou software a unidade utiliza para operação?'),
  asked(
    'machineSteps',
    'Passo a passo das máquinas',
    'Qual é o passo a passo para o cliente usar as máquinas?',
    'SELF_SERVICE',
  ),
  asked(
    'machineFailure',
    'Falha na máquina',
    'O que o cliente deve fazer quando uma máquina apresenta falha?',
    'SELF_SERVICE',
  ),
  asked(
    'paidNotStarted',
    'Pagou e não iniciou',
    'O que fazer quando o cliente pagou e a máquina não iniciou?',
    'SELF_SERVICE',
  ),
  asked(
    'realtimeAvailability',
    'Disponibilidade em tempo real',
    'Como o cliente consulta a disponibilidade das máquinas em tempo real?',
    'SELF_SERVICE',
  ),
  asked(
    'pickupDelivery',
    'Busca e entrega',
    'A unidade oferece busca e entrega de roupas? Como funciona?',
    'CONVENTIONAL',
  ),
  asked(
    'attendant',
    'Atendente',
    'Há atendente na unidade? Quais serviços ele realiza?',
    'CONVENTIONAL',
  ),
  asked(
    'serviceWash',
    'Serviço de lavagem',
    'Como funciona o serviço de lavagem convencional?',
    'CONVENTIONAL',
  ),
  asked(
    'serviceDry',
    'Serviço de secagem',
    'Como funciona o serviço de secagem convencional?',
    'CONVENTIONAL',
  ),
  asked(
    'serviceIron',
    'Serviço de passagem',
    'A unidade oferece passagem? Como funciona?',
    'CONVENTIONAL',
  ),
  asked(
    'serviceFold',
    'Serviço de dobra',
    'A unidade oferece dobra de roupas? Como funciona?',
    'CONVENTIONAL',
  ),
];

function fieldVisible(field: SheetField, model: ServiceModel): boolean {
  return field.audience === 'BOTH' || field.audience === model;
}

export function scriptFor(model: ServiceModel): SheetField[] {
  return [...CADASTRO_FIELDS, ...ASKED_FIELDS.filter((field) => fieldVisible(field, model))];
}

/** Stable union of keys across both service models (declaration order). */
export function allSheetKeys(): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const field of [...CADASTRO_FIELDS, ...ASKED_FIELDS]) {
    if (!seen.has(field.key)) {
      seen.add(field.key);
      keys.push(field.key);
    }
  }
  return keys;
}

function hasAnswer(answers: Record<string, string>, key: string): boolean {
  const value = answers[key];
  return typeof value === 'string' && value.trim() !== '';
}

export function nextQuestion(
  model: ServiceModel,
  answers: Record<string, string>,
): SheetField | null {
  for (const field of scriptFor(model)) {
    if (!hasAnswer(answers, field.key)) {
      return field;
    }
  }
  return null;
}
