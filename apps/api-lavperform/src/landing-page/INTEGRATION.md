# Guia de Integração - Landing Page com Companies

Este guia mostra como integrar o módulo Landing Page com o módulo Companies para criar automaticamente uma landing page quando uma nova empresa é cadastrada.

## Passo 1: Adicionar LandingPageModule ao CompaniesModule

Edite o arquivo `src/companies/companies.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CompaniesService } from './application/companies.service';
import { CompaniesController } from './presentation/companies.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LandingPageModule } from '../landing-page/landing-page.module'; // 👈 Adicionar
// ... outros imports

@Module({
  imports: [
    PrismaModule,
    PartnersModule,
    HttpModule,
    LandingPageModule, // 👈 Adicionar aqui
    // ... outros imports
  ],
  controllers: [CompaniesController],
  providers: [
    CompaniesService,
    {
      provide: 'ICompanyRepository',
      useClass: CompanyPrismaRepository
    }
  ],
  exports: [
    CompaniesService,
    'ICompanyRepository'
  ],
})
export class CompaniesModule { }
```

## Passo 2: Injetar LandingPageService no CompaniesService

Edite o arquivo `src/companies/application/companies.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { LandingPageService } from '../../landing-page/application/landing-page.service'; // 👈 Adicionar

@Injectable()
export class CompaniesService {
  private readonly logger: Logger;

  constructor(
    @Inject('ICompanyRepository')
    private readonly companyRepository: ICompanyRepository,
    private readonly landingPageService: LandingPageService, // 👈 Adicionar
    // ... outros injects
  ) {
    this.logger = new Logger(CompaniesService.name);
  }

  // ... outros métodos
}
```

## Passo 3: Criar Landing Page ao Cadastrar Empresa

No método que cria uma nova empresa, adicione a chamada para criar a landing page:

```typescript
async create(createCompanyDto: CreateCompanyDto) {
  this.logger.log('Criando nova empresa');

  // Criar a empresa primeiro
  const company = await this.companyRepository.create(createCompanyDto);

  // Criar landing page default automaticamente
  try {
    await this.landingPageService.createDefaultLandingPage(
      company.id,
      company.name,
      company.slug,
      company.address?.street || undefined, // ou company.address se for string
      company.phone || undefined
    );
    this.logger.log(`Landing page criada automaticamente para empresa: ${company.id}`);
  } catch (error) {
    this.logger.error(
      `Erro ao criar landing page para empresa ${company.id}: ${error.message}`,
      error.stack
    );
    // ⚠️ Não falhar a criação da empresa se a landing page falhar
    // A landing page pode ser criada manualmente depois
  }

  return company;
}
```

## Passo 4: Executar Migration do Prisma

Depois de adicionar o model LandingPage ao schema.prisma, execute:

```bash
# Gerar migration
npx prisma migrate dev --name add_landing_page

# Gerar Prisma Client
npx prisma generate
```

## Passo 5: Testar a Integração

### Criar uma nova empresa

```bash
POST /companies
Authorization: Bearer {token}

{
  "name": "Minha Lavanderia",
  "slug": "minha-lavanderia",
  "cnpj": "12345678000199",
  "email": "contato@minhalavanderia.com",
  "phone": "48999999999",
  "address": "R. das Flores, 123 - Centro"
}
```

### Verificar se a landing page foi criada

```bash
# Por slug (público)
GET /landing-page/slug/minha-lavanderia

# Por ID da empresa (autenticado)
GET /landing-page/company/{companyId}
Authorization: Bearer {token}
```

## Opcional: Criar Landing Pages para Empresas Existentes

Se você já tem empresas cadastradas antes de implementar esta feature, crie um script de migração:

```typescript
// src/scripts/create-missing-landing-pages.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CompaniesService } from '../companies/application/companies.service';
import { LandingPageService } from '../landing-page/application/landing-page.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const companiesService = app.get(CompaniesService);
  const landingPageService = app.get(LandingPageService);

  // Buscar todas as empresas
  const companies = await companiesService.findAll();

  for (const company of companies) {
    try {
      // Verificar se já tem landing page
      const existingLandingPages = await landingPageService.findAll(company.id);
      
      if (!existingLandingPages || existingLandingPages.length === 0) {
        // Criar landing page
        await landingPageService.createDefaultLandingPage(
          company.id,
          company.name,
          company.slug,
          company.address,
          company.phone
        );
        console.log(`✅ Landing page criada para: ${company.name}`);
      } else {
        console.log(`⏭️  Landing page já existe para: ${company.name}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao criar landing page para ${company.name}:`, error.message);
    }
  }

  await app.close();
  console.log('🎉 Script concluído!');
}

bootstrap();
```

Execute o script:

```bash
npx ts-node -r tsconfig-paths/register src/scripts/create-missing-landing-pages.ts
```

## Estrutura Final

Após a integração, a estrutura será:

```
Nova Empresa Criada
    ↓
CompaniesService.create()
    ↓
1. Criar Company no banco
    ↓
2. LandingPageService.createDefaultLandingPage()
    ↓
3. Landing Page criada com dados default
    ↓
✅ Empresa + Landing Page prontas!
```

## Troubleshooting

### Erro: Landing page já existe
- **Causa**: Tentativa de criar landing page duplicada
- **Solução**: O método `createDefaultLandingPage` já verifica se existe. Se o erro persistir, verifique o slug único.

### Erro: Company not found
- **Causa**: Company não foi criada corretamente antes da landing page
- **Solução**: Certifique-se que a company foi salva no banco antes de criar a landing page.

### Landing page não aparece
- **Causa**: Erro silencioso na criação (catch block)
- **Solução**: Verifique os logs da aplicação para identificar o erro real.

## Próximos Passos

1. ✅ Integração básica implementada
2. 🔄 Adicionar testes para garantir que landing page é criada
3. 🔄 Webhook/Event para desacoplar a criação (opcional)
4. 🔄 Background job para criar landing pages assincronamente (opcional)

## Notas Importantes

- ⚠️ A criação da landing page NÃO deve bloquear a criação da empresa
- ✅ Use try-catch para capturar erros e apenas logar
- 📝 Sempre logue o sucesso ou falha da criação
- 🔄 Landing pages podem ser criadas manualmente depois se necessário
