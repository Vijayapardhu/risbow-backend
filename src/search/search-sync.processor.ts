import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Logger } from '@nestjs/common';

@Processor('search-sync')
export class SearchSyncProcessor extends WorkerHost {
    private readonly logger = new Logger(SearchSyncProcessor.name);

    constructor(private readonly elasticsearchService: ElasticsearchService) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.debug(`Processing sync job ${job.id} of type ${job.name}`);

        switch (job.name) {
            case 'index-product':
                return this.handleIndexProduct(job.data);
            case 'delete-product':
                return this.handleDeleteProduct(job.data);
            default:
                this.logger.warn(`Unknown job type: ${job.name}`);
        }
    }

    private async handleIndexProduct(product: any) {
        try {
            await this.elasticsearchService.index({
                index: 'products_v1',
                id: product.id,
                document: {
                    id: product.id,
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    category: product.category?.name,
                    vendor: product.vendor?.name,
                    popularityScore: product.popularityScore,
                    createdAt: product.createdAt,
                },
            });
            this.logger.log(`Indexed product ${product.id}`);
        } catch (error) {
            this.logger.error(`Failed to index product ${product.id}`, error);
            throw error;
        }
    }

    private async handleDeleteProduct(data: { id: string }) {
        try {
            await this.elasticsearchService.delete({
                index: 'products_v1',
                id: data.id,
            });
            this.logger.log(`Deleted product ${data.id} from index`);
        } catch (error) {
            this.logger.error(`Failed to delete product ${data.id}`, error);
            // Ignore 404
        }
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job) {
        this.logger.debug(`Job ${job.id} completed`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, err: any) {
        this.logger.error(`Job ${job.id} failed: ${err.message}`);
    }
}
