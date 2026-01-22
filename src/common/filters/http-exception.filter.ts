import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<FastifyReply>();
        const request = ctx.getRequest<FastifyRequest>();
        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        if (status === HttpStatus.NOT_FOUND) {
            console.warn(`⚠️ 404 Not Found: ${request.method} ${request.url}`);
        } else {
            console.error('🔥 Global Exception Filter Caught:', exception);
        }

        const message =
            exception instanceof HttpException
                ? exception.getResponse()
                : 'Internal server error';

        response.status(status).send({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
        });
    }
}
