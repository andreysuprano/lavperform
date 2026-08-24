import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { WhatsappService } from 'src/whatsapp/application/whatsapp.service';
import { getDayOfWeekPtBr } from 'src/common/utils/date.utils';
import { IUserRepository } from '../auth/domain/user.repository.interface';

@Injectable()
export class ApplicationService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly whatsappService: WhatsappService,
  ) { }

  async getUserCompanies(userId: string) {
    if (!userId) {
      throw new NotFoundException('ID do usuário não informado');
    }

    const user = await this.userRepository.findByIdWithCompaniesAndAddress(userId);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (!user.userCompanies) {
      return { companies: [] };
    }

    // Extract and format company data from domain entity
    const companies = user.userCompanies
      .map(uc => ({
        id: uc.company.id,
        name: uc.company.name,
        cnpj: uc.company.cnpj,
        email: uc.company.email,
        phone: uc.company.phone,
        avatarUrl: uc.company.avatarUrl,
        address: uc.company.address,
        slug: uc.company.slug,
        showIncentivizedSales: uc.company.showIncentivizedSales !== false,
        showTodayPurchases: uc.company.showTodayPurchases !== false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    return { companies };
  }


  async getMessage() {
    return getDayOfWeekPtBr();
  }
} 