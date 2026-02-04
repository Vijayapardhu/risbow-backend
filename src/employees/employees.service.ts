import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { EmployeeRole, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(private prisma: PrismaService) {}

  private generateEmployeeId(): string {
    return `EMP-${Date.now().toString(36).toUpperCase()}`;
  }

  async create(dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findFirst({
      where: {
        OR: [{ email: dto.email }, { mobile: dto.mobile }]
      }
    });

    if (existing) {
      throw new ConflictException('Employee with this email or mobile already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const employeeId = this.generateEmployeeId();

    return this.prisma.employee.create({
      data: {
        id: randomUUID(),
        employeeId,
        name: dto.name,
        email: dto.email,
        mobile: dto.mobile,
        password: hashedPassword,
        role: dto.role,
        department: dto.department,
        permissions: dto.permissions || [],
        avatar: dto.avatar,
        updatedAt: new Date()
      }
    });
  }

  async findAll(query: EmployeeQueryDto) {
    const { page = 1, limit = 10, role, department, isActive, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeWhereInput = {};
    if (role) where.role = role;
    if (department) where.department = department;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          employeeId: true,
          name: true,
          email: true,
          mobile: true,
          role: true,
          department: true,
          isActive: true,
          avatar: true,
          lastLoginAt: true,
          createdAt: true
        }
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

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        department: true,
        permissions: true,
        isActive: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true
      }
    });

    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');

    const updateData: Prisma.EmployeeUpdateInput = { ...dto };
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.employee.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        department: true,
        permissions: true,
        isActive: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true
      }
    });
  }

  async remove(id: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');

    await this.prisma.employee.delete({ where: { id } });
    return { message: 'Employee deleted successfully' };
  }

  async toggleActive(id: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.employee.update({
      where: { id },
      data: { isActive: !employee.isActive }
    });
  }

  async getPerformanceMetrics(id: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');

    // Placeholder for performance metrics - can be extended based on role
    return {
      employeeId: employee.employeeId,
      name: employee.name,
      role: employee.role,
      metrics: {
        ticketsResolved: 0,
        avgResponseTime: 0,
        customerRating: 0,
        totalTasks: 0
      }
    };
  }
}
