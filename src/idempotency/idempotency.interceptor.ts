import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { createHash } from 'crypto';
import { IdempotencyService } from './idempotency.service';
import { IDEMPOTENCY_META_KEY, IdempotencyOptions } from './idempotency.decorator';

function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',')}}`;
}

function hashRequest(parts: any): string {
  const str = stableStringify(parts);
  return createHash('sha256').update(str).digest('hex');
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector, private idempotency: IdempotencyService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const opts =
      this.reflector.getAllAndOverride<IdempotencyOptions>(IDEMPOTENCY_META_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || null;

    if (!opts) return next.handle();

    const http = context.switchToHttp();
    const req: any = http.getRequest();
    const res: any = http.getResponse();

    const required = opts.required !== false;
    const ttlSeconds = opts.ttlSeconds ?? 60 * 5;

    const key =
      req.headers?.['idempotency-key'] ||
      req.headers?.['x-idempotency-key'] ||
      req.headers?.['Idempotency-Key'];

    if (!key) {
      if (required) throw new BadRequestException('Missing Idempotency-Key header');
      return next.handle();
    }

    const userId = req.user?.id ? String(req.user.id) : null;
    const scope = userId ? `user:${userId}` : `public:${req.ip || 'unknown'}`;
    const method = String(req.method || 'GET').toUpperCase();
    const path = String(req.routerPath || req.url || '');

    const requestHash = hashRequest({
      body: req.body ?? null,
      query: req.query ?? null,
      params: req.params ?? null,
    });

    const begin = await this.idempotency.begin({
      key: String(key),
      scope,
      method,
      path,
      requestHash,
      ttlSeconds,
    });

    if (begin.action === 'REPLAY') {
      if (res?.status && begin.statusCode) res.status(begin.statusCode);
      return of(begin.response ?? {});
    }

    const recordId = begin.recordId as string;

    return next.handle().pipe(
      tap(async (data) => {
        const statusCode = Number(res?.statusCode || 200);
        await this.idempotency.complete(recordId, statusCode, data);
      }),
      catchError((err) => {
        this.idempotency.fail(recordId).catch(() => undefined);
        throw err;
      }),
    );
  }
}

