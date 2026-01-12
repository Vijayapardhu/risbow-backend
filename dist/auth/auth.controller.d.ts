import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto, RegisterDto, LoginDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    sendOtp(sendOtpDto: SendOtpDto): Promise<{
        message: string;
    }>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<any>;
    register(registerDto: RegisterDto): Promise<{
        access_token: string;
        user: any;
    }>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: any;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
}
