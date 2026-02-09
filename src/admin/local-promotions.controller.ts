import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AdminRole } from '@prisma/client';
import { AdminJwtAuthGuard } from './auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from './auth/guards/admin-permissions.guard';
import { AdminRoles } from './auth/decorators/admin-roles.decorator';
import { AuditLogService } from '../audit/audit.service';
import { CreateLocalPromotionDto, UpdateLocalPromotionDto } from './dto/local-promotion.dto';

@ApiTags('Admin Local Promotions')
@ApiBearerAuth()
@Controller('admin/local-promotions')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.OPERATIONS_ADMIN)
export class LocalPromotionsController {
  constructor(private prisma: PrismaService, private audit: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'List local promotions' })
  async list(@Query('activeOnly') activeOnly?: string) {
    const where: any = {};
    if (activeOnly === 'true' || activeOnly === '1') where.isActive = true;
    return this.prisma.localPromotion.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  @Post()
  @ApiOperation({ summary: 'Create local promotion' })
  async create(@Request() req, @Body() dto: CreateLocalPromotionDto) {
    const created = await this.prisma.localPromotion.create({
      data: {
        name: dto.name,
        isActive: dto.isActive ?? true,
        targetType: dto.targetType,
        centerLat: dto.centerLat,
        centerLng: dto.centerLng,
        radiusKm: dto.radiusKm,
        pincodes: dto.pincodes as any,
        vendorId: dto.vendorId,
        categoryId: dto.categoryId,
        productId: dto.productId,
        percentOff: dto.percentOff,
        flatOffAmount: dto.flatOffAmount,
        freeShipping: dto.freeShipping ?? false,
        boostOnly: dto.boostOnly ?? false,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
        setByUserId: req.user?.id,
      } as any,
    });

    await this.audit.logAdminAction(req.user?.id, 'LOCAL_PROMO_CREATE', 'LocalPromotion', created.id, dto as any);
    return created;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update local promotion' })
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateLocalPromotionDto) {
    const updated = await this.prisma.localPromotion.update({
      where: { id },
      data: {
        name: dto.name,
        isActive: dto.isActive,
        targetType: dto.targetType,
        centerLat: dto.centerLat,
        centerLng: dto.centerLng,
        radiusKm: dto.radiusKm,
        pincodes: dto.pincodes as any,
        vendorId: dto.vendorId,
        categoryId: dto.categoryId,
        productId: dto.productId,
        percentOff: dto.percentOff,
        flatOffAmount: dto.flatOffAmount,
        freeShipping: dto.freeShipping,
        boostOnly: dto.boostOnly,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      } as any,
    });

    await this.audit.logAdminAction(req.user?.id, 'LOCAL_PROMO_UPDATE', 'LocalPromotion', id, dto as any);
    return updated;
  }
}

