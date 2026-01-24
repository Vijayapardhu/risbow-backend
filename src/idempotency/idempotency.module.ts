import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyService } from './idempotency.service';

@Global()
@Module({
  providers: [
    IdempotencyService,
    Reflector,
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}

