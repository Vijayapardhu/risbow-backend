import { Module } from '@nestjs/common';
import { QueuesService } from './queues.service';
import { QueuesServiceStub } from './queues-stub.service';

/**
 * Stub QueuesModule when Redis is disabled.
 * Provides QueuesServiceStub so Admin and other consumers still resolve QueuesService.
 */
@Module({
    providers: [{ provide: QueuesService, useClass: QueuesServiceStub }],
    exports: [QueuesService],
})
export class QueuesStubModule {}
