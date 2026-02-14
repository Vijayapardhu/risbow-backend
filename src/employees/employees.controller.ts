import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin/auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from '../admin/auth/guards/admin-permissions.guard';
import { AdminRoles } from '../admin/auth/decorators/admin-roles.decorator';
import { AdminRole } from '@prisma/client';

@Controller('admin/employees')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(@Query() query: EmployeeQueryDto) {
    return this.employeesService.findAll(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }

  @Post(':id/toggle')
  toggleActive(@Param('id') id: string) {
    return this.employeesService.toggleActive(id);
  }

  @Get(':id/performance')
  getPerformance(@Param('id') id: string) {
    return this.employeesService.getPerformanceMetrics(id);
  }
}
