import { Module } from '@nestjs/common';
import { CatalogController, CategoriesController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CategorySpecService } from './category-spec.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchModule } from '../search/search.module';

@Module({
    imports: [SearchModule],
    controllers: [CatalogController, CategoriesController],
    providers: [CatalogService, CategorySpecService, PrismaService],
    exports: [CatalogService, CategorySpecService],
})
export class CatalogModule { }
