import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AdminCreateUserDto } from './dto/user.dto';
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin/auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from '../admin/auth/guards/admin-permissions.guard';
import { AdminRoles } from '../admin/auth/decorators/admin-roles.decorator';
import { AdminRole } from '@prisma/client';

@ApiTags('Admin')
@Controller('admin/users')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
export class UsersAdminController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    async create(@Body() dto: AdminCreateUserDto) {
        return this.usersService.createUser(dto);
    }

    @Get()
    async findAll(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('search') search: string,
        @Query('role') role: string,
        @Query('status') status: string
    ) {
        return this.usersService.findAllUsers({
            page: Number(page) || 1,
            limit: Number(limit) || 10,
            search,
            role,
            status
        });
    }

    @Patch(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: string
    ) {
        return this.usersService.updateUserStatus(id, status);
    }

    @Get('lookup')
    async lookup(
        @Query('q') query: string
    ) {
        return this.usersService.lookupUser(query);
    }
}
