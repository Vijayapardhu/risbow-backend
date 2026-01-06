export declare class SendOtpDto {
    mobile: string;
}
export declare class VerifyOtpDto {
    mobile: string;
    otp: string;
}
export declare class RegisterDto {
    name: string;
    email: string;
    password: string;
    phone: string;
    address: {
        line1: string;
        line2: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };
    dateOfBirth: string;
    gender: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
