import { SupabaseService } from '../shared/supabase.service';
import { UploadContext } from './dto/upload.dto';
export declare class UploadService {
    private readonly supabaseService;
    private readonly logger;
    private readonly BUCKET_NAME;
    constructor(supabaseService: SupabaseService);
    private getClient;
    uploadImage(file: Express.Multer.File, context: UploadContext, contextId: string): Promise<{
        url: string;
        path: string;
    }>;
    uploadDocument(file: Express.Multer.File, userId: string, documentType: string): Promise<{
        url: string;
        path: string;
    }>;
    deleteFile(path: string): Promise<{
        message: string;
    }>;
}
