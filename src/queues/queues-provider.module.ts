import { DynamicModule, Module } from '@nestjs/common';
import { QueuesModule } from './queues.module';
import { QueuesStubModule } from './queues-stub.module';

/**
 * Provides QueuesService from either QueuesStubModule (Redis disabled) or QueuesModule (Redis enabled).
 * Re-exports the chosen module so consumers get QueuesService via DI.
 */
@Module({})
export class QueuesProviderModule {
    static forRoot(): DynamicModule {
        const useStub =
            process.env.NODE_ENV === 'test' ||
            !process.env.REDIS_HOST ||
            process.env.DISABLE_REDIS === 'true' ||
            process.env.DISABLE_REDIS === '1';
        const queuesModule = useStub ? QueuesStubModule : QueuesModule;
        return {
            module: QueuesProviderModule,
            imports: [queuesModule],
            exports: [queuesModule],
        };
    }
}
