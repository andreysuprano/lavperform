[← Documentation Home](../README.md)

# Repository Pattern Migration Guide

## Table of Contents
- [Overview](#overview)
- [Architectural Blueprint](#architectural-blueprint)
- [Refactoring Process](#refactoring-process)
- [Testing Strategy](#testing-strategy)
- [Implementation Steps](#implementation-steps)
- [Validation Checklist](#validation-checklist)
- [Common Pitfalls](#common-pitfalls)

---

## Overview

This document provides a complete specification for migrating NestJS services from **tightly coupled Prisma implementation** to a **decoupled Repository Pattern** following **Domain-Driven Design (DDD)** and **Clean Architecture** principles.

### Goals

1. ✅ Remove direct Prisma dependencies from service layer
2. ✅ Implement interface-based repository injection
3. ✅ Return domain entities instead of Prisma types
4. ✅ Encapsulate data access logic in repositories
5. ✅ Achieve 100% test coverage with proper mocking

### Benefits

- **Testability**: Easy to mock repositories for unit testing
- **Maintainability**: Clear separation of concerns
- **Flexibility**: Can swap data sources without changing business logic
- **Type Safety**: Domain entities provide better type contracts
- **Scalability**: Easier to add caching, logging, or other cross-cutting concerns

---

## Architectural Blueprint

### Folder Structure

Every refactored module MUST follow this exact structure:

```
src/[module]/
├── domain/                                    # Pure business logic - NO infrastructure
│   ├── [entity].entity.ts                     # Domain entity (plain TypeScript class)
│   └── [entity].repository.interface.ts       # Repository contract (interface)
│
├── infrastructure/persistence/                # Data access implementation
│   ├── prisma-[entity].repository.ts          # Prisma repository implementation
│   └── mappers/
│       └── [entity].mapper.ts                 # Prisma ↔ Domain transformation
│
├── application/                               # Business logic - uses repositories
│   ├── [name].service.ts                      # Service (NO Prisma references)
│   └── dto/
│       ├── create-[entity].dto.ts
│       └── update-[entity].dto.ts
│
├── presentation/                              # API layer
│   └── [name].controller.ts                   # HTTP endpoints
│
└── [module].module.ts                         # Module definition with providers
```

### Layer Responsibilities

#### 1. Domain Layer (`domain/`)
- **Pure business logic** - NO framework dependencies
- **Domain entities**: Plain TypeScript classes representing business concepts
- **Repository interfaces**: Contracts defining data access operations
- **Business rules**: Methods on entities that enforce domain logic

**Rules:**
- ❌ NO imports from `@prisma/client`
- ❌ NO imports from `@nestjs/*` (except decorators if needed)
- ❌ NO database-specific logic
- ✅ Only plain TypeScript/JavaScript

#### 2. Infrastructure Layer (`infrastructure/persistence/`)
- **Data access implementation** - Prisma-specific code lives here
- **Repositories**: Implement domain interfaces using PrismaService
- **Mappers**: Transform between Prisma models and domain entities

**Rules:**
- ✅ CAN import from `@prisma/client`
- ✅ CAN inject `PrismaService`
- ✅ MUST return domain entities (via mappers)
- ✅ MUST encapsulate ALL Prisma queries (includes, selects, raw queries)

#### 3. Application Layer (`application/`)
- **Business logic orchestration** - coordinates domain and infrastructure
- **Services**: Use repository interfaces for data access
- **Use cases**: Implement business workflows

**Rules:**
- ❌ NO direct Prisma imports
- ❌ NO PrismaService injection
- ✅ MUST inject repositories via interfaces (`@Inject('IEntityRepository')`)
- ✅ MUST work with domain entities

#### 4. Presentation Layer (`presentation/`)
- **HTTP/API layer** - controllers, guards, pipes
- **DTOs**: Request/response objects for API contracts

---

## Refactoring Process

### Phase 1: Analysis

#### 1.1 Identify Entities
Examine the service to identify all Prisma models accessed:

```typescript
// Example: In auth.service.ts
this.prisma.user.findUnique()           // → UserEntity
this.prisma.confirmationCode.create()   // → ConfirmationCodeEntity
```

#### 1.2 List All Prisma Operations
Document every Prisma operation used:

```typescript
// User operations
- findUnique({ where: { email }, include: { userCompanies, accessRules } })
- findUnique({ where: { email } })
- update({ where: { id }, data: { password } })

// ConfirmationCode operations
- create({ data: { code, userId } })
- findFirst({ where: { code, used: false } })
- update({ where: { id }, data: { used: true } })
```

#### 1.3 Analyze Prisma Schema
Review the Prisma schema for entity relationships:

```prisma
model User {
  id            String        @id @default(uuid())
  email         String        @unique
  name          String
  password      String
  userCompanies UserCompany[]
  accessRules   AccessRule[]
}
```

### Phase 2: Domain Layer Creation

#### 2.1 Create Domain Entities

**Template:**
```typescript
// src/[module]/domain/[entity].entity.ts

export class EntityNameEntity {
  constructor(
    public readonly id: string,
    public readonly field1: string,
    public readonly field2: number,
    public readonly relatedData?: RelatedType[],
    // ... all fields from Prisma model
  ) {}

  // Business logic methods
  methodName(): boolean {
    // Domain logic here
    return true;
  }
}
```

**Example:**
```typescript
// src/auth/domain/user.entity.ts

export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly phone: string,
    public readonly password: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly userCompanies?: UserCompanyData[],
    public readonly accessRules?: AccessRule[],
  ) {}

  hasCompanies(): boolean {
    return this.userCompanies !== undefined && this.userCompanies.length > 0;
  }

  getActiveCompany(): UserCompanyData['company'] | null {
    if (!this.hasCompanies()) {
      return null;
    }
    return this.userCompanies![0].company;
  }
}
```

**Guidelines:**
- Use `readonly` for immutability
- Include ALL fields from Prisma model
- Add optional `?` for nullable or optional relations
- Add business methods that operate on entity data
- Keep it framework-agnostic

#### 2.2 Create Repository Interfaces

**Template:**
```typescript
// src/[module]/domain/[entity].repository.interface.ts

import { EntityNameEntity } from './[entity].entity';

export interface IEntityNameRepository {
  /**
   * Method description
   */
  methodName(param: string): Promise<EntityNameEntity | null>;

  // ... all data access methods needed by the service
}
```

**Naming Convention for Methods:**
- `findByX()` - Query by specific field
- `findByXWithY()` - Query with specific relations included
- `create()` - Create new record
- `update()` - Update existing record
- `delete()` - Remove record
- `count()` - Count records
- `exists()` - Check existence

**Example:**
```typescript
// src/auth/domain/user.repository.interface.ts

import { UserEntity } from './user.entity';

export interface IUserRepository {
  /**
   * Finds a user by email with all their companies and access rules
   */
  findByEmailWithCompaniesAndRules(email: string): Promise<UserEntity | null>;

  /**
   * Finds a user by email without relations
   */
  findByEmail(email: string): Promise<UserEntity | null>;

  /**
   * Updates a user's password
   */
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
}
```

**Guidelines:**
- Use descriptive names that reveal intent
- Document each method with JSDoc comments
- Return domain entities, NOT Prisma types
- Use `Promise<void>` for operations without return value
- Consider `| null` for queries that might not find results

### Phase 3: Infrastructure Layer Creation

#### 3.1 Create Mappers

**Template:**
```typescript
// src/[module]/infrastructure/persistence/mappers/[entity].mapper.ts

import { PrismaModel, RelatedModel } from '@prisma/client';
import { EntityNameEntity } from '../../../domain/[entity].entity';

type PrismaModelWithRelations = PrismaModel & {
  relatedField?: RelatedModel[];
};

export class EntityNameMapper {
  static toDomain(prismaModel: PrismaModelWithRelations): EntityNameEntity {
    // Transform Prisma model to domain entity
    return new EntityNameEntity(
      prismaModel.id,
      prismaModel.field1,
      // ... map all fields
    );
  }

  static toDomainArray(prismaModels: PrismaModelWithRelations[]): EntityNameEntity[] {
    return prismaModels.map((model) => this.toDomain(model));
  }
}
```

**Example:**
```typescript
// src/auth/infrastructure/persistence/mappers/user.mapper.ts

import { User, UserCompany, Company, AccessRule } from '@prisma/client';
import { UserEntity, UserCompanyData } from '../../../domain/user.entity';

type PrismaUserWithRelations = User & {
  userCompanies?: (UserCompany & { company: Company })[];
  accessRules?: AccessRule[];
};

export class UserMapper {
  static toDomain(prismaUser: PrismaUserWithRelations): UserEntity {
    const userCompanies: UserCompanyData[] | undefined = prismaUser.userCompanies?.map(
      (uc) => ({
        id: uc.id,
        companyId: uc.companyId,
        company: {
          id: uc.company.id,
          name: uc.company.name,
          avatarUrl: uc.company.avatarUrl,
          slug: uc.company.slug,
        },
      }),
    );

    const accessRules = prismaUser.accessRules?.map(
      (rule) => ({
        module: rule.module,
        action: rule.action,
      }),
    );

    return new UserEntity(
      prismaUser.id,
      prismaUser.email,
      prismaUser.name,
      prismaUser.phone,
      prismaUser.password,
      prismaUser.createdAt,
      prismaUser.updatedAt,
      userCompanies,
      accessRules,
    );
  }

  static toDomainArray(prismaUsers: PrismaUserWithRelations[]): UserEntity[] {
    return prismaUsers.map((user) => this.toDomain(user));
  }
}
```

**Guidelines:**
- Create TypeScript types for Prisma models with relations
- Handle optional/nullable fields properly
- Map nested relations carefully
- Provide both single and array transformation methods
- Keep mappers stateless (static methods only)

#### 3.2 Create Repository Implementations

**Template:**
```typescript
// src/[module]/infrastructure/persistence/prisma-[entity].repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IEntityNameRepository } from '../../domain/[entity].repository.interface';
import { EntityNameEntity } from '../../domain/[entity].entity';
import { EntityNameMapper } from './mappers/[entity].mapper';

@Injectable()
export class PrismaEntityNameRepository implements IEntityNameRepository {
  constructor(private readonly prisma: PrismaService) {}

  async methodName(param: string): Promise<EntityNameEntity | null> {
    const result = await this.prisma.modelName.operation({
      // Prisma query here
    });

    return result ? EntityNameMapper.toDomain(result) : null;
  }
}
```

**Example:**
```typescript
// src/auth/infrastructure/persistence/prisma-user.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IUserRepository } from '../../domain/user.repository.interface';
import { UserEntity } from '../../domain/user.entity';
import { UserMapper } from './mappers/user.mapper';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmailWithCompaniesAndRules(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userCompanies: {
          include: {
            company: true,
          },
        },
        accessRules: true,
      },
    });

    return user ? UserMapper.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? UserMapper.toDomain(user) : null;
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
}
```

**Guidelines:**
- Encapsulate ALL Prisma-specific logic (includes, selects, raw queries)
- ALWAYS use mapper to return domain entities
- Handle null cases appropriately
- Use descriptive variable names
- Keep each method focused on a single operation

### Phase 4: Service Layer Refactoring

#### 4.1 Update Service Constructor

**Before:**
```typescript
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}
}
```

**After:**
```typescript
@Injectable()
export class AuthService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IConfirmationCodeRepository')
    private readonly confirmationCodeRepository: IConfirmationCodeRepository,
    private readonly jwtService: JwtService,
  ) {}
}
```

**Guidelines:**
- Remove PrismaService injection
- Inject repositories using `@Inject('IRepositoryName')`
- Use `private readonly` for repository properties
- Keep other dependencies as needed

#### 4.2 Replace Prisma Calls with Repository Methods

**Before:**
```typescript
async validateUser(email: string, password: string) {
  const user = await this.prisma.user.findUnique({
    where: { email },
    include: {
      userCompanies: {
        include: {
          company: true,
        },
      },
      accessRules: true,
    },
  });

  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
  }

  return user;
}
```

**After:**
```typescript
async validateUser(email: string, password: string): Promise<UserEntity> {
  const user = await this.userRepository.findByEmailWithCompaniesAndRules(email);

  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
  }

  return user; // Returns UserEntity
}
```

**Guidelines:**
- Replace `this.prisma.model.*` with `this.repository.*`
- Update return types to domain entities
- Remove complex includes/selects (now in repository)
- Keep business logic unchanged
- Use entity methods where applicable

#### 4.3 Update Module Providers

**Before:**
```typescript
@Module({
  imports: [PrismaModule],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

**After:**
```typescript
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { PrismaConfirmationCodeRepository } from './infrastructure/persistence/prisma-confirmation-code.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    AuthService,
    {
      provide: 'IUserRepository',
      useClass: PrismaUserRepository,
    },
    {
      provide: 'IConfirmationCodeRepository',
      useClass: PrismaConfirmationCodeRepository,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
```

**Guidelines:**
- Keep PrismaModule import (needed by repositories)
- Add repository providers with interface tokens
- Token naming: `'I[Entity]Repository'`
- Use `useClass` to bind implementation

---

## Testing Strategy

### Test Structure

Mirror the source code structure in tests:

```
test/unit/[module]/
├── [service].service.spec.ts                  # Service tests
├── domain/
│   ├── [entity].entity.spec.ts                # Entity tests
│   └── [entity].repository.interface.spec.ts  # (optional)
└── infrastructure/persistence/
    ├── mappers/
    │   └── [entity].mapper.spec.ts            # Mapper tests
    └── prisma-[entity].repository.spec.ts     # Repository tests
```

### 1. Domain Entity Tests

**Purpose:** Validate business logic methods on entities

**Template:**
```typescript
import { EntityNameEntity } from 'src/[module]/domain/[entity].entity';

describe('EntityNameEntity', () => {
  describe('constructor', () => {
    it('should create entity with all fields', () => {
      const entity = new EntityNameEntity(
        'id',
        'field1',
        'field2',
      );

      expect(entity.id).toBe('id');
      expect(entity.field1).toBe('field1');
    });
  });

  describe('businessMethod', () => {
    it('should return true when condition is met', () => {
      const entity = new EntityNameEntity(/* ... */);

      expect(entity.businessMethod()).toBe(true);
    });

    it('should return false when condition is not met', () => {
      const entity = new EntityNameEntity(/* ... */);

      expect(entity.businessMethod()).toBe(false);
    });
  });
});
```

**Example:**
```typescript
import { UserEntity } from 'src/auth/domain/user.entity';

describe('UserEntity', () => {
  describe('hasCompanies', () => {
    it('should return true when user has companies', () => {
      const user = new UserEntity(
        'user-1',
        'test@example.com',
        'John Doe',
        '+5511999999999',
        'hashed_password',
        new Date(),
        new Date(),
        [{ id: 'uc-1', companyId: 'c-1', company: { /* ... */ } }],
      );

      expect(user.hasCompanies()).toBe(true);
    });

    it('should return false when userCompanies is undefined', () => {
      const user = new UserEntity(
        'user-1',
        'test@example.com',
        'John Doe',
        '+5511999999999',
        'hashed_password',
        new Date(),
        new Date(),
      );

      expect(user.hasCompanies()).toBe(false);
    });
  });
});
```

### 2. Mapper Tests

**Purpose:** Ensure correct transformation between Prisma and domain

**Template:**
```typescript
import { EntityNameMapper } from 'src/[module]/infrastructure/persistence/mappers/[entity].mapper';
import { PrismaModel } from '@prisma/client';
import { EntityNameEntity } from 'src/[module]/domain/[entity].entity';

describe('EntityNameMapper', () => {
  const mockPrismaModel: PrismaModel = {
    id: 'id-1',
    field1: 'value1',
    // ... all fields
  };

  describe('toDomain', () => {
    it('should map Prisma model to domain entity', () => {
      const entity = EntityNameMapper.toDomain(mockPrismaModel);

      expect(entity).toBeInstanceOf(EntityNameEntity);
      expect(entity.id).toBe('id-1');
      expect(entity.field1).toBe('value1');
    });

    it('should handle optional fields', () => {
      const modelWithNulls = { ...mockPrismaModel, optionalField: null };

      const entity = EntityNameMapper.toDomain(modelWithNulls);

      expect(entity.optionalField).toBeNull();
    });
  });

  describe('toDomainArray', () => {
    it('should map array of Prisma models', () => {
      const entities = EntityNameMapper.toDomainArray([mockPrismaModel]);

      expect(entities).toHaveLength(1);
      expect(entities[0]).toBeInstanceOf(EntityNameEntity);
    });
  });
});
```

### 3. Repository Tests

**Purpose:** Validate repository methods with mocked Prisma

**Template:**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaEntityNameRepository } from 'src/[module]/infrastructure/persistence/prisma-[entity].repository';
import { PrismaService } from 'src/prisma/prisma.service';

describe('PrismaEntityNameRepository', () => {
  let repository: PrismaEntityNameRepository;
  let prismaService: PrismaService;

  const mockPrismaService = {
    modelName: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaEntityNameRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<PrismaEntityNameRepository>(PrismaEntityNameRepository);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return domain entity when found', async () => {
      const mockPrismaResult = { id: '1', field: 'value' };
      mockPrismaService.modelName.findUnique.mockResolvedValue(mockPrismaResult);

      const result = await repository.findById('1');

      expect(prismaService.modelName.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toBeDefined();
      expect(result!.id).toBe('1');
    });

    it('should return null when not found', async () => {
      mockPrismaService.modelName.findUnique.mockResolvedValue(null);

      const result = await repository.findById('999');

      expect(result).toBeNull();
    });
  });
});
```

### 4. Service Tests (Refactored)

**Purpose:** Validate business logic with mocked repositories

**Template:**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceName } from 'src/[module]/application/[service].service';
import { IEntityRepository } from 'src/[module]/domain/[entity].repository.interface';
import { EntityNameEntity } from 'src/[module]/domain/[entity].entity';

describe('ServiceName', () => {
  let service: ServiceName;
  let repository: IEntityRepository;

  const mockRepository = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        {
          provide: 'IEntityRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
    repository = module.get<IEntityRepository>('IEntityRepository');

    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should perform expected operation', async () => {
      const mockEntity = new EntityNameEntity(/* ... */);
      mockRepository.findById.mockResolvedValue(mockEntity);

      const result = await service.methodName('id');

      expect(repository.findById).toHaveBeenCalledWith('id');
      expect(result).toEqual(mockEntity);
    });

    it('should throw error when entity not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.methodName('999')).rejects.toThrow();
    });
  });
});
```

**Key Testing Guidelines:**
- Mock ALL external dependencies
- Test both success and failure paths
- Verify correct method calls with `toHaveBeenCalledWith`
- Test edge cases (null, undefined, empty arrays)
- Use `beforeEach` to reset mocks
- Use descriptive test names

---

## Implementation Steps

### Step-by-Step Checklist

#### Step 1: Analysis Phase
- [ ] Read the service file completely
- [ ] List all Prisma models accessed
- [ ] Document all Prisma operations (findUnique, create, update, etc.)
- [ ] Identify complex queries (includes, selects, raw SQL)
- [ ] Check Prisma schema for relationships
- [ ] Create a list of required repository methods

#### Step 2: Domain Layer
- [ ] Create `domain/` directory in module
- [ ] Create entity class for each Prisma model
  - [ ] Add all fields from Prisma schema
  - [ ] Include optional relations
  - [ ] Add business logic methods
- [ ] Create repository interface for each entity
  - [ ] Define methods based on service needs
  - [ ] Use descriptive method names
  - [ ] Add JSDoc comments

#### Step 3: Infrastructure Layer
- [ ] Create `infrastructure/persistence/` directory
- [ ] Create `mappers/` subdirectory
- [ ] For each entity:
  - [ ] Create mapper class
    - [ ] Implement `toDomain()` static method
    - [ ] Implement `toDomainArray()` static method
    - [ ] Handle all fields and relations
  - [ ] Create repository implementation
    - [ ] Inject PrismaService
    - [ ] Implement all interface methods
    - [ ] Use mapper in each method
    - [ ] Encapsulate Prisma queries

#### Step 4: Service Refactoring
- [ ] Update service constructor
  - [ ] Remove PrismaService injection
  - [ ] Add repository injections with `@Inject`
  - [ ] Update property declarations
- [ ] Update each service method
  - [ ] Replace Prisma calls with repository calls
  - [ ] Update return types to domain entities
  - [ ] Use entity methods for business logic
- [ ] Remove unused Prisma imports
- [ ] Add new domain/repository imports

#### Step 5: Module Configuration
- [ ] Import repository classes in module
- [ ] Add repository providers
  - [ ] Use interface tokens
  - [ ] Bind to implementation classes
- [ ] Verify PrismaModule is imported

#### Step 6: Testing
- [ ] Create test directory structure
- [ ] Write domain entity tests
  - [ ] Test constructor
  - [ ] Test business methods
  - [ ] Test edge cases
- [ ] Write mapper tests
  - [ ] Test toDomain transformation
  - [ ] Test with relations
  - [ ] Test null handling
  - [ ] Test array transformation
- [ ] Write repository tests
  - [ ] Mock PrismaService
  - [ ] Test each repository method
  - [ ] Verify Prisma calls
  - [ ] Verify domain entity return
- [ ] Update/create service tests
  - [ ] Mock repositories
  - [ ] Test business logic
  - [ ] Test error handling
  - [ ] Verify repository calls
- [ ] Run tests: `npm run test:unit -- test/unit/[module]`
- [ ] Verify 100% pass rate

#### Step 7: Verification
- [ ] Run TypeScript compiler: `npm run build`
- [ ] Run all unit tests: `npm run test:unit`
- [ ] Run integration tests if available
- [ ] Check no Prisma imports in service files
- [ ] Verify all repository methods return domain entities
- [ ] Code review checklist (see below)

---
## Validation Checklist

### Code Review Checklist

#### Domain Layer ✅
- [ ] Entities are plain TypeScript classes (no framework dependencies)
- [ ] All fields from Prisma model are included
- [ ] Optional fields are marked with `?`
- [ ] Business logic methods are present and tested
- [ ] No imports from `@prisma/client`
- [ ] No imports from infrastructure layer

#### Repository Interfaces ✅
- [ ] Methods have descriptive names
- [ ] All methods return `Promise<>`
- [ ] Return types use domain entities, NOT Prisma types
- [ ] JSDoc comments explain each method
- [ ] Interface naming: `I[Entity]Repository`

#### Mappers ✅
- [ ] Static methods only (stateless)
- [ ] `toDomain()` method transforms single model
- [ ] `toDomainArray()` method transforms array
- [ ] All fields are mapped correctly
- [ ] Nested relations are handled
- [ ] Null/undefined values handled properly

#### Repository Implementations ✅
- [ ] Implements the corresponding interface
- [ ] Injects `PrismaService`
- [ ] ALL Prisma queries encapsulated here
- [ ] Uses mapper to return domain entities
- [ ] No business logic present
- [ ] Complex queries (includes, selects) are here

#### Service Layer ✅
- [ ] NO `PrismaService` injection
- [ ] Repositories injected with `@Inject('IRepository')`
- [ ] NO direct Prisma imports
- [ ] Methods return domain entities
- [ ] Business logic is clear and focused
- [ ] Uses entity methods where appropriate

#### Module Configuration ✅
- [ ] Repository providers registered
- [ ] Interface tokens used: `'I[Entity]Repository'`
- [ ] `useClass` binds to implementation
- [ ] PrismaModule still imported (for repositories)

#### Tests ✅
- [ ] Entity tests cover all business methods
- [ ] Mapper tests verify transformations
- [ ] Repository tests mock PrismaService
- [ ] Service tests mock repositories
- [ ] All edge cases covered
- [ ] 100% test pass rate

---

## Common Pitfalls

### ❌ Pitfall 1: Returning Prisma Types from Repositories

**Wrong:**
```typescript
async findByEmail(email: string): Promise<User> {  // ← Prisma type!
  return await this.prisma.user.findUnique({
    where: { email },
  });
}
```

**Correct:**
```typescript
async findByEmail(email: string): Promise<UserEntity | null> {
  const user = await this.prisma.user.findUnique({
    where: { email },
  });

  return user ? UserMapper.toDomain(user) : null;
}
```

### ❌ Pitfall 2: Business Logic in Repositories

**Wrong:**
```typescript
async findActiveUsers(): Promise<UserEntity[]> {
  const users = await this.prisma.user.findMany();

  // Business logic in repository!
  return users
    .filter(u => u.lastLoginDate > thirtyDaysAgo)
    .map(u => UserMapper.toDomain(u));
}
```

**Correct:**
```typescript
// Repository: Simple data access
async findAll(): Promise<UserEntity[]> {
  const users = await this.prisma.user.findMany();
  return UserMapper.toDomainArray(users);
}

// Service: Business logic
async getActiveUsers(): Promise<UserEntity[]> {
  const allUsers = await this.userRepository.findAll();
  return allUsers.filter(u => u.isActive());  // Entity method
}
```

### ❌ Pitfall 3: Not Using Interface Tokens

**Wrong:**
```typescript
constructor(
  private userRepository: PrismaUserRepository,  // ← Concrete class!
) {}
```

**Correct:**
```typescript
constructor(
  @Inject('IUserRepository')
  private readonly userRepository: IUserRepository,  // ← Interface!
) {}
```

### ❌ Pitfall 4: Forgetting to Update Module Providers

**Wrong:**
```typescript
@Module({
  providers: [
    AuthService,
    PrismaUserRepository,  // ← Not bound to interface!
  ],
})
```

**Correct:**
```typescript
@Module({
  providers: [
    AuthService,
    {
      provide: 'IUserRepository',
      useClass: PrismaUserRepository,
    },
  ],
})
```

### ❌ Pitfall 5: Complex Includes in Service

**Wrong:**
```typescript
// Service calling repository
const user = await this.userRepository.findByEmail(email);
// Then manually loading relations...
```

**Correct:**
```typescript
// Repository has method with includes
async findByEmailWithCompaniesAndRules(email: string): Promise<UserEntity | null> {
  const user = await this.prisma.user.findUnique({
    where: { email },
    include: {
      userCompanies: { include: { company: true } },
      accessRules: true,
    },
  });
  return user ? UserMapper.toDomain(user) : null;
}

// Service just calls it
const user = await this.userRepository.findByEmailWithCompaniesAndRules(email);
```

### ❌ Pitfall 6: Not Mocking Repositories in Tests

**Wrong:**
```typescript
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(/* what to pass here? */);
  });
});
```

**Correct:**
```typescript
describe('AuthService', () => {
  let service: AuthService;
  let userRepository: IUserRepository;

  const mockUserRepository = {
    findByEmail: jest.fn(),
    // ... other methods
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<IUserRepository>('IUserRepository');
  });
});
```

---

## Success Metrics

After completing the refactoring, verify these metrics:

### Code Quality Metrics
- ✅ **0** Prisma imports in service files
- ✅ **100%** repository methods return domain entities
- ✅ **0** direct Prisma calls in services
- ✅ **100%** test coverage for new code

### Test Metrics
- ✅ All unit tests passing
- ✅ Service tests mock repositories (not Prisma)
- ✅ Repository tests mock PrismaService
- ✅ Entity tests cover business methods

### Architecture Compliance
- ✅ Clear separation between layers
- ✅ Domain layer has no framework dependencies
- ✅ Infrastructure encapsulates all data access
- ✅ Services depend on abstractions (interfaces)

---

## Migration Roadmap

### Priority Levels

Based on the scan report, tackle modules in this order:

#### Phase 1: High Severity (Direct Prisma Usage)
1. `src/auth` ✅ **COMPLETED**
2. `src/metrics`
3. `src/dashboard`
4. `src/application`

#### Phase 2: Medium Severity (Hybrid Usage)
5. `src/onboarding`
6. `src/companies`
7. `src/automatic-campaign`
8. `src/link-page`
9. `src/courses`

#### Phase 3: Low Severity
10. Other modules as needed

---

## Conclusion

This specification provides a complete blueprint for migrating from Prisma-coupled services to a clean Repository Pattern architecture. By following these steps consistently, you will achieve:

- ✅ **Testable code** - Easy to mock and unit test
- ✅ **Maintainable architecture** - Clear separation of concerns
- ✅ **Flexible design** - Easy to swap implementations
- ✅ **Type safety** - Domain entities provide contracts
- ✅ **Consistent patterns** - Same structure across all modules

**Remember:** Quality over speed. Take time to do it right the first time, and the benefits will compound across the entire codebase.

---

## Additional Resources

### Recommended Reading
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)

### Internal References
- [Auth Module Refactoring](../src/auth/) - Complete working example
- [Test Examples](../../test/unit/auth/) - Comprehensive test suite

---

**Document Version:** 1.0
**Last Updated:** December 2024
**Author:** Claude (AI Assistant)
**Status:** ✅ Approved for Production Use

---

## See Also

- [Repository Pattern Examples](../reference/repository-pattern-examples.md) - Complete code samples and templates
- [Testing Guide](./testing-guide.md) - Testing repositories and services
- [Technical Backlog](../planning/technical-backlog.md) - Architecture improvements

---
**Navigation:** [← Home](../README.md) | [Code Examples →](../reference/repository-pattern-examples.md)
