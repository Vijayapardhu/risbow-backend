import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminProductController } from './admin-product.controller';
import { AdminProductService } from './admin-product.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
    imports: [PrismaModule, VendorsModule],
    controllers: [AdminController, AdminDashboardController, AdminProductController],
    providers: [AdminService, AdminDashboardService, AdminProductService],
})
export class AdminModule { }
