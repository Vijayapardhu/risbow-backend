"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftsModule = void 0;
const common_1 = require("@nestjs/common");
const gifts_controller_1 = require("./gifts.controller");
const gifts_service_1 = require("./gifts.service");
const prisma_module_1 = require("../prisma/prisma.module");
let GiftsModule = class GiftsModule {
};
exports.GiftsModule = GiftsModule;
exports.GiftsModule = GiftsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [gifts_controller_1.GiftsController],
        providers: [gifts_service_1.GiftsService],
        exports: [gifts_service_1.GiftsService],
    })
], GiftsModule);
//# sourceMappingURL=gifts.module.js.map