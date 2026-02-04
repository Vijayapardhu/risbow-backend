import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';
import { AssignTicketDto, UpdateTicketStatusDto, UpdateTicketPriorityDto } from './dto/assign-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { TicketStatus, TicketPriority, MessageSender, Prisma } from '@prisma/client';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private prisma: PrismaService) {}

  private generateTicketNumber(): string {
    return `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  async createTicket(userId: string, dto: CreateTicketDto) {
    const ticketNumber = this.generateTicketNumber();

    return this.prisma.supportTicket.create({
      data: {
        id: randomUUID(),
        ticketNumber,
        userId,
        category: dto.category,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority || TicketPriority.MEDIUM,
        orderId: dto.orderId,
        productId: dto.productId,
        attachments: dto.attachments || [],
        updatedAt: new Date(),
      } as any,
      include: {
        User: { select: { id: true, name: true, email: true, mobile: true } }
      }
    });
  }

  async findAllTickets(query: TicketQueryDto) {
    const { page = 1, limit = 10, status, priority, category, assignedTo, userId, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SupportTicketWhereInput = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assignedTo) where.assignedTo = assignedTo;
    if (userId) where.userId = userId;
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          User: { select: { id: true, name: true, email: true, mobile: true } },
          Admin: { select: { id: true, email: true, name: true } },
          _count: { select: { TicketMessage: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findUserTickets(userId: string, query: { page?: number; limit?: number }) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.supportTicket.count({ where: { userId } }),
      this.prisma.supportTicket.findMany({
        where: { userId },
        skip,
        take: Number(limit),
        include: {
          _count: { select: { TicketMessage: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOneTicket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        User: { select: { id: true, name: true, email: true, mobile: true } },
        Admin: { select: { id: true, email: true, name: true } },
        Order: { select: { id: true, status: true, totalAmount: true } },
        TicketMessage: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async replyToTicket(ticketId: string, senderId: string, senderType: MessageSender, senderName: string, dto: ReplyTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const message = await this.prisma.ticketMessage.create({
      data: {
        id: randomUUID(),
        ticketId,
        senderId,
        senderType,
        senderName,
        message: dto.message,
        attachments: dto.attachments || [],
        isInternal: dto.isInternal || false
      }
    });

    // Update first response time if this is the first admin response
    if (senderType === MessageSender.ADMIN && !ticket.firstResponseAt) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { firstResponseAt: new Date() }
      });
    }

    return message;
  }

  async assignTicket(ticketId: string, dto: AssignTicketDto, adminId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedTo: dto.assignedTo,
        status: TicketStatus.IN_PROGRESS
      },
      include: {
        Admin: { select: { id: true, email: true, name: true } },
        User: { select: { id: true, name: true, email: true } }
      }
    });
  }

  async updateStatus(ticketId: string, dto: UpdateTicketStatusDto, adminId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const updateData: Prisma.SupportTicketUpdateInput = { status: dto.status };

    if (dto.status === TicketStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
    } else if (dto.status === TicketStatus.CLOSED) {
      updateData.closedAt = new Date();
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData
    });
  }

  async updatePriority(ticketId: string, dto: UpdateTicketPriorityDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { priority: dto.priority }
    });
  }

  async closeTicket(ticketId: string, adminId: string) {
    return this.updateStatus(ticketId, { status: TicketStatus.CLOSED }, adminId);
  }

  async getTicketStats() {
    const [
      total,
      open,
      inProgress,
      waitingCustomer,
      resolved,
      closed
    ] = await Promise.all([
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.count({ where: { status: TicketStatus.OPEN } }),
      this.prisma.supportTicket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
      this.prisma.supportTicket.count({ where: { status: TicketStatus.WAITING_CUSTOMER } }),
      this.prisma.supportTicket.count({ where: { status: TicketStatus.RESOLVED } }),
      this.prisma.supportTicket.count({ where: { status: TicketStatus.CLOSED } })
    ]);

    return {
      total,
      byStatus: { open, inProgress, waitingCustomer, resolved, closed },
      unresolved: open + inProgress + waitingCustomer
    };
  }

  async getTemplates(category?: string) {
    return this.prisma.ticketTemplate.findMany({
      where: {
        isActive: true,
        ...(category && { category: category as any })
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createTemplate(data: { name: string; category?: string; subject?: string; content: string }) {
    return this.prisma.ticketTemplate.create({
      data: {
        id: randomUUID(),
        name: data.name,
        category: data.category as any,
        subject: data.subject,
        content: data.content,
        updatedAt: new Date()
      }
    });
  }
}
