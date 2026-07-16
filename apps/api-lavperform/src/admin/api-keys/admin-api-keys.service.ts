import { Injectable } from '@nestjs/common';
import { PublicApiKeysService } from '../../public-api/api-keys/public-api-keys.service';
import { CreatePublicApiKeyDto } from '../../public-api/api-keys/dto/create-public-api-key.dto';

@Injectable()
export class AdminApiKeysService {
  constructor(private readonly publicApiKeysService: PublicApiKeysService) {}

  list(companyId: string) {
    return this.publicApiKeysService.list(companyId);
  }

  getActive(companyId: string) {
    return this.publicApiKeysService.getActive(companyId);
  }

  create(companyId: string, dto: CreatePublicApiKeyDto) {
    return this.publicApiKeysService.create(companyId, dto);
  }

  rotate(companyId: string, dto: CreatePublicApiKeyDto = {}) {
    return this.publicApiKeysService.rotate(companyId, dto);
  }

  revoke(companyId: string, id: string) {
    return this.publicApiKeysService.revoke(companyId, id);
  }

  remove(companyId: string, id: string) {
    return this.publicApiKeysService.remove(companyId, id);
  }
}
