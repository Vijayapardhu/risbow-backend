import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { GeoService } from '../shared/geo.service';
import { SupabaseService } from '../shared/supabase.service';
import * as bcrypt from 'bcrypt';
import { FraudService } from '../common/fraud.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private redisService: RedisService,
        private fraudService: FraudService,
        private geoService: GeoService,
        private supabaseService: SupabaseService,
    ) { }

    async sendOtp(mobile: string) {
        try {
            // Check rate limiting - prevent sending OTP more than once per minute
            const rateLimitKey = `otp:ratelimit:${mobile}`;
            const lastSent = await this.redisService.get(rateLimitKey);

            if (lastSent) {
                const remainingTime = Math.ceil((60000 - (Date.now() - parseInt(lastSent))) / 1000);
                throw new BadRequestException(`Please wait ${remainingTime} seconds before requesting a new OTP`);
            }

            // Use Supabase to send OTP via SMS
            const supabase = this.supabaseService.getClient();
            if (!supabase || !this.supabaseService.isAuthEnabled()) {
                throw new HttpException('OTP service is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.', HttpStatus.SERVICE_UNAVAILABLE);
            }

            const { data, error } = await supabase.auth.signInWithOtp({
                phone: mobile,
            });

            if (error) {
                this.logger.error(`Supabase OTP send error: ${error.message}`);
                const status = (error as any)?.status ?? HttpStatus.CONFLICT;
                throw new HttpException(`Failed to send OTP: ${error.message}`, status);
            }

            this.logger.log(`[Supabase] OTP sent to ${mobile}`);

            // Set rate limit - OTP can be resent after 60 seconds
            await this.redisService.set(rateLimitKey, Date.now().toString(), 60);

            return { message: 'OTP sent successfully' };
        } catch (error) {
            console.error('Error sending OTP:', error);
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(error?.message || 'Failed to send OTP', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async verifyOtp(mobile: string, otp: string) {
        try {
            // Check if there's a recent successful verification in Redis to prevent duplicates
            const recentVerificationKey = `otp:verified:${mobile}:${otp}`;
            const recentVerification = await this.redisService.get(recentVerificationKey);

            if (recentVerification) {
                console.log(`[Cache] Found recent verification for ${mobile}, returning cached result`);
                return JSON.parse(recentVerification);
            }

            // Verify OTP with Supabase
            const supabase = this.supabaseService.getClient();
            if (!supabase || !this.supabaseService.isAuthEnabled()) {
                throw new UnauthorizedException('OTP verification service is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
            }

            const { data, error } = await supabase.auth.verifyOtp({
                phone: mobile,
                token: otp,
                type: 'sms',
            });

            if (error) {
                this.logger.error(`Supabase OTP verification error: ${error.message}`);

                // Provide more specific error messages
                if (error.code === 'otp_expired') {
                    throw new UnauthorizedException('OTP has expired. Please request a new OTP.');
                } else if (error.code === 'otp_disabled') {
                    throw new UnauthorizedException('OTP verification is currently disabled.');
                } else {
                    throw new UnauthorizedException('Invalid OTP. Please check and try again.');
                }
            }

            if (!data.user) {
                throw new UnauthorizedException('Verification failed');
            }

            this.logger.log(`[Supabase] OTP verified for ${mobile}, user ID: ${data.user.id}`);

            // Check if user exists in our database
            const user = await this.prisma.user.findUnique({
                where: { mobile },
            });

            if (!user) {
                // User not found - return status to trigger signup flow
                // We throw a specific error that the frontend looks for
                throw new NotFoundException('User not found');
            }

            console.log(`[Database] Found existing user: ${user.id}, role: ${user.role}`);

            // Generate access token (short-lived for security)
            const payload = { sub: user.id, mobile: user.mobile, role: user.role };
            const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

            // Generate refresh token (long-lived, stored in Redis)
            const refreshToken = this.jwtService.sign(
                { sub: user.id, type: 'refresh' },
                { expiresIn: '7d' }
            );

            // Store refresh token in Redis with user ID mapping
            await this.redisService.set(
                `refresh_token:${user.id}`,
                refreshToken,
                7 * 24 * 60 * 60 // 7 days in seconds
            );

            const result = {
                access_token: accessToken,
                refresh_token: refreshToken,
                user,
            };

            // 🔐 P0 FIX: Fraud Analysis on Login
            await (this as any).fraudService.evaluateRisk(user.id, (user as any).metadata?.lastFingerprint).catch(e => console.error('Fraud analysis failed:', e));

            // Cache the successful verification for 30 seconds to prevent duplicate calls
            await this.redisService.set(recentVerificationKey, JSON.stringify(result), 30);

            return result;
        } catch (error) {
            if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
                throw error;
            }
            console.error('Error verifying OTP:', error);
            throw new UnauthorizedException('Failed to verify OTP');
        }
    }

    async registerWithEmail(registerDto: any) {
        // Check if email already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: registerDto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        // Check if mobile already exists
        const existingMobile = await this.prisma.user.findUnique({
            where: { mobile: registerDto.phone },
        });

        if (existingMobile) {
            throw new ConflictException('Mobile number already registered');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);

        // Create user in Supabase Auth first (if enabled)
        if (this.supabaseService.isAuthEnabled()) {
            try {
                await this.supabaseService.createAuthUser(registerDto.email, registerDto.password);
                this.logger.log(`Created Supabase auth user for: ${registerDto.email}`);
            } catch (error) {
                this.logger.warn(`Supabase auth creation failed (continuing anyway): ${error.message}`);
            }
        } else {
            this.logger.warn('Supabase Auth not enabled - skipping auth user creation');
        }

        // Create user with all details
        const refCode = (registerDto.referralCode || '').trim();
        let referredBy: string | undefined = undefined;
        if (refCode) {
            const referrer = await this.prisma.user.findUnique({ where: { referralCode: refCode } });
            if (!referrer) throw new BadRequestException('Invalid referral code');
            // Self-referral impossible pre-create, but guard anyway
            referredBy = referrer.id;
        }

        const user = await this.prisma.user.create({
            data: {
                id: randomUUID(),
                name: registerDto.name,
                email: registerDto.email,
                password: hashedPassword,
                mobile: registerDto.phone,
                dateOfBirth: new Date(registerDto.dateOfBirth),
                gender: registerDto.gender,
                referralCode: Math.random().toString(36).substring(7).toUpperCase(),
                referredBy,
                status: 'ACTIVE', // Explicitly set status matching schema enum
                updatedAt: new Date(),
            } as any,
        }) as any;

        // Initialize empty cart
        await (this.prisma.cart.create as any)({
            data: { id: randomUUID(), userId: user.id, updatedAt: new Date() },
        });

        // Add default address if provided
        if (registerDto.address) {
            const geo = await this.geoService
                .resolveAddressGeo({
                    addressLine1: registerDto.address.line1 || registerDto.address.street || registerDto.address.addressLine1,
                    addressLine2: registerDto.address.line2 || registerDto.address.addressLine2,
                    city: registerDto.address.city,
                    state: registerDto.address.state,
                    pincode: registerDto.address.postalCode || registerDto.address.pincode,
                })
                .catch(() => null);

            await (this.prisma.address.create as any)({
                data: {
                    id: randomUUID(),
                    userId: user.id,
                    name: registerDto.name || '',
                    phone: registerDto.phone || '',
                    addressLine1: registerDto.address.line1 || registerDto.address.street || registerDto.address.addressLine1 || '',
                    addressLine2: registerDto.address.line2 || registerDto.address.addressLine2 || null,
                    city: registerDto.address.city || '',
                    state: registerDto.address.state || '',
                    pincode: registerDto.address.postalCode || registerDto.address.pincode || '',
                    label: 'Home',
                    isDefault: true,
                    latitude: geo?.point.lat,
                    longitude: geo?.point.lng,
                    geoSource: geo?.source,
                    geoUpdatedAt: geo ? new Date() : undefined,
                    updatedAt: new Date(),
                },
            });
        }

        // Generate access token (short-lived for security)
        const payload = { sub: user.id, email: user.email };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

        // Generate refresh token (long-lived, stored in Redis)
        const refreshToken = this.jwtService.sign(
            { sub: user.id, type: 'refresh' },
            { expiresIn: '7d' }
        );

        // Store refresh token in Redis with user ID mapping
        await this.redisService.set(
            `refresh_token:${user.id}`,
            refreshToken,
            7 * 24 * 60 * 60 // 7 days in seconds
        );

        // Remove password from response
        const { password, ...userWithoutPassword } = user;

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: userWithoutPassword,
        };
    }

    async loginWithEmail(email: string, password: string) {
        // Find user by email
        const user = await this.prisma.user.findUnique({
            where: { email },
        }) as any;

        if (!user || !user.password) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Generate JWT token
        const payload = { sub: user.id, email: user.email, role: user.role };

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        // Generate access token (short-lived for security)
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

        // Generate refresh token (long-lived, stored in Redis)
        const refreshToken = this.jwtService.sign(
            { sub: user.id, type: 'refresh' },
            { expiresIn: '7d' }
        );

        // Store refresh token in Redis with user ID mapping
        await this.redisService.set(
            `refresh_token:${user.id}`,
            refreshToken,
            7 * 24 * 60 * 60 // 7 days in seconds
        );

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: userWithoutPassword,
        };
    }

    async refreshToken(refreshToken: string) {
        try {
            // Verify refresh token
            const payload = this.jwtService.verify(refreshToken);

            if (payload.type !== 'refresh') {
                throw new UnauthorizedException('Invalid token type');
            }

            // Check if refresh token exists in Redis (not revoked)
            const storedToken = await this.redisService.get(`refresh_token:${payload.sub}`);
            if (!storedToken || storedToken !== refreshToken) {
                throw new UnauthorizedException('Refresh token has been revoked or expired');
            }

            // Get user to ensure they still exist and are active
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            if (user.status !== 'ACTIVE') {
                throw new UnauthorizedException('User account is not active');
            }

            // Generate new access token
            const newPayload = { sub: user.id, email: user.email, role: user.role };
            const accessToken = this.jwtService.sign(newPayload, { expiresIn: '15m' });

            // Remove password from user object
            const { password, ...userWithoutPassword } = user;

            return {
                access_token: accessToken,
                user: userWithoutPassword,
            };
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            // JWT verification errors
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }

    async logout(userId: string, refreshToken?: string, accessToken?: string) {
        // Revoke refresh token by removing it from Redis
        await this.redisService.del(`refresh_token:${userId}`);

        // Blacklist the access token if provided (prevents reuse until expiry)
        if (accessToken) {
            try {
                const payload = this.jwtService.decode(accessToken);
                if (payload && payload.exp) {
                    const ttl = payload.exp - Math.floor(Date.now() / 1000);
                    if (ttl > 0) {
                        await this.redisService.set(
                            `token:blacklist:${userId}:${payload.iat}`,
                            'revoked',
                            ttl
                        );
                    }
                }
            } catch (e) {
                // Ignore token decode errors
            }
        }

        return { message: 'Logged out successfully' };
    }

    async forceLogoutAllSessions(userId: string) {
        // Set force logout timestamp in Redis for immediate effect
        const now = Math.floor(Date.now() / 1000);
        await this.redisService.set(`force_logout:${userId}`, now.toString(), 7 * 24 * 60 * 60);

        // Remove all refresh tokens
        await this.redisService.del(`refresh_token:${userId}`);

        // Update user's forceLogoutAt in database for persistent logout
        await this.prisma.user.update({
            where: { id: userId },
            data: { forceLogoutAt: new Date() }
        });

        return { message: 'All sessions invalidated successfully' };
    }

    async forgotPassword(email: string) {
        try {
            const supabase = this.supabaseService.getClient();
            if (!supabase || !this.supabaseService.isAuthEnabled()) {
                throw new HttpException('Password reset service is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.', HttpStatus.SERVICE_UNAVAILABLE);
            }

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/auth/reset-password`,
            });

            if (error) {
                this.logger.error(`Supabase password reset error: ${error.message}`);
                throw new ConflictException(error.message);
            }

            return { message: 'Password reset email sent successfully' };
        } catch (error) {
            if (error instanceof ConflictException) {
                throw error;
            }
            console.error('Error sending password reset email:', error);
            throw new ConflictException('Failed to send password reset email');
        }
    }
    async registerVendor(registerDto: any) {
        try {
            console.log('=== Vendor Registration Started ===');
            console.log('Registration Data:', JSON.stringify(registerDto, null, 2));

            // 1. Check if user already exists (by email or mobile)
            const existingUser = await this.prisma.user.findFirst({
                where: {
                    OR: [
                        { email: registerDto.email },
                        { mobile: registerDto.mobile }
                    ]
                }
            });

            if (existingUser) {
                throw new ConflictException('User with this email or mobile already exists');
            }

            // 2. Hash password
            const hashedPassword = await bcrypt.hash(registerDto.password, 10);

            // 3. Create User and Vendor in a transaction
            console.log('Creating user and vendor...');
            const result = await this.prisma.$transaction(async (prisma) => {
            // Create User
            const user = await (prisma.user.create as any)({
                data: {
                    name: registerDto.name,
                    email: registerDto.email,
                    mobile: registerDto.mobile,
                    password: hashedPassword,
                    role: 'VENDOR',
                    status: 'ACTIVE',
                    referralCode: Math.random().toString(36).substring(7).toUpperCase(),
                },
            });

            // Create wallet for user
            const walletId = `wal_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            await (prisma.wallet.create as any)({
                data: { 
                    id: walletId,
                    userId: user.id, 
                    balance: 0,
                    updatedAt: new Date()
                },
            });

            // Create cart for user
            const cartId = `crt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            await (prisma.cart.create as any)({
                data: { 
                    id: cartId,
                    userId: user.id,
                    updatedAt: new Date()
                },
            });

            // Create Vendor
            const vendorId = `vnd_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            const vendor = await (prisma.vendor.create as any)({
                data: {
                    id: vendorId,
                    name: registerDto.name,
                    mobile: registerDto.mobile,
                    email: registerDto.email,
                    storeName: registerDto.storeName,
                    storeStatus: 'ACTIVE',
                    gstNumber: registerDto.gstNumber || null,
                    isGstVerified: false, // Pending verification
                    kycStatus: 'PENDING',
                    bankDetails: registerDto.bankDetails,
                    role: 'RETAILER', // Default role
                    updatedAt: new Date(), // Required field
                    // Store pickup address in bankDetails or vendor profile
                    kycDocuments: {
                        panNumber: registerDto.panNumber,
                        pickupAddress: registerDto.pickupAddress,
                        isGstRegistered: registerDto.isGstRegistered
                    }
                },
            });

            // Initialize empty discipline state for vendor
            await (prisma.vendorDisciplineState.create as any)({
                data: {
                    vendorId: vendor.id,
                    state: 'ACTIVE',
                    activeStrikes: 0,
                    consecutiveSuccesses: 0,
                    updatedAt: new Date(),
                },
            });

            // Add compliance fee if Non-GST (optional logic, can be handled via ledger later)
            if (!registerDto.isGstRegistered) {
                // Record compliance fee deduction as audit log for future ledger integration
                // Note: Using user.id as adminId since this is a system-generated action
                try {
                    await (prisma.auditLog.create as any)({
                        data: {
                            adminId: user.id,
                            action: 'COMPLIANCE_FEE_PENDING',
                            entity: 'VENDOR',
                            entityId: vendor.id,
                            details: {
                                vendorId: vendor.id,
                                userId: user.id,
                                feeType: 'NON_GST_COMPLIANCE',
                                amount: 500, // Standard compliance fee
                                status: 'PENDING',
                                createdAt: new Date().toISOString()
                            }
                        },
                    });
                } catch (auditError) {
                    // Log but don't fail registration if audit log creation fails
                    console.error('Failed to create audit log for compliance fee:', auditError);
                }
            }

            return { user, vendor };
        });

        // 4. Generate Tokens
        const payload = { sub: result.user.id, email: result.user.email, role: result.user.role };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
        const refreshToken = this.jwtService.sign(
            { sub: result.user.id, type: 'refresh' },
            { expiresIn: '7d' }
        );

        // Store refresh token
        try {
            await this.redisService.set(
                `refresh_token:${result.user.id}`,
                refreshToken,
                7 * 24 * 60 * 60
            );
        } catch (redisError) {
            console.warn('Redis not available, skipping refresh token storage:', redisError.message);
        }

        const { password, ...userWithoutPassword } = result.user;

        console.log('=== Vendor Registration Successful ===');
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: userWithoutPassword,
            vendor: result.vendor,
        };
        } catch (error) {
            console.error('=== Vendor Registration Error ===');
            console.error('Error details:', error);
            throw error;
        }
    }
}
