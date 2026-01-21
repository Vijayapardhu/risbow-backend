import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminProductController } from './admin-product.controller';
import { AdminProductService } from './admin-product.service';
import { MetricsController } from './metrics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { VendorsModule } from '../vendors/vendors.module';
import { QueuesModule } from '../queues/queues.module';
import { CategorySpecService } from '../catalog/category-spec.service';

@Module({
    imports: [PrismaModule, VendorsModule, QueuesModule],
    controllers: [AdminController, AdminDashboardController, AdminProductController, MetricsController],
    providers: [AdminService, AdminDashboardService, AdminProductService, CategorySpecService],
})
export class AdminModule { }
