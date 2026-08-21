import { Inject, NotFoundException } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { formatPhoneNumber } from '../../../common/utils/formatters';
import { CustomersService } from '../../../customers/application/customers.service';
import { ImportCustomSendListCustomerDto } from '../../application/dto/custom-send-list.dto';
import { ICustomSendListRepository } from '../../domain/custom-send-list.repository.interface';

type CustomSendListImportJob = {
  companyId: string;
  listId: string;
  customers: ImportCustomSendListCustomerDto[];
  replaceCustomerIds?: string[];
};

@Processor(QUEUE_NAMES.CUSTOM_SEND_LIST_IMPORT)
export class CustomSendListImportProcessor {
  constructor(
    private readonly customersService: CustomersService,
    @Inject('ICustomSendListRepository')
    private readonly customSendListRepository: ICustomSendListRepository,
  ) {}

  @Process({ name: 'process-import', concurrency: 5 })
  async handleImport(job: Job<CustomSendListImportJob>) {
    const { companyId, listId, customers, replaceCustomerIds } = job.data;
    const list = await this.customSendListRepository.findById(listId);

    if (!list || list.companyId !== companyId || list.deletedAt) {
      throw new NotFoundException('Lista personalizada não encontrada');
    }

    if (replaceCustomerIds) {
      await this.customSendListRepository.replaceMembers(
        listId,
        replaceCustomerIds,
      );
      // A substituição é destrutiva: sem consumir a instrução, uma nova tentativa
      // do job apagaria os clientes já importados nas tentativas anteriores.
      await job.update({ ...job.data, replaceCustomerIds: undefined });
    }

    let imported = 0;
    let rejected = 0;
    for (const customer of customers) {
      try {
        await this.importCustomer(companyId, listId, customer);
        imported += 1;
      } catch {
        rejected += 1;
      }
    }

    return { imported, rejected };
  }

  private async importCustomer(
    companyId: string,
    listId: string,
    customer: ImportCustomSendListCustomerDto,
  ) {
    const phone = formatPhoneNumber(customer.phone);
    let resolvedCustomer = await this.customersService.findByPhone(companyId, phone);

    if (!resolvedCustomer) {
      try {
        resolvedCustomer = await this.customersService.create(companyId, {
          ...customer,
          phone,
        });
      } catch (error) {
        resolvedCustomer = await this.customersService.findByPhone(companyId, phone);
        if (!resolvedCustomer) {
          throw error;
        }
      }
    }

    await this.customSendListRepository.addMember(listId, resolvedCustomer.id);
  }
}
