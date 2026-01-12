"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../shared/redis.service");
const bcrypt = __importStar(require("bcrypt"));
let AuthService = class AuthService {
    constructor(prisma, jwtService, redisService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.redisService = redisService;
        const { createClient } = require('@supabase/supabase-js');
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    async sendOtp(mobile) {
        try {
            const rateLimitKey = `otp:ratelimit:${mobile}`;
            const lastSent = await this.redisService.get(rateLimitKey);
            if (lastSent) {
                const remainingTime = Math.ceil((60000 - (Date.now() - parseInt(lastSent))) / 1000);
                throw new common_1.BadRequestException(`Please wait ${remainingTime} seconds before requesting a new OTP`);
            }
            const { data, error } = await this.supabase.auth.signInWithOtp({
                phone: mobile,
            });
            if (error) {
                console.error('Supabase OTP send error:', error);
                const status = error?.status ?? common_1.HttpStatus.CONFLICT;
                throw new common_1.HttpException(`Failed to send OTP: ${error.message}`, status);
            }
            console.log(`[Supabase] OTP sent to ${mobile}`);
            await this.redisService.set(rateLimitKey, Date.now().toString(), 60);
            return { message: 'OTP sent successfully' };
        }
        catch (error) {
            console.error('Error sending OTP:', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException(error?.message || 'Failed to send OTP', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async verifyOtp(mobile, otp) {
        try {
            const recentVerificationKey = `otp:verified:${mobile}:${otp}`;
            const recentVerification = await this.redisService.get(recentVerificationKey);
            if (recentVerification) {
                console.log(`[Cache] Found recent verification for ${mobile}, returning cached result`);
                return JSON.parse(recentVerification);
            }
            const { data, error } = await this.supabase.auth.verifyOtp({
                phone: mobile,
                token: otp,
                type: 'sms',
            });
            if (error) {
                console.error('Supabase OTP verification error:', error);
                if (error.code === 'otp_expired') {
                    throw new common_1.UnauthorizedException('OTP has expired. Please request a new OTP.');
                }
                else if (error.code === 'otp_disabled') {
                    throw new common_1.UnauthorizedException('OTP verification is currently disabled.');
                }
                else {
                    throw new common_1.UnauthorizedException('Invalid OTP. Please check and try again.');
                }
            }
            if (!data.user) {
                throw new common_1.UnauthorizedException('Verification failed');
            }
            console.log(`[Supabase] OTP verified for ${mobile}, user ID: ${data.user.id}`);
            const user = await this.prisma.user.findUnique({
                where: { mobile },
            });
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            console.log(`[Database] Found existing user: ${user.id}, role: ${user.role}`);
            const payload = { sub: user.id, mobile: user.mobile, role: user.role };
            const result = {
                access_token: this.jwtService.sign(payload),
                user,
            };
            await this.redisService.set(recentVerificationKey, JSON.stringify(result), 30);
            return result;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException || error instanceof common_1.NotFoundException) {
                throw error;
            }
            console.error('Error verifying OTP:', error);
            throw new common_1.UnauthorizedException('Failed to verify OTP');
        }
    }
    async registerWithEmail(registerDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: registerDto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Email already registered');
        }
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
            const { data: authUser, error } = await supabase.auth.admin.createUser({
                email: registerDto.email,
                password: registerDto.password,
                email_confirm: true,
            });
            if (error) {
                console.error('Supabase auth creation failed:', error.message);
            }
            else {
                console.log('Created Supabase auth user:', authUser.user?.id);
            }
        }
        catch (error) {
            console.error('Failed to create Supabase auth user:', error);
        }
        const user = await this.prisma.user.create({
            data: {
                name: registerDto.name,
                email: registerDto.email,
                password: hashedPassword,
                mobile: registerDto.phone,
                dateOfBirth: new Date(registerDto.dateOfBirth),
                gender: registerDto.gender,
                referralCode: Math.random().toString(36).substring(7).toUpperCase(),
            },
        });
        await this.prisma.cart.create({
            data: { userId: user.id },
        });
        if (registerDto.address) {
            await this.prisma.address.create({
                data: {
                    userId: user.id,
                    name: registerDto.name || '',
                    phone: registerDto.phone || '',
                    addressLine1: registerDto.address.street || registerDto.address.addressLine1 || '',
                    addressLine2: registerDto.address.addressLine2 || null,
                    city: registerDto.address.city || '',
                    state: registerDto.address.state || '',
                    pincode: registerDto.address.postalCode || registerDto.address.pincode || '',
                    label: 'Home',
                    isDefault: true,
                },
            });
        }
        const payload = { sub: user.id, email: user.email };
        const { password, ...userWithoutPassword } = user;
        return {
            access_token: this.jwtService.sign(payload),
            user: userWithoutPassword,
        };
    }
    async loginWithEmail(email, password) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user || !user.password) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const payload = { sub: user.id, email: user.email, role: user.role };
        const { password: _, ...userWithoutPassword } = user;
        return {
            access_token: this.jwtService.sign(payload),
            user: userWithoutPassword,
        };
    }
    async forgotPassword(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/auth/reset-password`,
            });
            if (error) {
                console.error('Supabase password reset error:', error);
                throw new common_1.ConflictException(error.message);
            }
            return { message: 'Password reset email sent successfully' };
        }
        catch (error) {
            if (error instanceof common_1.ConflictException) {
                throw error;
            }
            console.error('Error sending password reset email:', error);
            throw new common_1.ConflictException('Failed to send password reset email');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        redis_service_1.RedisService])
], AuthService);
//# sourceMappingURL=auth.service.js.map