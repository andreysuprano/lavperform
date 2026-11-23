export interface IntegrationSessionView {
  status: 'ACTIVE' | 'NEEDS_REAUTH'
  expiresAt: string
  lastError: string | null
}

export interface FieldCopy {
  label: string
  placeholder: string
  hint?: string
}

const SESSION_SLUGS = new Set(['MAXLAV', 'LAUNDRYKIT', 'SISLAV'])

export function isSessionPartner(partnerSlug?: string): boolean {
  return SESSION_SLUGS.has(partnerSlug?.trim().toUpperCase() ?? '')
}

export function sessionSetupHint(partnerSlug?: string): string | null {
  const slug = partnerSlug?.trim().toUpperCase()
  if (slug === 'SISLAV') {
    return 'Cole o cookie authjs.session-token ainda válido. A sessão é renovada sozinha enquanto esse cookie responder.'
  }
  if (slug === 'LAUNDRYKIT') {
    return 'Cole o JWT ainda válido do dashboard e o ID da loja. O token vale até o vencimento.'
  }
  if (slug === 'MAXLAV') {
    return 'Cole o token Bearer ainda válido do dashboard. Ele vale até o vencimento.'
  }
  return null
}

export function fieldCopy(
  partnerSlug: string | undefined,
  field: 'merchantId' | 'apiKey' | 'apiSecret' | 'password' | 'digitalMenuUrl',
): FieldCopy {
  const slug = partnerSlug?.trim().toUpperCase()

  if (slug === 'SISLAV' && field === 'apiKey') {
    return {
      label: 'Token da sessão',
      placeholder: 'authjs.session-token ou só o valor',
      hint: 'No dashboard, copie o cookie authjs.session-token. Pode colar o cookie inteiro ou só o valor.',
    }
  }
  if (slug === 'SISLAV' && field === 'merchantId') {
    return {
      label: 'ID da lavanderia',
      placeholder: 'laundryId',
      hint: 'É o laundryId usado na consulta de vendas.',
    }
  }
  if (slug === 'SISLAV' && field === 'apiSecret') {
    return {
      label: 'ID da organização',
      placeholder: 'x-organization-id',
      hint: 'É o valor do header x-organization-id.',
    }
  }
  if (slug === 'SISLAV' && field === 'digitalMenuUrl') {
    return {
      label: 'URL do app',
      placeholder: 'https://app.sislav.com.br',
      hint: 'Opcional. Em branco, usamos https://app.sislav.com.br.',
    }
  }

  if (slug === 'LAUNDRYKIT' && field === 'apiKey') {
    return {
      label: 'Token de acesso',
      placeholder: 'JWT do dashboard',
      hint: 'Cole um JWT ainda válido. Ele não gera outro token sozinho.',
    }
  }
  if (slug === 'LAUNDRYKIT' && field === 'merchantId') {
    return {
      label: 'ID da loja',
      placeholder: 'STORE_ID',
      hint: 'É o STORE_ID das consultas do Laundry Kit.',
    }
  }
  if (slug === 'LAUNDRYKIT' && field === 'digitalMenuUrl') {
    return {
      label: 'URL da rota',
      placeholder: 'https://laundrykit-front-dash.com/prod/manager/v7/route',
      hint: 'Opcional. Em branco, usamos a rota padrão do dashboard.',
    }
  }

  if (slug === 'MAXLAV' && field === 'apiKey') {
    return {
      label: 'Token de acesso',
      placeholder: 'Bearer do dashboard MaxLav',
      hint: 'Cole um token ainda válido. Ele vale até o vencimento.',
    }
  }
  if (slug === 'MAXLAV' && field === 'merchantId') {
    return {
      label: 'ID da loja',
      placeholder: 'Opcional',
      hint: 'Opcional. Informe quando o token atende mais de uma loja.',
    }
  }
  if (slug === 'MAXLAV' && field === 'digitalMenuUrl') {
    return {
      label: 'URL da API',
      placeholder: 'https://api-dashboard.maxpan.com.br',
      hint: 'Opcional. Em branco, usamos https://api-dashboard.maxpan.com.br.',
    }
  }

  if (slug === 'VMLAV' && field === 'merchantId') {
    return {
      label: 'CNPJ',
      placeholder: '00.000.000/0000-00',
      hint: 'Alguns tokens da VM Lav devolvem vendas de mais de um CNPJ. Informe qual deve ser importado. Se ficar vazio, usamos o CNPJ cadastrado na empresa.',
    }
  }
  if ((slug === 'WINDEL' || slug === 'WAYMONEY') && field === 'merchantId') {
    return { label: 'E-mail', placeholder: 'nome@empresa.com.br' }
  }
  if ((slug === 'WINDEL' || slug === 'WAYMONEY') && field === 'apiKey') {
    return { label: 'Senha', placeholder: 'Senha' }
  }
  if (slug === 'HYBEX_ESSENCE' && field === 'merchantId') {
    return {
      label: 'Código da loja (GUID)',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    }
  }
  if (slug === 'HYBEX_ESSENCE' && field === 'apiKey') {
    return {
      label: 'Chave de integração',
      placeholder: 'Chave de integração',
    }
  }
  if (field === 'password' || (slug === 'HYBEX_ESSENCE' && field === 'apiKey')) {
    return { label: 'ApiPassword', placeholder: 'ApiPassword' }
  }
  if (field === 'apiSecret') {
    return { label: 'Código da conta', placeholder: 'Código da conta' }
  }
  if (field === 'merchantId') {
    return { label: 'Código da loja', placeholder: 'Código da loja' }
  }
  if (field === 'digitalMenuUrl') {
    return { label: 'URL', placeholder: 'https://' }
  }
  return { label: 'Token / Apikey', placeholder: 'Token / Apikey' }
}
