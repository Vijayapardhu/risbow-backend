import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
    imports: [], // SharedModule is @Global(), so SupabaseService and AzureStorageService are available
    controllers: [UploadController],
    providers: [UploadService],
    exports: [UploadService]
})
export class UploadModule { }
