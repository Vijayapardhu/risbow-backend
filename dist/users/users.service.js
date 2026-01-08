"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findOne(id) {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }
    async update(id, updateUserDto) {
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
    async claimReferral(userId, refCode) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user.referredBy) {
            throw new common_1.BadRequestException('Already referred by someone');
        }
        if (user.referralCode === refCode) {
            throw new common_1.BadRequestException('Cannot refer yourself');
        }
        const referrer = await this.prisma.user.findUnique({
            where: { referralCode: refCode },
        });
        if (!referrer) {
            throw new common_1.BadRequestException('Invalid referral code');
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: { referredBy: referrer.id },
        });
        const coinsAwarded = 100;
        return { success: true, message: 'Referral claimed', coinsAwarded };
    }
    async getAddresses(userId) {
        return this.prisma.address.findMany({
            where: { userId },
            orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'desc' }
            ]
        });
    }
    async createAddress(userId, addressData) {
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
    async updateAddress(userId, addressId, addressData) {
        const address = await this.prisma.address.findFirst({
            where: { id: addressId, userId }
        });
        if (!address) {
            throw new Error('Address not found');
        }
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
    async deleteAddress(userId, addressId) {
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
    async getUserOrders(userId, limit = 50) {
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
    async getOrderById(userId, orderId) {
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
            throw new common_1.BadRequestException('Order not found');
        }
        return order;
    }
    async getWishlist(userId) {
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
    async addToWishlist(userId, productId) {
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
    async removeFromWishlist(userId, productId) {
        await this.prisma.wishlist.deleteMany({
            where: { userId, productId }
        });
        return { success: true, message: 'Removed from wishlist' };
    }
    async getNotifications(userId, limit = 50) {
        return this.prisma.notification.findMany({
            where: {
                OR: [
                    { userId },
                    { userId: null }
                ]
            },
            take: limit,
            orderBy: { createdAt: 'desc' }
        });
    }
    async markNotificationRead(userId, notificationId) {
        return this.prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true }
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map