import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogController, GiftsController } from './catalog.controller';
import { WholesaleController } from './wholesale.controller';

@Module({
    controllers: [CatalogController, GiftsController, WholesaleController],
    providers: [CatalogService],
    exports: [CatalogService],
})
export class CatalogModule { }
