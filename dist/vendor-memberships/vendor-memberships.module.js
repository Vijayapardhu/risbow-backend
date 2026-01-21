"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorMembershipsModule = void 0;
const common_1 = require("@nestjs/common");
const vendor_memberships_controller_1 = require("./vendor-memberships.controller");
const vendor_memberships_service_1 = require("./vendor-memberships.service");
const prisma_module_1 = require("../prisma/prisma.module");
let VendorMembershipsModule = class VendorMembershipsModule {
};
exports.VendorMembershipsModule = VendorMembershipsModule;
exports.VendorMembershipsModule = VendorMembershipsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [vendor_memberships_controller_1.VendorMembershipsController],
        providers: [vendor_memberships_service_1.VendorMembershipsService],
        exports: [vendor_memberships_service_1.VendorMembershipsService],
    })
], VendorMembershipsModule);
//# sourceMappingURL=vendor-memberships.module.js.map