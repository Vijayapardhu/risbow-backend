import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AzureStorageService {
    private readonly logger = new Logger(AzureStorageService.name);
    private blobServiceClient: BlobServiceClient;

    constructor(private configService: ConfigService) {
        const accountName = this.configService.get<string>('AZURE_STORAGE_ACCOUNT_NAME');
        const accountKey = this.configService.get<string>('AZURE_STORAGE_ACCOUNT_KEY');

        if (accountName && accountKey) {
            const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
            this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            this.logger.log('✅ Azure Blob Storage client initialized');
        } else {
            this.logger.warn('Azure Storage credentials missing. Azure storage features will be unavailable.');
        }
    }

    private getContainerClient(containerName: string): ContainerClient {
        if (!this.blobServiceClient) {
            throw new InternalServerErrorException('Azure Storage client not initialized');
        }
        return this.blobServiceClient.getContainerClient(containerName);
    }

    async uploadFile(containerName: string, path: string, buffer: Buffer, contentType: string): Promise<string> {
        try {
            const containerClient = this.getContainerClient(containerName);

            // Ensure container exists
            await containerClient.createIfNotExists({
                access: 'blob',
            });

            const blockBlobClient = containerClient.getBlockBlobClient(path);
            await blockBlobClient.uploadData(buffer, {
                blobHTTPHeaders: { blobContentType: contentType },
            });

            return blockBlobClient.url;
        } catch (error) {
            this.logger.error(`Azure upload failed for ${path}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to upload file to Azure Storage');
        }
    }

    async deleteFile(containerName: string, path: string): Promise<void> {
        try {
            const containerClient = this.getContainerClient(containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(path);
            await blockBlobClient.delete();
        } catch (error) {
            this.logger.error(`Azure delete failed for ${path}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to delete file from Azure Storage');
        }
    }

    isEnabled(): boolean {
        return !!this.blobServiceClient;
    }
}
