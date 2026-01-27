import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VendorDisciplineService } from './vendor-discipline.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Vendor Discipline')
@Controller('vendors/discipline')
@ApiBearerAuth()
export class VendorDisciplineController {
  constructor(private readonly disciplineService: VendorDisciplineService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current vendor discipline state' })
  @ApiResponse({ status: 200, description: 'Discipline state retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.WHOLESALER)
  async getMyDisciplineState(@CurrentUser() user: any) {
    return this.disciplineService.getDisciplineState(user.id);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get discipline event history for current vendor' })
  @ApiResponse({ status: 200, description: 'Discipline history retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.WHOLESALER)
  async getMyDisciplineHistory(@CurrentUser() user: any, @Request() req: any) {
    const limit = parseInt(req.query?.limit) || 50;
    return this.disciplineService.getDisciplineHistory(user.id, limit);
  }

  @Get(':vendorId')
  @ApiOperation({ summary: 'Get vendor discipline state (Admin only)' })
  @ApiResponse({ status: 200, description: 'Discipline state retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getDisciplineState(@Param('vendorId') vendorId: string) {
    return this.disciplineService.getDisciplineState(vendorId);
  }

  @Get(':vendorId/history')
  @ApiOperation({ summary: 'Get discipline event history for a vendor (Admin only)' })
  @ApiResponse({ status: 200, description: 'Discipline history retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getDisciplineHistory(@Param('vendorId') vendorId: string, @Request() req: any) {
    const limit = parseInt(req.query?.limit) || 50;
    return this.disciplineService.getDisciplineHistory(vendorId, limit);
  }

  @Post(':vendorId/override')
  @ApiOperation({ summary: 'Admin override vendor discipline state' })
  @ApiResponse({ status: 200, description: 'Discipline state overridden successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async adminOverride(
    @Param('vendorId') vendorId: string,
    @Body() body: { action: 'BLOCK' | 'UNBLOCK'; reason: string },
    @CurrentUser() user: any,
  ) {
    return this.disciplineService.adminOverride(vendorId, user.id, body.action, body.reason);
  }
}
