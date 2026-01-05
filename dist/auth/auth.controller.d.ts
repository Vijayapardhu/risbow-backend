import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    sendOtp(sendOtpDto: SendOtpDto): Promise<{
        message: string;
    }>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{
        access_token: string;
        user: {
            id: string;
            mobile: string;
            email: string | null;
            referralCode: string;
            name: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            coinsBalance: number;
            referredBy: string | null;
            gender: string | null;
            size: string | null;
            footwearSize: number | null;
            stylePrefs: string | null;
            colors: string | null;
            createdAt: Date;
        };
    }>;
}
