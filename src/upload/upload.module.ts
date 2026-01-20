import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { SharedModule } from '../shared/shared.module';

@Module({
    imports: [SharedModule],
    controllers: [UploadController],
    providers: [UploadService],
    exports: [UploadService]
})
export class UploadModule { }
