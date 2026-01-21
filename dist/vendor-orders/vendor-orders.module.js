"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorOrdersModule = void 0;
const common_1 = require("@nestjs/common");
const vendor_orders_service_1 = require("./vendor-orders.service");
const vendor_orders_controller_1 = require("./vendor-orders.controller");
const order_state_machine_1 = require("../orders/order-state-machine");
const prisma_module_1 = require("../prisma/prisma.module");
let VendorOrdersModule = class VendorOrdersModule {
};
exports.VendorOrdersModule = VendorOrdersModule;
exports.VendorOrdersModule = VendorOrdersModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [vendor_orders_controller_1.VendorOrdersController],
        providers: [vendor_orders_service_1.VendorOrdersService, order_state_machine_1.OrderStateMachine],
    })
], VendorOrdersModule);
//# sourceMappingURL=vendor-orders.module.js.map