import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TelecallerService } from './telecaller.service';

@ApiTags('Telecaller')
@Controller('telecaller')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TELECALLER', 'ADMIN', 'SUPER_ADMIN')
export class TelecallerController {
    constructor(private readonly telecallerService: TelecallerService) { }

    @Get('dashboard')
    async getDashboard(@Request() req: any) {
        const stats = await this.telecallerService.getDashboardStats(req.user.id);
        const expiringCoins = await this.telecallerService.getExpiringCoins();
        const checkoutRecovery = await this.telecallerService.getCheckoutRecoveryLeads(req.user.id);
        const supportTickets = await this.telecallerService.getSupportTickets();

        return {
            stats,
            expiringCoins,
            checkoutRecovery,
            supportTickets,
        };
    }

    @Get('expiring-coins')
    async getExpiringCoins() {
        return this.telecallerService.getExpiringCoins();
    }

    @Get('checkout-recovery')
    async getCheckoutRecoveryLeads(@Request() req: any) {
        return this.telecallerService.getCheckoutRecoveryLeads(req.user.id);
    }

    @Get('support-tickets')
    async getSupportTickets() {
        return this.telecallerService.getSupportTickets();
    }
}
