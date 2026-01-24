import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Logger } from '@nestjs/common';
import { OpenRouterService } from '../shared/openrouter.service';
import { PrismaService } from '../prisma/prisma.service';

@Processor('search-sync')
export class SearchSyncProcessor extends WorkerHost {
    private readonly logger = new Logger(SearchSyncProcessor.name);

    constructor(
        private readonly elasticsearchService: ElasticsearchService,
        private readonly openRouterService: OpenRouterService,
        private readonly prisma: PrismaService,
    ) {
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
            // 🤖 Phase 6.2: Generate Semantic Embedding
            const embedding = await this.openRouterService.getEmbedding(
                `${product.name}. ${product.description || ''}`
            );

            if (embedding.length > 0) {
                await this.prisma.product.update({
                    where: { id: product.id },
                    data: { embedding: embedding as any } as any
                });
                this.logger.debug(`Generated and stored embedding for product ${product.id}`);
            }

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
                    embedding: embedding, // Store in ES for future vector searches
                },
            });
            this.logger.log(`Indexed product ${product.id} (Semantic)`);
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
