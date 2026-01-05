import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('otp-send')
    async sendOtp(@Body() sendOtpDto: SendOtpDto) {
        return this.authService.sendOtp(sendOtpDto.mobile);
    }

    @Post('otp-verify')
    async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
        return this.authService.verifyOtp(verifyOtpDto.mobile, verifyOtpDto.otp);
    }
}
