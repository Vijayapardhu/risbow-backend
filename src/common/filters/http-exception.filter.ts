import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { BusinessException } from '../exceptions/business.exception';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        
        // Get correlation ID from request (works for both Fastify and Express)
        const correlationId =
            request?.id ||
            request?.headers?.['x-correlation-id'] ||
            request?.headers?.['X-Correlation-Id'] ||
            undefined;
            
        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        // Prefer structured logs; include correlationId for tracing
        const logPrefix = correlationId ? `[cid=${correlationId}]` : '';
        const url = request?.url || request?.originalUrl || 'unknown';
        const method = request?.method || 'UNKNOWN';
        
        if (status === HttpStatus.NOT_FOUND) {
            this.logger.warn(`${logPrefix} 404 Not Found: ${method} ${url}`);
        } else if (status >= 500) {
            this.logger.error(`${logPrefix} Unhandled exception: ${method} ${url}`, (exception as any)?.stack);
        } else {
            this.logger.warn(`${logPrefix} Request failed: ${method} ${url} - ${(exception as any)?.message || 'Unknown error'}`);
        }

        let code: string | undefined;
        let message: string = 'Internal server error';
        let details: any = undefined;

        if (exception instanceof BusinessException) {
            code = exception.code;
            const res = exception.getResponse() as any;
            message = res?.message || 'Business rule violation';
            details = res?.details;
        } else if (exception instanceof HttpException) {
            const res = exception.getResponse() as any;
            // Nest may return string or object
            if (typeof res === 'string') {
                message = res;
            } else {
                message = res?.message ? (Array.isArray(res.message) ? res.message.join(', ') : String(res.message)) : 'Request failed';
                code = res?.code || undefined;
                details = res?.details || undefined;
            }
        }

        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: url,
            correlationId,
            code,
            message,
            details,
        };

        // Handle both Fastify and Express response objects
        if (typeof response.status === 'function') {
            // Fastify style
            response.status(status).send(errorResponse);
        } else if (typeof response.statusCode !== 'undefined') {
            // Express style
            response.statusCode = status;
            response.json(errorResponse);
        } else {
            // Fallback
            response.send(errorResponse);
        }
    }
}
