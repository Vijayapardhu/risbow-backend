import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupportTicketDto, UpdateSupportTicketDto, AssignTicketDto, ResolveTicketDto } from './dto';

@Injectable()
export class SupportTicketService {
  constructor(private prisma: PrismaService) { }

  async getAllTickets(
    page: number,
    limit: number,
    status?: string,
    priority?: string,
    category?: string,
    assignedTo?: string,
    search?: string
  ) {
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (category) {
      where.category = category;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          User: { select: { id: true, name: true, email: true, mobile: true } },
          Admin: { select: { id: true, name: true, email: true } },
          Order: { select: { id: true, orderNumber: true } },
          TicketMessage: {
            orderBy: { createdAt: 'desc' },
            take: 10, // Limit messages in ticket list
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTicketById(id: string) {
    return this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        User: { select: { id: true, name: true, email: true, mobile: true } },
        Admin: { select: { id: true, name: true, email: true } },
        Order: { select: { id: true, orderNumber: true, totalAmount: true } },
        TicketMessage: {
          include: {
            SupportTicket: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async createTicket(dto: CreateSupportTicketDto) {
    const { userId, assignedTo, orderId, productId, vendorId, ...rest } = dto;
    return this.prisma.supportTicket.create({
      data: {
        id: randomUUID(),
        ...rest,
        User: { connect: { id: userId } },
        Admin: assignedTo ? { connect: { id: assignedTo } } : undefined,
        Order: orderId ? { connect: { id: orderId } } : undefined,
        Product: productId ? { connect: { id: productId } } : undefined,
        Vendor: vendorId ? { connect: { id: vendorId } } : undefined,
        ticketNumber: `TKT-${Date.now()}`, // Generate ticket number
      },
    });
  }

  async updateTicket(id: string, dto: UpdateSupportTicketDto) {
    try {
      return await this.prisma.supportTicket.update({ where: { id }, data: dto });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Ticket ${id} not found`);
      throw e;
    }
  }

  async assignTicket(id: string, assignDto: AssignTicketDto) {
    try {
      return await this.prisma.supportTicket.update({
        where: { id },
        data: { assignedTo: assignDto.agentId, status: 'IN_PROGRESS' as any },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Ticket ${id} not found`);
      throw e;
    }
  }

  async updateTicketStatus(id: string, status: string) {
    try {
      return await this.prisma.supportTicket.update({
        where: { id },
        data: { status: status as any },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Ticket ${id} not found`);
      throw e;
    }
  }

  async resolveTicket(id: string, resolveDto: ResolveTicketDto) {
    try {
      return await this.prisma.supportTicket.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          closedAt: new Date(),
          firstResponseAt: new Date(),
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Ticket ${id} not found`);
      throw e;
    }
  }

  async deleteTicket(id: string) {
    try {
      return await this.prisma.supportTicket.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Ticket ${id} not found`);
      throw e;
    }
  }

  async getTicketMessages(ticketId: string) {
    return this.prisma.ticketMessage.findMany({
      where: { ticketId },
      include: {
        SupportTicket: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addTicketMessage(ticketId: string, message: string) {
    return this.prisma.ticketMessage.create({
      data: {
        id: randomUUID(),
        ticketId, // Scalar field, not a relation
        senderId: 'system', // This would come from the authenticated user
        senderType: 'ADMIN',
        senderName: 'System', // This would come from the authenticated user
        message,
      },
    });
  }
}