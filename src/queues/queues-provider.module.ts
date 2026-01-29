import { DynamicModule, Module } from '@nestjs/common';
import { QueuesService } from './queues.service';
import { QueuesModule } from './queues.module';
import { QueuesStubModule } from './queues-stub.module';

/**
 * Provides QueuesService from either QueuesStubModule (Redis disabled) or QueuesModule (Redis enabled).
 * Import this in any module that needs QueuesService (e.g. AdminModule) so DI resolves correctly.
 */
@Module({})
export class QueuesProviderModule {
    static forRoot(): DynamicModule {
        const useStub =
            process.env.NODE_ENV === 'test' ||
            !process.env.REDIS_HOST ||
            process.env.DISABLE_REDIS === 'true' ||
            process.env.DISABLE_REDIS === '1';
        return {
            module: QueuesProviderModule,
            imports: [useStub ? QueuesStubModule : QueuesModule],
            exports: [QueuesService],
        };
    }
}
