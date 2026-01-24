import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENCY_META_KEY = 'risbow:idempotency';

export type IdempotencyOptions = {
  required?: boolean;
  ttlSeconds?: number;
};

export const Idempotent = (options: IdempotencyOptions = {}) =>
  SetMetadata(IDEMPOTENCY_META_KEY, options);

