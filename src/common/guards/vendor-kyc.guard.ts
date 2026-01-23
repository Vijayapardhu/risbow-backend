import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VendorKycGuard implements CanActivate {
    constructor(private prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user || !user.id) {
            throw new ForbiddenException('User not authenticated');
        }
        const vendor = await this.prisma.vendor.findUnique({ where: { id: user.id } });
        if (!vendor) {
            throw new ForbiddenException('Vendor profile not found');
        }
        if (vendor.kycStatus !== 'VERIFIED') {
            throw new ForbiddenException('Vendor KYC not verified');
        }
        return true;
    }
}
