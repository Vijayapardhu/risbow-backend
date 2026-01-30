import { Controller, Post, Body, UseGuards, Request, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto, RegisterDto, LoginDto } from './dto/auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

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
}
