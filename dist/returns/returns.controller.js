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
exports.ReturnsController = void 0;
const common_1 = require("@nestjs/common");
const returns_service_1 = require("./returns.service");
const create_return_dto_1 = require("./dto/create-return.dto");
const update_return_dto_1 = require("./dto/update-return.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const swagger_1 = require("@nestjs/swagger");
let ReturnsController = class ReturnsController {
    constructor(returnsService) {
        this.returnsService = returnsService;
    }
    create(req, createReturnDto) {
        return this.returnsService.create(req.user.id, createReturnDto);
    }
    findAll(req, query) {
        if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            query.userId = req.user.id;
        }
        return this.returnsService.findAll(query);
    }
    findOne(id) {
        return this.returnsService.findOne(id);
    }
    updateStatus(req, id, updateReturnStatusDto) {
        return this.returnsService.updateStatus(id, updateReturnStatusDto, req.user.id);
    }
};
exports.ReturnsController = ReturnsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new return request for a customer' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_return_dto_1.CreateReturnDto]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get my returns (Customer) or All Returns (Admin)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get detailed return info' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Admin: Update return status' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_return_dto_1.UpdateReturnStatusDto]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "updateStatus", null);
exports.ReturnsController = ReturnsController = __decorate([
    (0, swagger_1.ApiTags)('Returns'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('returns'),
    __metadata("design:paramtypes", [returns_service_1.ReturnsService])
], ReturnsController);
//# sourceMappingURL=returns.controller.js.map