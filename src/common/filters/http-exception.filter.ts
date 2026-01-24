import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { BusinessException } from '../exceptions/business.exception';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const logger = new Logger(GlobalExceptionsFilter.name);
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<FastifyReply>();
        const request = ctx.getRequest<FastifyRequest>();
        const correlationId =
            (request as any)?.id ||
            (request.headers as any)?.['x-correlation-id'] ||
            undefined;
        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        // Prefer structured logs; include correlationId for tracing
        const logPrefix = correlationId ? `[cid=${correlationId}]` : '';
        if (status === HttpStatus.NOT_FOUND) {
            logger.warn(`${logPrefix} 404 Not Found: ${request.method} ${request.url}`);
        } else if (status >= 500) {
            logger.error(`${logPrefix} Unhandled exception: ${request.method} ${request.url}`, (exception as any)?.stack);
        } else {
            logger.warn(`${logPrefix} Request failed: ${request.method} ${request.url}`);
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

        response.status(status).send({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            correlationId,
            code,
            message,
            details,
        });
    }
}
