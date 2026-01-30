import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';
import { UpdateTicketStatusDto, UpdateTicketPriorityDto, AssignTicketDto } from './dto/assign-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MessageSender } from '@prisma/client';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createTicket(@Body() dto: CreateTicketDto, @CurrentUser('id') userId: string) {
    return this.supportService.createTicket(userId, dto);
  }

  @Get()
  getMyTickets(
    @CurrentUser('id') userId: string,
    @Query() query: { page?: number; limit?: number }
  ) {
    return this.supportService.findUserTickets(userId, query);
  }

  @Get(':id')
  getTicketDetails(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.supportService.findOneTicket(id);
  }

  @Post(':id/reply')
  replyToTicket(
    @Param('id') id: string,
    @Body() dto: ReplyTicketDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('name') userName: string
  ) {
    return this.supportService.replyToTicket(id, userId, MessageSender.CUSTOMER, userName || 'Customer', dto);
  }
}
