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
exports.VendorsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const coins_service_1 = require("../coins/coins.service");
const coin_dto_1 = require("../coins/dto/coin.dto");
const client_1 = require("@prisma/client");
let VendorsService = class VendorsService {
    constructor(prisma, coinsService) {
        this.prisma = prisma;
        this.coinsService = coinsService;
    }
    async register(dto) {
        const existing = await this.prisma.vendor.findUnique({
            where: { mobile: dto.mobile },
        });
        if (existing)
            throw new common_1.BadRequestException('Vendor already exists');
        return this.prisma.vendor.create({
            data: {
                name: dto.name,
                mobile: dto.mobile,
                email: dto.email,
                kycStatus: 'PENDING',
                tier: 'BASIC',
                role: dto.role || client_1.VendorRole.RETAILER,
            },
        });
    }
    async purchaseBannerSlot(userId, image) {
        await this.coinsService.debit(userId, 2000, coin_dto_1.CoinSource.BANNER_PURCHASE);
        return { message: 'Banner slot purchased successfully', validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
    }
    async findAll() {
        return this.prisma.vendor.findMany();
    }
};
exports.VendorsService = VendorsService;
exports.VendorsService = VendorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        coins_service_1.CoinsService])
], VendorsService);
//# sourceMappingURL=vendors.service.js.map