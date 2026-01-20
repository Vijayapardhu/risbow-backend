"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_controller_1 = require("./admin.controller");
const admin_service_1 = require("./admin.service");
const admin_dashboard_controller_1 = require("./admin-dashboard.controller");
const admin_dashboard_service_1 = require("./admin-dashboard.service");
const admin_product_controller_1 = require("./admin-product.controller");
const admin_product_service_1 = require("./admin-product.service");
const prisma_module_1 = require("../prisma/prisma.module");
const vendors_module_1 = require("../vendors/vendors.module");
const category_spec_service_1 = require("../catalog/category-spec.service");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, vendors_module_1.VendorsModule],
        controllers: [admin_controller_1.AdminController, admin_dashboard_controller_1.AdminDashboardController, admin_product_controller_1.AdminProductController],
        providers: [admin_service_1.AdminService, admin_dashboard_service_1.AdminDashboardService, admin_product_service_1.AdminProductService, category_spec_service_1.CategorySpecService],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map