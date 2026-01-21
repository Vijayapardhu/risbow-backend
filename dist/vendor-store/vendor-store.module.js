"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorStoreModule = void 0;
const common_1 = require("@nestjs/common");
const vendor_store_controller_1 = require("./vendor-store.controller");
const vendor_store_service_1 = require("./vendor-store.service");
const prisma_service_1 = require("../prisma/prisma.service");
const upload_module_1 = require("../upload/upload.module");
let VendorStoreModule = class VendorStoreModule {
};
exports.VendorStoreModule = VendorStoreModule;
exports.VendorStoreModule = VendorStoreModule = __decorate([
    (0, common_1.Module)({
        controllers: [vendor_store_controller_1.VendorStoreController],
        imports: [upload_module_1.UploadModule],
        providers: [vendor_store_service_1.VendorStoreService, prisma_service_1.PrismaService],
        exports: [vendor_store_service_1.VendorStoreService]
    })
], VendorStoreModule);
//# sourceMappingURL=vendor-store.module.js.map