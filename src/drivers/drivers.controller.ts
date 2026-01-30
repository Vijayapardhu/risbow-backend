import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriverQueryDto } from './dto/driver-query.dto';
import { CreateDeliveryDto, UpdateDeliveryStatusDto } from './dto/create-delivery.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, DeliveryStatus } from '@prisma/client';

@Controller('admin/drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  findAll(@Query() query: DriverQueryDto) {
    return this.driversService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.driversService.getStats();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateDriverDto) {
    return this.driversService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.driversService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.driversService.remove(id);
  }

  // Delivery endpoints
  @Post('deliveries')
  @HttpCode(HttpStatus.CREATED)
  createDelivery(@Body() dto: CreateDeliveryDto) {
    return this.driversService.createDelivery(dto);
  }

  @Get('deliveries')
  findDeliveries(@Query() query: { page?: number; limit?: number; driverId?: string; status?: DeliveryStatus }) {
    return this.driversService.findDeliveries(query);
  }

  @Patch('deliveries/:id/status')
  updateDeliveryStatus(@Param('id') id: string, @Body() dto: UpdateDeliveryStatusDto) {
    return this.driversService.updateDeliveryStatus(id, dto);
  }
}
