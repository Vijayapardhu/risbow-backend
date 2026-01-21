import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto, CouponResponseDto, CouponValidationResponseDto } from './dto/coupon.dto';
export declare class CouponsController {
    private readonly couponsService;
    constructor(couponsService: CouponsService);
    validateCoupon(dto: ValidateCouponDto): Promise<CouponValidationResponseDto>;
    getActiveCoupons(): Promise<CouponResponseDto[]>;
    getAllCoupons(): Promise<CouponResponseDto[]>;
    getCouponById(id: string): Promise<CouponResponseDto>;
    createCoupon(dto: CreateCouponDto): Promise<CouponResponseDto>;
    updateCoupon(id: string, dto: UpdateCouponDto): Promise<CouponResponseDto>;
    deleteCoupon(id: string): Promise<void>;
}
