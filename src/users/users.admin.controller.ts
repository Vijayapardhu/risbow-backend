import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AdminCreateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
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
}
