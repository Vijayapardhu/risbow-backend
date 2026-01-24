import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req: any = http.getRequest();
    const res: any = http.getResponse();

    const method = String(req.method || 'GET').toUpperCase();
    const route = String(req.routerPath || req.url || 'unknown');
    const end = this.metrics.httpRequestDurationSeconds.startTimer();

    return next.handle().pipe(
      tap({
        next: () => {
          const status = String(res?.statusCode || 200);
          this.metrics.httpRequestsTotal.labels(method, route, status).inc();
          end({ method, route, status_code: status });
        },
        error: () => {
          const status = String(res?.statusCode || 500);
          this.metrics.httpRequestsTotal.labels(method, route, status).inc();
          end({ method, route, status_code: status });
        },
      }),
    );
  }
}

