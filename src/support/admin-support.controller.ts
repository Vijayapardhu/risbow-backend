import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SupportService } from './support.service';
import { ReplyTicketDto } from './dto/reply-ticket.dto';
import { UpdateTicketStatusDto, UpdateTicketPriorityDto, AssignTicketDto } from './dto/assign-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin/auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from '../admin/auth/guards/admin-permissions.guard';
import { AdminRoles } from '../admin/auth/decorators/admin-roles.decorator';
import { AdminRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MessageSender } from '@prisma/client';

@Controller('admin/support')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  findAll(@Query() query: TicketQueryDto) {
    return this.supportService.findAllTickets(query);
  }

  @Get('stats')
  getStats() {
    return this.supportService.getTicketStats();
  }

  @Get('templates')
  getTemplates(@Query('category') category?: string) {
    return this.supportService.getTemplates(category);
  }

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  createTemplate(@Body() data: { name: string; category?: string; subject?: string; content: string }) {
    return this.supportService.createTemplate(data);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supportService.findOneTicket(id);
  }

  @Post(':id/assign')
  assignTicket(
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
    @CurrentUser('id') adminId: string
  ) {
    return this.supportService.assignTicket(id, dto, adminId);
  }

  @Post(':id/reply')
  replyToTicket(
    @Param('id') id: string,
    @Body() dto: ReplyTicketDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser('name') adminName: string
  ) {
    return this.supportService.replyToTicket(id, adminId, MessageSender.ADMIN, adminName || 'Support Agent', dto);
  }

  @Post(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser('id') adminId: string
  ) {
    return this.supportService.updateStatus(id, dto, adminId);
  }

  @Post(':id/priority')
  updatePriority(
    @Param('id') id: string,
    @Body() dto: UpdateTicketPriorityDto
  ) {
    return this.supportService.updatePriority(id, dto);
  }

  @Post(':id/close')
  closeTicket(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string
  ) {
    return this.supportService.closeTicket(id, adminId);
  }
}
