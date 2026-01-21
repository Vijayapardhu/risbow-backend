"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorProductsModule = void 0;
const common_1 = require("@nestjs/common");
const vendor_products_controller_1 = require("./vendor-products.controller");
const vendor_products_service_1 = require("./vendor-products.service");
const prisma_service_1 = require("../prisma/prisma.service");
let VendorProductsModule = class VendorProductsModule {
};
exports.VendorProductsModule = VendorProductsModule;
exports.VendorProductsModule = VendorProductsModule = __decorate([
    (0, common_1.Module)({
        controllers: [vendor_products_controller_1.VendorProductsController],
        providers: [vendor_products_service_1.VendorProductsService, prisma_service_1.PrismaService],
        exports: [vendor_products_service_1.VendorProductsService]
    })
], VendorProductsModule);
//# sourceMappingURL=vendor-products.module.js.map