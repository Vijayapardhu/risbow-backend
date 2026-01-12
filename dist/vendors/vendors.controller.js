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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorsController = void 0;
const common_1 = require("@nestjs/common");
const vendors_service_1 = require("./vendors.service");
const vendor_dto_1 = require("./dto/vendor.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let VendorsController = class VendorsController {
    constructor(vendorsService) {
        this.vendorsService = vendorsService;
    }
    async register(dto) {
        return this.vendorsService.register(dto);
    }
    async purchaseBanner(image, req) {
        return this.vendorsService.purchaseBannerSlot(req.user.id, image);
    }
    async findAll() {
        return this.vendorsService.findAll();
    }
    async getVendorStats(req) {
        return this.vendorsService.getVendorStats(req.user.id);
    }
};
exports.VendorsController = VendorsController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [vendor_dto_1.RegisterVendorDto]),
    __metadata("design:returntype", Promise)
], VendorsController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('banner'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)('image')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VendorsController.prototype, "purchaseBanner", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], VendorsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VendorsController.prototype, "getVendorStats", null);
exports.VendorsController = VendorsController = __decorate([
    (0, common_1.Controller)('vendors'),
    __metadata("design:paramtypes", [vendors_service_1.VendorsService])
], VendorsController);
//# sourceMappingURL=vendors.controller.js.map