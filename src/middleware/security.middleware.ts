import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Check for rate limiting (simplified implementation)
    const ip = this.getClientIp(req);
    const endpoint = req.path;
    
    // Basic rate limiting check - in a real implementation you'd use Redis or similar
    const recentRequests = await this.prisma.apiRequestLog.count({
      where: {
        ip,
        endpoint,
        createdAt: {
          gte: new Date(Date.now() - 60000), // Last minute
        },
      },
    });

    // Limit to 100 requests per minute per IP per endpoint
    if (recentRequests > 100) {
      res.status(429).json({ message: 'Too many requests' });
      return;
    }

    // Log the request for monitoring
    await this.prisma.apiRequestLog.create({
      data: {
        ip,
        endpoint,
        method: req.method,
        userAgent: req.get('User-Agent') || '',
      },
    });

    next();
  }

  private getClientIp(req: Request): string {
    return req.ip || 
      req.headers['x-forwarded-for'] as string || 
      req.headers['x-real-ip'] as string || 
      req.connection.remoteAddress || 
      req.socket.remoteAddress || 
      '';
  }
}