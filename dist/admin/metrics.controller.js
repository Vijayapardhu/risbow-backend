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
exports.MetricsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const roles_guard_1 = require("../auth/roles.guard");
const cache_service_1 = require("../shared/cache.service");
const queues_service_1 = require("../queues/queues.service");
let MetricsController = class MetricsController {
    constructor(cache, queues) {
        this.cache = cache;
        this.queues = queues;
    }
    async getCacheMetrics() {
        const metrics = this.cache.getMetrics();
        return {
            timestamp: new Date().toISOString(),
            metrics,
            summary: {
                totalHits: Object.values(metrics).reduce((sum, m) => sum + m.hits, 0),
                totalMisses: Object.values(metrics).reduce((sum, m) => sum + m.misses, 0),
                averageHitRatio: Object.values(metrics).length > 0
                    ? Object.values(metrics).reduce((sum, m) => sum + m.ratio, 0) / Object.values(metrics).length
                    : 0,
            }
        };
    }
    async getQueueStats() {
        const stats = await this.queues.getQueueStats();
        return {
            timestamp: new Date().toISOString(),
            queues: stats,
        };
    }
};
exports.MetricsController = MetricsController;
__decorate([
    (0, common_1.Get)('cache'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Get cache hit/miss metrics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MetricsController.prototype, "getCacheMetrics", null);
__decorate([
    (0, common_1.Get)('queues'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Get queue statistics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MetricsController.prototype, "getQueueStats", null);
exports.MetricsController = MetricsController = __decorate([
    (0, swagger_1.ApiTags)('Admin - Performance Metrics'),
    (0, common_1.Controller)('admin/metrics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [cache_service_1.CacheService,
        queues_service_1.QueuesService])
], MetricsController);
//# sourceMappingURL=metrics.controller.js.map