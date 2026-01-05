import { Controller, Get, Post, Patch, Body, Param, UseGuards, UnauthorizedException, Headers } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    // Simple Security: Secret Header
    private checkAdmin(secret: string) {
        if (secret !== 'admin-secret-123') { // in .env in prod
            throw new UnauthorizedException('Not Admin');
        }
    }

    @Get('analytics')
    async getAnalytics(@Headers('x-admin-secret') secret: string) {
        this.checkAdmin(secret);
        return this.adminService.getAnalytics();
    }

    @Post('rooms')
    async createBulkRooms(
        @Headers('x-admin-secret') secret: string,
        @Body('count') count: number
    ) {
        this.checkAdmin(secret);
        return this.adminService.createBulkRooms(count || 5);
    }

    @Patch('banner/:id/approve')
    async approveBanner(
        @Headers('x-admin-secret') secret: string,
        @Param('id') id: string
    ) {
        this.checkAdmin(secret);
        return this.adminService.approveBanner(id);
    }

    @Patch('vendor/:id/verify')
    async verifyVendor(
        @Headers('x-admin-secret') secret: string,
        @Param('id') id: string
    ) {
        this.checkAdmin(secret);
        return this.adminService.verifyVendor(id);
    }
}
