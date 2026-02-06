import { Controller, Post, Body, UseGuards, Request, Headers, UploadedFiles, UseInterceptors, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { VendorOnboardingService } from './vendor-onboarding.service';
import { SendOtpDto, VerifyOtpDto, RegisterDto, LoginDto } from './dto/auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterVendorDto } from './dto/register-vendor.dto';
import { RegisterVendorWithDocsDto, VerifyRegistrationPaymentDto } from './dto/register-vendor-with-docs.dto';
import { GetUser } from './decorators/get-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly vendorOnboardingService: VendorOnboardingService
    ) { }

    @Post('otp-send')
    @ApiOperation({ summary: 'Send OTP to mobile number' })
    @ApiResponse({ status: 200, description: 'OTP sent successfully' })
    @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 OTP requests per minute
    async sendOtp(@Body() sendOtpDto: SendOtpDto) {
        return this.authService.sendOtp(sendOtpDto.mobile);
    }

    @Post('otp-verify')
    @ApiOperation({ summary: 'Verify OTP' })
    @ApiResponse({ status: 200, description: 'OTP verified, returns token if user exists' })
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 verification attempts per minute
    async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
        return this.authService.verifyOtp(verifyOtpDto.mobile, verifyOtpDto.otp);
    }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User successfully registered' })
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 registration attempts per minute
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.registerWithEmail(registerDto);
    }

    @Post('login')
    @ApiOperation({ summary: 'Login with Email/Password' })
    @ApiResponse({ status: 200, description: 'Returns access token' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
    async login(@Body() loginDto: LoginDto) {
        return this.authService.loginWithEmail(loginDto.email, loginDto.password);
    }

    @Post('forgot-password')
    @ApiOperation({ summary: 'Request password reset' })
    @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 password reset requests per minute
    async forgotPassword(@Body('email') email: string) {
        return this.authService.forgotPassword(email);
    }

    @Post('refresh')
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    @ApiResponse({ status: 200, description: 'Returns new access token' })
    @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
    @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 refresh attempts per minute
    async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
        return this.authService.refreshToken(refreshTokenDto.refreshToken);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout and revoke refresh token' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async logout(
        @Request() req: any,
        @Body('refreshToken') refreshToken?: string,
        @Headers('authorization') authHeader?: string
    ) {
        // Extract access token from Authorization header
        const accessToken = authHeader?.replace('Bearer ', '');
        return this.authService.logout(req.user.id, refreshToken, accessToken);
    }

    @Post('register-vendor')
    @ApiOperation({ summary: 'Register a new vendor' })
    @ApiResponse({ status: 201, description: 'Vendor registered successfully' })
    @ApiResponse({ status: 409, description: 'Vendor already exists' })
    async registerVendor(@Body() registerVendorDto: RegisterVendorDto) {
        return this.authService.registerVendor(registerVendorDto);
    }

    @Post('register-vendor-with-docs')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'panCard', maxCount: 1 },
        { name: 'gstCertificate', maxCount: 1 },
        { name: 'addressProof', maxCount: 1 },
        { name: 'bankProof', maxCount: 1 },
        { name: 'storePhoto', maxCount: 1 },
    ]))
    @ApiOperation({ summary: 'Register vendor with KYC documents' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 201, description: 'Vendor registered with documents' })
    @ApiResponse({ status: 400, description: 'Missing required documents' })
    @ApiResponse({ status: 409, description: 'Vendor already exists' })
    async registerVendorWithDocuments(
        @Body() registerDto: RegisterVendorWithDocsDto,
        @UploadedFiles() files: { [key: string]: Express.Multer.File[] }
    ) {
        return this.authService.registerVendorWithDocuments(registerDto, files);
    }

    @Post('vendor/create-payment-order')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create payment order for vendor registration' })
    @ApiResponse({ status: 200, description: 'Payment order created' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    async createVendorPaymentOrder(@GetUser('sub') vendorId: string) {
        return this.vendorOnboardingService.createRegistrationPaymentOrder(vendorId);
    }

    @Post('vendor/verify-payment')
    @ApiOperation({ summary: 'Verify vendor registration payment' })
    @ApiResponse({ status: 200, description: 'Payment verified and account activated' })
    @ApiResponse({ status: 400, description: 'Invalid payment signature' })
    async verifyVendorPayment(@Body() dto: VerifyRegistrationPaymentDto) {
        return this.vendorOnboardingService.verifyRegistrationPayment(
            dto.vendorId,
            dto.razorpayOrderId,
            dto.razorpayPaymentId,
            dto.razorpaySignature
        );
    }

    @Get('vendor/onboarding-status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get vendor onboarding status' })
    @ApiResponse({ status: 200, description: 'Onboarding status retrieved' })
    async getVendorOnboardingStatus(@GetUser('sub') vendorId: string) {
        return this.vendorOnboardingService.getOnboardingStatus(vendorId);
    }
}
