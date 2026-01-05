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
exports.CoinsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CoinsService = class CoinsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getBalance(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { coinsBalance: true },
        });
        return { balance: (user === null || user === void 0 ? void 0 : user.coinsBalance) || 0 };
    }
    async getLedger(userId) {
        return this.prisma.coinLedger.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }
    async credit(userId, amount, source) {
        return this.prisma.$transaction(async (tx) => {
            await tx.coinLedger.create({
                data: {
                    userId,
                    amount,
                    source,
                    expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 3)),
                },
            });
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { coinsBalance: { increment: amount } },
            });
            return updatedUser;
        });
    }
    async debit(userId, amount, source) {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user || user.coinsBalance < amount) {
                throw new common_1.BadRequestException('Insufficient coin balance');
            }
            await tx.coinLedger.create({
                data: {
                    userId,
                    amount: -amount,
                    source,
                },
            });
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { coinsBalance: { decrement: amount } },
            });
            return updatedUser;
        });
    }
};
exports.CoinsService = CoinsService;
exports.CoinsService = CoinsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CoinsService);
//# sourceMappingURL=coins.service.js.map