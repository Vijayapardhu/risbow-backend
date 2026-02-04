import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriverQueryDto } from './dto/driver-query.dto';
import { CreateDeliveryDto, UpdateDeliveryStatusDto } from './dto/create-delivery.dto';
import { DriverStatus, DeliveryStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(private prisma: PrismaService) {}

  private generateDriverId(): string {
    return `DRV-${Date.now().toString(36).toUpperCase()}`;
  }

  private generateDeliveryNumber(): string {
    return `DLV-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  }

  async create(dto: CreateDriverDto) {
    const existing = await this.prisma.driver.findFirst({
      where: { mobile: dto.mobile }
    });

    if (existing) {
      throw new ConflictException('Driver with this mobile already exists');
    }

    const driverId = this.generateDriverId();

    return this.prisma.driver.create({
      data: {
        id: randomUUID(),
        driverId,
        name: dto.name,
        mobile: dto.mobile,
        email: dto.email,
        vehicleType: dto.vehicleType,
        vehicleNumber: dto.vehicleNumber,
        licenseNumber: dto.licenseNumber,
        licenseExpiry: new Date(dto.licenseExpiry),
        avatar: dto.avatar,
        status: DriverStatus.PENDING,
        updatedAt: new Date()
      }
    });
  }

  async findAll(query: DriverQueryDto) {
    const { page = 1, limit = 10, status, vehicleType, isAvailable, isOnline, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.DriverWhereInput = {};
    if (status) where.status = status;
    if (vehicleType) where.vehicleType = vehicleType;
    if (isAvailable !== undefined) where.isAvailable = isAvailable;
    if (isOnline !== undefined) where.isOnline = isOnline;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
        { driverId: { contains: search, mode: 'insensitive' } },
        { vehicleNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.driver.count({ where }),
      this.prisma.driver.findMany({
        where,
        skip,
        take: Number(limit),
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

  async findOne(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: { DriverDocument: true }
    });

    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async update(id: string, dto: UpdateDriverDto) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');

    const updateData: Prisma.DriverUpdateInput = { ...dto };
    if (dto.licenseExpiry) {
      updateData.licenseExpiry = new Date(dto.licenseExpiry);
    }

    return this.prisma.driver.update({
      where: { id },
      data: updateData
    });
  }

  async remove(id: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');

    await this.prisma.driver.delete({ where: { id } });
    return { message: 'Driver deleted successfully' };
  }

  async getStats() {
    const [
      total,
      pending,
      verified,
      active,
      suspended,
      available,
      online
    ] = await Promise.all([
      this.prisma.driver.count(),
      this.prisma.driver.count({ where: { status: DriverStatus.PENDING } }),
      this.prisma.driver.count({ where: { status: DriverStatus.VERIFIED } }),
      this.prisma.driver.count({ where: { status: DriverStatus.ACTIVE } }),
      this.prisma.driver.count({ where: { status: DriverStatus.SUSPENDED } }),
      this.prisma.driver.count({ where: { isAvailable: true } }),
      this.prisma.driver.count({ where: { isOnline: true } })
    ]);

    return {
      total,
      byStatus: { pending, verified, active, suspended },
      available,
      online
    };
  }

  // Delivery Methods
  async createDelivery(dto: CreateDeliveryDto) {
    const deliveryNumber = this.generateDeliveryNumber();

    return this.prisma.delivery.create({
      data: {
        id: randomUUID(),
        deliveryNumber,
        orderId: dto.orderId,
        driverId: dto.driverId,
        pickupAddress: dto.pickupAddress,
        deliveryAddress: dto.deliveryAddress,
        distance: dto.distance,
        estimatedTime: dto.estimatedTime,
        status: DeliveryStatus.PENDING,
        updatedAt: new Date()
      },
      include: {
        Order: { select: { id: true, totalAmount: true, status: true } },
        Driver: { select: { id: true, name: true, mobile: true } }
      }
    });
  }

  async findDeliveries(query: { page?: number; limit?: number; driverId?: string; status?: DeliveryStatus }) {
    const { page = 1, limit = 10, driverId, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.DeliveryWhereInput = {};
    if (driverId) where.driverId = driverId;
    if (status) where.status = status;

    const [total, data] = await Promise.all([
      this.prisma.delivery.count({ where }),
      this.prisma.delivery.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          Order: { select: { id: true, totalAmount: true, status: true } },
          Driver: { select: { id: true, name: true, mobile: true } }
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

  async updateDeliveryStatus(id: string, dto: UpdateDeliveryStatusDto) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id } });
    if (!delivery) throw new NotFoundException('Delivery not found');

    const updateData: Prisma.DeliveryUpdateInput = { status: dto.status as DeliveryStatus };

    if (dto.status === DeliveryStatus.PICKED_UP) {
      updateData.pickedAt = new Date();
    } else if (dto.status === DeliveryStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    if (dto.notes) updateData.notes = dto.notes;

    return this.prisma.delivery.update({
      where: { id },
      data: updateData
    });
  }
}
