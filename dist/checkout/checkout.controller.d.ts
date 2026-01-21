import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
import { GiftsService } from '../gifts/gifts.service';
import { CouponsService } from '../coupons/coupons.service';
import { SelectGiftDto } from '../gifts/dto/gift.dto';
import { ApplyCouponDto } from '../coupons/dto/coupon.dto';
export declare class CheckoutController {
    private readonly checkoutService;
    private readonly giftsService;
    private readonly couponsService;
    constructor(checkoutService: CheckoutService, giftsService: GiftsService, couponsService: CouponsService);
    checkout(req: any, dto: CheckoutDto): Promise<{
        message: string;
        id: string;
        orderId: string;
        status: string;
        paymentMode: string;
        totalAmount: number;
        discountAmount: number;
        giftId: string;
        couponCode: string;
        razorpayOrderId?: undefined;
        amount?: undefined;
        currency?: undefined;
        key?: undefined;
    } | {
        message: string;
        id: string;
        orderId: string;
        status: string;
        paymentMode: string;
        razorpayOrderId: string;
        amount: string | number;
        currency: string;
        key: string;
        totalAmount: number;
        discountAmount: number;
        giftId: string;
        couponCode: string;
    }>;
    selectGift(req: any, dto: SelectGiftDto): Promise<{
        message: string;
        giftId: string;
    }>;
    applyCoupon(req: any, dto: ApplyCouponDto): Promise<{
        isValid: boolean;
        message: string;
        discountAmount?: number;
        finalAmount?: number;
        coupon?: import("../coupons/dto/coupon.dto").CouponResponseDto;
    }>;
    removeCoupon(req: any): Promise<{
        message: string;
    }>;
}
