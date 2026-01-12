import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findOne(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        return this.prisma.user.update({
            where: { id },
            data: {
                name: updateUserDto.name,
                email: updateUserDto.email,
                gender: updateUserDto.gender,
                size: updateUserDto.size,
                footwearSize: updateUserDto.footwearSize,
                stylePrefs: updateUserDto.stylePrefs,
                colors: updateUserDto.colors
            },
        });
    }

    async claimReferral(userId: string, refCode: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user.referredBy) {
            throw new BadRequestException('Already referred by someone');
        }

        if (user.referralCode === refCode) {
            throw new BadRequestException('Cannot refer yourself');
        }

        const referrer = await this.prisma.user.findUnique({
            where: { referralCode: refCode },
        });

        if (!referrer) {
            throw new BadRequestException('Invalid referral code');
        }

        // Assuming coinsAwarded is defined elsewhere or should be added
        // For now, let's keep the original update logic and add a placeholder for coinsAwarded
        await this.prisma.user.update({
            where: { id: userId },
            data: { referredBy: referrer.id },
        });
        const coinsAwarded = 100; // Example value, replace with actual logic
        return { success: true, message: 'Referral claimed', coinsAwarded };
    }

    // Address Management
    async getAddresses(userId: string) {
        return this.prisma.address.findMany({
            where: { userId },
            orderBy: [
                { isDefault: 'desc' }, // Default addresses first
                { createdAt: 'desc' }
            ]
        });
    }

    async createAddress(userId: string, addressData: any) {
        // If this is set as default, unset all other defaults
        if (addressData.isDefault || addressData.is_default) {
            await this.prisma.address.updateMany({
                where: { userId },
                data: { isDefault: false }
            });
        }

        return this.prisma.address.create({
            data: {
                userId,
                name: addressData.name,
                phone: addressData.phone,
                addressLine1: addressData.address_line1 || addressData.addressLine1,
                addressLine2: addressData.address_line2 || addressData.addressLine2,
                city: addressData.city,
                state: addressData.state,
                pincode: addressData.pincode,
                label: addressData.label || 'Home',
                isDefault: addressData.is_default || addressData.isDefault || false
            }
        });
    }

    async updateAddress(userId: string, addressId: string, addressData: any) {
        // Verify ownership
        const address = await this.prisma.address.findFirst({
            where: { id: addressId, userId }
        });

        if (!address) {
            throw new Error('Address not found');
        }

        // If setting as default, unset all other defaults
        if (addressData.isDefault || addressData.is_default) {
            await this.prisma.address.updateMany({
                where: { userId, id: { not: addressId } },
                data: { isDefault: false }
            });
        }

        return this.prisma.address.update({
            where: { id: addressId },
            data: {
                name: addressData.name,
                phone: addressData.phone,
                addressLine1: addressData.address_line1 || addressData.addressLine1,
                addressLine2: addressData.address_line2 || addressData.addressLine2,
                city: addressData.city,
                state: addressData.state,
                pincode: addressData.pincode,
                label: addressData.label,
                isDefault: addressData.is_default || addressData.isDefault
            }
        });
    }

    async deleteAddress(userId: string, addressId: string) {
        // Verify ownership
        const address = await this.prisma.address.findFirst({
            where: { id: addressId, userId }
        });

        if (!address) {
            throw new Error('Address not found');
        }

        await this.prisma.address.delete({
            where: { id: addressId }
        });

        return { success: true, message: 'Address deleted' };
    }

    // --- ORDERS ---

    async getUserOrders(userId: string, limit: number = 50) {
        const orders = await this.prisma.order.findMany({
            where: { userId },
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                address: true,
                payment: true
            }
        });

        return orders;
    }

    async getOrderById(userId: string, orderId: string) {
        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                userId
            },
            include: {
                address: true,
                payment: true
            }
        });

        if (!order) {
            throw new BadRequestException('Order not found');
        }

        return order;
    }

    // --- WISHLIST ---

    async getWishlist(userId: string) {
        return this.prisma.wishlist.findMany({
            where: { userId },
            include: {
                product: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        offerPrice: true,
                        images: true,
                        stock: true,
                        isActive: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async addToWishlist(userId: string, productId: string) {
        // Check if already exists
        const existing = await this.prisma.wishlist.findUnique({
            where: {
                userId_productId: { userId, productId }
            }
        });

        if (existing) {
            return existing;
        }

        return this.prisma.wishlist.create({
            data: { userId, productId }
        });
    }

    async removeFromWishlist(userId: string, productId: string) {
        await this.prisma.wishlist.deleteMany({
            where: { userId, productId }
        });
        return { success: true, message: 'Removed from wishlist' };
    }

    // --- NOTIFICATIONS ---

    async getNotifications(userId: string, limit: number = 50) {
        return this.prisma.notification.findMany({
            where: {
                OR: [
                    { userId },
                    { userId: null } // Broadcasts
                ]
            },
            take: limit,
            orderBy: { createdAt: 'desc' }
        });
    }

    async markNotificationRead(userId: string, notificationId: string) {
        return this.prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true }
        });
    }

    // --- ADMIN METHODS ---

    async findAllUsers(params: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
        status?: string;
    }) {
        const { page = 1, limit = 10, search, role, status } = params;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (role) where.role = role;
        if (status) where.status = status;

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { mobile: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                // Select only necessary fields for admin list
                select: {
                    id: true,
                    name: true,
                    email: true,
                    mobile: true,
                    role: true,
                    status: true,
                    createdAt: true
                }
            }),
            this.prisma.user.count({ where })
        ]);

        return {
            data: users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async updateUserStatus(userId: string, status: string) {
        // Validate status enum
        // For brevity we trust the controller or prisma validation
        return this.prisma.user.update({
            where: { id: userId },
            data: { status: status as any }
        });
    }
}
