import { Injectable } from '@nestjs/common';
import { Registry, collectDefaultMetrics, Histogram, Counter } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  readonly httpRequestDurationSeconds: Histogram<string>;
  readonly httpRequestsTotal: Counter<string>;

  constructor() {
    // Default Node metrics (CPU/mem/event loop)
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestDurationSeconds = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'] as const,
      buckets: [0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'] as const,
      registers: [this.registry],
    });
  }

  async metricsText(): Promise<string> {
    return await this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}

