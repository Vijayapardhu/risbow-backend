import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
    use(req: any, res: any, next: () => void) {
        const correlationId = req.headers['x-correlation-id'] || uuidv4();

        // Fastify specific handling if needed, but Nest handles raw req/res here usually
        req.id = correlationId;
        req.headers['x-correlation-id'] = correlationId;

        // Attach to response headers
        if (res.setHeader) {
            res.setHeader('x-correlation-id', correlationId);
        } else if (res.header) {
            res.header('x-correlation-id', correlationId);
        }

        next();
    }
}
