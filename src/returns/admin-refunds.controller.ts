import { Body, Controller, Get, Param, Post, Query, UseGuards, Request, ConflictException, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReturnStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ReturnsService } from './returns.service';
import { AuditLogService } from '../audit/audit.service';

/**
 * Refunds are structurally discouraged in RISBOW (replacement-first).
 * These endpoints exist for admin workflows / legacy UI, but refund processing
 * requires an explicit audited override.
 */
@ApiTags('Admin Refunds')
@ApiBearerAuth()
@Controller('admin/refunds')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminRefundsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly returnsService: ReturnsService,
    private readonly audit: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Admin: List refunds (derived from ReturnRequest statuses)' })
  async list(@Query() query: any) {
    const { page = 1, limit = 20, search, status } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      status: status ? status : { in: [ReturnStatus.REFUND_INITIATED, ReturnStatus.REFUND_COMPLETED] },
    };
    if (search) {
      where.OR = [
        { returnNumber: { contains: search, mode: 'insensitive' } },
        { orderId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.returnRequest.count({ where }),
      this.prisma.returnRequest.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { requestedAt: 'desc' },
        include: {
          User: { select: { id: true, name: true, mobile: true } },
          Vendor: { select: { id: true, name: true, storeName: true } },
          Order: { select: { id: true, totalAmount: true } },
        },
      }),
    ]);

    return {
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: Get refund detail (ReturnRequest)' })
  async get(@Param('id') id: string) {
    return this.returnsService.findOne(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Admin: Approve refund (requires audited override)' })
  async approve(@Request() req: any, @Param('id') id: string, @Body() body: { notes?: string; forceRefund?: boolean; reason?: string }) {
    if (!body?.forceRefund) {
      throw new ConflictException('Refunds are blocked by policy. Use replacement workflow, or pass forceRefund=true with an admin reason (audited).');
    }
    if (!body?.reason) {
      throw new BadRequestException('reason is required when forceRefund=true');
    }

    await this.audit.logAdminAction(req.user.id, 'FORCE_REFUND_APPROVE', 'ReturnRequest', id, { notes: body.notes, reason: body.reason });
    return this.returnsService.updateStatus(id, { status: ReturnStatus.REFUND_INITIATED, adminNotes: body.notes, reason: body.reason }, req.user.id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Admin: Reject refund request' })
  async reject(@Request() req: any, @Param('id') id: string, @Body() body: { reason?: string; notes?: string }) {
    await this.audit.logAdminAction(req.user.id, 'REFUND_REJECT', 'ReturnRequest', id, { notes: body?.notes, reason: body?.reason });
    return this.returnsService.updateStatus(id, { status: ReturnStatus.REJECTED, adminNotes: body?.notes, reason: body?.reason }, req.user.id);
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'Admin: Mark refund processed (requires audited override)' })
  async process(@Request() req: any, @Param('id') id: string, @Body() body: { transactionId?: string; forceRefund?: boolean; reason?: string }) {
    if (!body?.forceRefund) {
      throw new ConflictException('Refund processing is blocked by policy. Use replacement workflow, or pass forceRefund=true with an admin reason (audited).');
    }
    if (!body?.reason) {
      throw new BadRequestException('reason is required when forceRefund=true');
    }

    await this.audit.logAdminAction(req.user.id, 'FORCE_REFUND_PROCESS', 'ReturnRequest', id, { transactionId: body.transactionId, reason: body.reason });
    return this.returnsService.updateStatus(id, { status: ReturnStatus.REFUND_COMPLETED, adminNotes: `txn:${body.transactionId || 'N/A'}` }, req.user.id);
  }
}

