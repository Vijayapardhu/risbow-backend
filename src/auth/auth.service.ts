import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    private supabase: any;

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private redisService: RedisService,
    ) {
        // Initialize Supabase client
        const { createClient } = require('@supabase/supabase-js');
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

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
            const { data, error } = await this.supabase.auth.signInWithOtp({
                phone: mobile,
            });

            if (error) {
                console.error('Supabase OTP send error:', error);
                const status = (error as any)?.status ?? HttpStatus.CONFLICT;
                throw new HttpException(`Failed to send OTP: ${error.message}`, status);
            }

            console.log(`[Supabase] OTP sent to ${mobile}`);
            
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
            const { data, error } = await this.supabase.auth.verifyOtp({
                phone: mobile,
                token: otp,
                type: 'sms',
            });

            if (error) {
                console.error('Supabase OTP verification error:', error);
                
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

            console.log(`[Supabase] OTP verified for ${mobile}, user ID: ${data.user.id}`);

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

            // Generate JWT token
            const payload = { sub: user.id, mobile: user.mobile, role: user.role };
            const result = {
                access_token: this.jwtService.sign(payload),
                user,
            };

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

        // Hash password
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);

        // Create user in Supabase Auth first
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            const { data: authUser, error } = await supabase.auth.admin.createUser({
                email: registerDto.email,
                password: registerDto.password,
                email_confirm: true,
            });

            if (error) {
                console.error('Supabase auth creation failed:', error.message);
            } else {
                console.log('Created Supabase auth user:', authUser.user?.id);
            }
        } catch (error) {
            console.error('Failed to create Supabase auth user:', error);
        }

        // Create user with all details
        const user = await this.prisma.user.create({
            data: {
                name: registerDto.name,
                email: registerDto.email,
                password: hashedPassword,
                mobile: registerDto.phone,
                dateOfBirth: new Date(registerDto.dateOfBirth),
                gender: registerDto.gender,
                referralCode: Math.random().toString(36).substring(7).toUpperCase(),
            } as any,
        }) as any;

        // Initialize empty cart
        await this.prisma.cart.create({
            data: { userId: user.id },
        });

        // Add default address if provided
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

        // Generate JWT token
        const payload = { sub: user.id, email: user.email };

        // Remove password from response
        const { password, ...userWithoutPassword } = user;

        return {
            access_token: this.jwtService.sign(payload),
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
        const payload = { sub: user.id, email: user.email };

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        return {
            access_token: this.jwtService.sign(payload),
            user: userWithoutPassword,
        };
    }

    async forgotPassword(email: string) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/auth/reset-password`,
            });

            if (error) {
                console.error('Supabase password reset error:', error);
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
}
