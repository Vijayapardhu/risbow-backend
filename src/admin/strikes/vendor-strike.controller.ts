import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { VendorStrikeService } from './vendor-strike.service';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { RequirePermissions } from '../auth/decorators/admin-permissions.decorator';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { Permission } from '../rbac/admin-permissions.service';
import { StrikeType, StrikeResolution, DisciplineStatus } from '@prisma/client';
import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// DTOs
class CreateStrikeDto {
  @ApiProperty()
  @IsString()
  vendorId: string;

  @ApiProperty({ enum: StrikeType })
  @IsEnum(StrikeType)
  type: StrikeType;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  evidence?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  productId?: string;
}

class ResolveStrikeDto {
  @ApiProperty({ enum: StrikeResolution })
  @IsEnum(StrikeResolution)
  resolution: StrikeResolution;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  resolutionNotes?: string;
}

class ApplyDisciplineDto {
  @ApiProperty({ enum: DisciplineStatus })
  @IsEnum(DisciplineStatus)
  action: DisciplineStatus;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiProperty({ required: false })
  @IsOptional()
  durationDays?: number;
}

@ApiTags('Vendor Strikes & Discipline')
@Controller('admin/strikes')
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@ApiBearerAuth()
export class VendorStrikeController {
  constructor(private strikeService: VendorStrikeService) {}

  @Post()
  @RequirePermissions(Permission.VENDOR_STRIKE)
  @ApiOperation({
    summary: 'Issue a strike to a vendor',
    description: 'Create a new strike against a vendor for policy violations',
  })
  @ApiResponse({ status: 201, description: 'Strike issued successfully' })
  async issueStrike(
    @Body() dto: CreateStrikeDto,
    @CurrentAdmin() admin: any,
  ) {
    return this.strikeService.issueStrike({
      ...dto,
      issuedBy: admin.id,
      issuedByEmail: admin.email,
    });
  }

  @Get('vendor/:vendorId')
  @RequirePermissions(Permission.VENDOR_READ)
  @ApiOperation({
    summary: 'Get vendor strikes',
    description: 'Get all strikes for a specific vendor',
  })
  @ApiQuery({ name: 'includeResolved', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, enum: StrikeType })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Vendor strikes retrieved' })
  async getVendorStrikes(
    @Param('vendorId') vendorId: string,
    @Query('includeResolved') includeResolved?: string,
    @Query('type') type?: StrikeType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.strikeService.getVendorStrikes(vendorId, {
      includeResolved: includeResolved === 'true',
      type,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Put(':strikeId/resolve')
  @RequirePermissions(Permission.VENDOR_STRIKE)
  @ApiOperation({
    summary: 'Resolve a strike',
    description: 'Resolve a strike with appeal outcome',
  })
  @ApiResponse({ status: 200, description: 'Strike resolved' })
  async resolveStrike(
    @Param('strikeId') strikeId: string,
    @Body() dto: ResolveStrikeDto,
    @CurrentAdmin() admin: any,
  ) {
    return this.strikeService.resolveStrike(strikeId, {
      ...dto,
      resolvedBy: admin.id,
      resolvedByEmail: admin.email,
    });
  }

  @Get('appeals')
  @RequirePermissions(Permission.VENDOR_STRIKE)
  @ApiOperation({
    summary: 'Get pending appeals',
    description: 'Get all strikes that have pending appeals',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Pending appeals retrieved' })
  async getPendingAppeals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.strikeService.getPendingAppeals(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('discipline/:vendorId')
  @RequirePermissions(Permission.VENDOR_READ)
  @ApiOperation({
    summary: 'Get vendor discipline history',
    description: 'Get all discipline records for a vendor',
  })
  @ApiResponse({ status: 200, description: 'Discipline history retrieved' })
  async getVendorDiscipline(@Param('vendorId') vendorId: string) {
    return this.strikeService.getVendorDiscipline(vendorId);
  }

  @Get('discipline/:vendorId/active')
  @RequirePermissions(Permission.VENDOR_READ)
  @ApiOperation({
    summary: 'Get active discipline',
    description: 'Get current active discipline for a vendor',
  })
  @ApiResponse({ status: 200, description: 'Active discipline retrieved' })
  async getActiveDiscipline(@Param('vendorId') vendorId: string) {
    return this.strikeService.getActiveDiscipline(vendorId);
  }

  @Post('discipline/:vendorId')
  @RequirePermissions(Permission.VENDOR_SUSPEND)
  @ApiOperation({
    summary: 'Apply discipline action',
    description: 'Manually apply a discipline action to a vendor',
  })
  @ApiResponse({ status: 201, description: 'Discipline applied' })
  async applyDiscipline(
    @Param('vendorId') vendorId: string,
    @Body() dto: ApplyDisciplineDto,
    @CurrentAdmin() admin: any,
  ) {
    return this.strikeService.applyDiscipline(
      vendorId,
      dto.action,
      dto.reason,
      admin.id,
      dto.durationDays,
    );
  }

  @Post('discipline/:disciplineId/lift')
  @RequirePermissions(Permission.VENDOR_SUSPEND)
  @ApiOperation({
    summary: 'Lift discipline action',
    description: 'Lift an active discipline action from a vendor',
  })
  @ApiResponse({ status: 200, description: 'Discipline lifted' })
  async liftDiscipline(
    @Param('disciplineId') disciplineId: string,
    @Body('reason') reason: string,
    @CurrentAdmin() admin: any,
  ) {
    return this.strikeService.liftDiscipline(disciplineId, admin.id, reason);
  }

  @Post('process-expired')
  @RequirePermissions(Permission.VENDOR_SUSPEND)
  @ApiOperation({
    summary: 'Process expired disciplines',
    description: 'Process and auto-lift expired discipline actions',
  })
  @ApiResponse({ status: 200, description: 'Expired disciplines processed' })
  async processExpiredDisciplines() {
    return this.strikeService.processExpiredDisciplines();
  }
}
