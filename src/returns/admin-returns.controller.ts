import { Body, Controller, Get, Param, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReturnStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ReturnsService } from './returns.service';

@ApiTags('Admin Returns')
@ApiBearerAuth()
@Controller('admin/returns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: List return requests' })
  findAll(@Query() query: any) {
    return this.returnsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: Get return request details' })
  findOne(@Param('id') id: string) {
    return this.returnsService.findOne(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Admin: Approve return (replacement workflow)' })
  approve(@Request() req: any, @Param('id') id: string, @Body() body: { notes?: string }) {
    return this.returnsService.updateStatus(
      id,
      { status: ReturnStatus.APPROVED, adminNotes: body?.notes },
      req.user.id,
    );
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Admin: Reject return' })
  reject(@Request() req: any, @Param('id') id: string, @Body() body: { reason?: string; notes?: string }) {
    return this.returnsService.updateStatus(
      id,
      { status: ReturnStatus.REJECTED, adminNotes: body?.notes, reason: body?.reason },
      req.user.id,
    );
  }

  @Post(':id/qc')
  @ApiOperation({ summary: 'Admin: Submit QC result for a return request' })
  async submitQc(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: 'PASSED' | 'FAILED' | 'QC_PASSED' | 'QC_FAILED'; notes?: string; checklist?: any },
  ) {
    // Persist QC checklist at order-level (existing model expects orderId)
    const returnReq = await this.returnsService.findOne(id);
    await this.returnsService.submitQCChecklist(returnReq.orderId, req.user.id, body.checklist ?? { notes: body.notes, status: body.status === 'PASSED' });

    // Move return state based on QC outcome
    const normalized = body.status === 'QC_PASSED' ? 'PASSED' : body.status === 'QC_FAILED' ? 'FAILED' : body.status;
    const next = normalized === 'PASSED' ? ReturnStatus.QC_PASSED : ReturnStatus.QC_FAILED;
    return this.returnsService.updateStatus(id, { status: next, adminNotes: body.notes }, req.user.id);
  }

  @Post(':id/replacement')
  @ApiOperation({ summary: 'Admin: Ensure replacement is created for an approved return' })
  async ensureReplacement(@Request() req: any, @Param('id') id: string) {
    // Idempotent: updateStatus to APPROVED will create replacement if not already created.
    return this.returnsService.updateStatus(id, { status: ReturnStatus.APPROVED }, req.user.id);
  }
}

