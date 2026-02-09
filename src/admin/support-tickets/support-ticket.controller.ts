import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../auth/guards/admin-roles.guard';
import { RequirePermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { AdminRoles } from '../auth/decorators/admin-roles.decorator';
import { RequirePermissions } from '../auth/decorators/admin-permissions.decorator';
import { SupportTicketService } from './support-ticket.service';
import { CreateSupportTicketDto, UpdateSupportTicketDto, AssignTicketDto, ResolveTicketDto } from './dto';

@ApiTags('Admin - Support Tickets')
@Controller('admin/support-tickets')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, RequirePermissionsGuard)
export class SupportTicketController {
  constructor(private readonly supportTicketService: SupportTicketService) {}

  @Get()
  @ApiOperation({ summary: 'Get all support tickets' })
  @ApiResponse({ status: 200, description: 'List of support tickets' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_AGENT')
  @RequirePermissions('support_tickets:read')
  async getAllTickets(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('search') search?: string,
  ) {
    return this.supportTicketService.getAllTickets(
      page, 
      limit, 
      status, 
      priority, 
      category, 
      assignedTo, 
      search
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get support ticket by ID' })
  @ApiResponse({ status: 200, description: 'Support ticket details' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_AGENT')
  @RequirePermissions('support_tickets:read')
  async getTicketById(@Param('id') id: string) {
    return this.supportTicketService.getTicketById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new support ticket' })
  @ApiResponse({ status: 201, description: 'Support ticket created' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
  @RequirePermissions('support_tickets:create')
  async createTicket(@Body() createTicketDto: CreateSupportTicketDto) {
    return this.supportTicketService.createTicket(createTicketDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update support ticket' })
  @ApiResponse({ status: 200, description: 'Support ticket updated' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_AGENT')
  @RequirePermissions('support_tickets:update')
  async updateTicket(@Param('id') id: string, @Body() updateTicketDto: UpdateSupportTicketDto) {
    return this.supportTicketService.updateTicket(id, updateTicketDto);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign ticket to agent' })
  @ApiResponse({ status: 200, description: 'Ticket assigned' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
  @RequirePermissions('support_tickets:assign')
  async assignTicket(@Param('id') id: string, @Body() assignTicketDto: AssignTicketDto) {
    return this.supportTicketService.assignTicket(id, assignTicketDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update ticket status' })
  @ApiResponse({ status: 200, description: 'Ticket status updated' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_AGENT')
  @RequirePermissions('support_tickets:update_status')
  async updateTicketStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.supportTicketService.updateTicketStatus(id, status);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve ticket' })
  @ApiResponse({ status: 200, description: 'Ticket resolved' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_AGENT')
  @RequirePermissions('support_tickets:resolve')
  async resolveTicket(@Param('id') id: string, @Body() resolveTicketDto: ResolveTicketDto) {
    return this.supportTicketService.resolveTicket(id, resolveTicketDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete support ticket' })
  @ApiResponse({ status: 200, description: 'Support ticket deleted' })
  @AdminRoles('SUPER_ADMIN')
  @RequirePermissions('support_tickets:delete')
  async deleteTicket(@Param('id') id: string) {
    return this.supportTicketService.deleteTicket(id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get ticket messages' })
  @ApiResponse({ status: 200, description: 'List of ticket messages' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_AGENT')
  @RequirePermissions('support_tickets:read_messages')
  async getTicketMessages(@Param('id') id: string) {
    return this.supportTicketService.getTicketMessages(id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Add message to ticket' })
  @ApiResponse({ status: 201, description: 'Message added to ticket' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_AGENT')
  @RequirePermissions('support_tickets:add_message')
  async addTicketMessage(@Param('id') id: string, @Body('message') message: string) {
    return this.supportTicketService.addTicketMessage(id, message);
  }
}