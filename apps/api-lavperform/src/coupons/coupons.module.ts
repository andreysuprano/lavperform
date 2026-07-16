import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CouponsController } from './presentation/coupons.controller';
import { CouponsService } from './application/coupons.service';
import { PrismaCouponRepository } from './infrastructure/persistence/prisma-coupon.repository';

@Module({
    imports: [PrismaModule],
    controllers: [CouponsController],
    providers: [
        CouponsService,
        {
            provide: 'ICouponRepository',
            useClass: PrismaCouponRepository,
        },
    ],
    exports: [CouponsService, 'ICouponRepository'],
})
export class CouponsModule {}
