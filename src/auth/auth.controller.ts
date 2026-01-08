import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto, RegisterDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('otp-send')
    @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 OTP requests per minute
    async sendOtp(@Body() sendOtpDto: SendOtpDto) {
        return this.authService.sendOtp(sendOtpDto.mobile);
    }

    @Post('otp-verify')
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 verification attempts per minute
    async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
        return this.authService.verifyOtp(verifyOtpDto.mobile, verifyOtpDto.otp);
    }

    @Post('register')
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 registration attempts per minute
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.registerWithEmail(registerDto);
    }

    @Post('login')
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
    async login(@Body() loginDto: LoginDto) {
        return this.authService.loginWithEmail(loginDto.email, loginDto.password);
    }

    @Post('forgot-password')
    @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 password reset requests per minute
    async forgotPassword(@Body('email') email: string) {
        return this.authService.forgotPassword(email);
    }
}
