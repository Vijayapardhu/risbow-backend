import { UploadService } from './upload.service';
import { SingleImageUploadDto, MultipleImageUploadDto, DocumentUploadDto } from './dto/upload.dto';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    uploadImage(file: Express.Multer.File, dto: SingleImageUploadDto): Promise<{
        url: string;
        path: string;
    }>;
    uploadMultipleImages(files: Array<Express.Multer.File>, dto: MultipleImageUploadDto): Promise<({
        url: string;
        path: string;
        originalName: string;
        status: string;
        error?: undefined;
    } | {
        originalName: string;
        status: string;
        error: any;
    })[]>;
    uploadDocument(req: any, file: Express.Multer.File, dto: DocumentUploadDto): Promise<{
        url: string;
        path: string;
    }>;
    deleteFile(path: string): Promise<{
        message: string;
    }>;
}
