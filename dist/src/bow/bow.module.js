"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BowModule = void 0;
const common_1 = require("@nestjs/common");
const bow_service_1 = require("./bow.service");
const bow_controller_1 = require("./bow.controller");
let BowModule = class BowModule {
};
exports.BowModule = BowModule;
exports.BowModule = BowModule = __decorate([
    (0, common_1.Module)({
        controllers: [bow_controller_1.BowController],
        providers: [bow_service_1.BowService],
    })
], BowModule);
//# sourceMappingURL=bow.module.js.map