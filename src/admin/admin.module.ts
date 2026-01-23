import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminProductController } from './admin-product.controller';
import { AdminProductService } from './admin-product.service';
import { MetricsController } from './metrics.controller';
import { BowAdminController } from './bow-admin.controller';
import { BowAdminService } from './bow-admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VendorsModule } from '../vendors/vendors.module';
import { QueuesModule } from '../queues/queues.module';
import { BowModule } from '../bow/bow.module';
import { CategorySpecService } from '../catalog/category-spec.service';

@Module({
    imports: [PrismaModule, VendorsModule, QueuesModule, BowModule],
    controllers: [AdminController, AdminDashboardController, AdminProductController, MetricsController, BowAdminController],
    providers: [AdminService, AdminDashboardService, AdminProductService, CategorySpecService, BowAdminService],
})
export class AdminModule { }
