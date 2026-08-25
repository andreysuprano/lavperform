export class CustomSendList {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<CustomSendList>) {
    Object.assign(this, partial);
  }
}
