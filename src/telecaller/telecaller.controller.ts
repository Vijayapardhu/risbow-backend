import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from '../admin/admin.service';

@Controller('telecaller')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TELECALLER', 'ADMIN', 'SUPER_ADMIN')
export class TelecallerController {
    constructor(private readonly adminService: AdminService) { }

    @Get('dashboard')
    async getDashboard() {
        // Return telecaller-specific dashboard data
        return {
            stats: {
                myTasks: 15,
                completed: 8,
                pending: 7,
                successRate: 65,
            },
            expiringCoins: await this.getExpiringCoins(),
            checkoutRecovery: await this.getCheckoutRecoveryLeads(),
            supportTickets: await this.getSupportTickets(),
        };
    }

    @Get('expiring-coins')
    async getExpiringCoins() {
        // Fetch users with expiring coins
        return [
            {
                name: 'Rajesh Kumar',
                mobile: '+91 98765 00001',
                coins: 500,
                expiryDate: '2026-01-10',
                daysLeft: 2,
                lastOrder: '15 days ago',
            },
        ];
    }

    @Get('checkout-recovery')
    async getCheckoutRecoveryLeads() {
        // Fetch abandoned checkouts assigned to this telecaller
        return [
            {
                customerName: 'Sneha Reddy',
                mobile: '+91 98765 00004',
                cartValue: 5000,
                itemCount: 3,
                abandonedAt: '2 hours ago',
                priority: 'High',
            },
        ];
    }

    @Get('support-tickets')
    async getSupportTickets() {
        // Fetch support tickets assigned to this telecaller
        return [
            {
                id: 'TKT001',
                subject: 'Order not delivered',
                description: 'Customer complaining about delayed delivery',
                customerName: 'Rahul Verma',
                mobile: '+91 98765 00006',
                priority: 'High',
                createdAt: '1 hour ago',
            },
        ];
    }
}
