import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    handleRequest(err: any, user: any, info: any, context: any) {
        // You can throw an exception based on either "info" or "err" arguments
        if (err || !user) {
            throw err || new UnauthorizedException(info?.message || 'Unauthorized');
        }
        
        // Attach the authorization token to the user object for potential blacklisting
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            user.accessToken = authHeader.substring(7);
        }
        
        return user;
    }
}
