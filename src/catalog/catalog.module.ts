import { Module } from '@nestjs/common';
import { CatalogController, CategoriesController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CategorySpecService } from './category-spec.service';
import { BuyLaterService } from './buy-later.service';
import { BuyLaterController } from './buy-later.controller';
import { PrismaService } from '../prisma/prisma.service';
import { SearchModule } from '../search/search.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [SearchModule, InventoryModule],
    controllers: [CatalogController, CategoriesController, BuyLaterController],
    providers: [CatalogService, CategorySpecService, BuyLaterService, PrismaService],
    exports: [CatalogService, CategorySpecService, BuyLaterService],
})
export class CatalogModule { }
