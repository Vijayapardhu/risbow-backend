import { PaymentsService } from './payments.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    createPaymentOrder(req: any, dto: CreatePaymentOrderDto): Promise<{
        key: string;
        orderId: any;
        amount: any;
        currency: any;
        internalOrderId: string;
    }>;
    verifyPayment(req: any, dto: VerifyPaymentDto): Promise<{
        status: string;
        paymentId: string;
        message: string;
        transactionId?: undefined;
    } | {
        status: string;
        paymentId: string;
        transactionId: string;
        message?: undefined;
    }>;
    handleWebhook(signature: string, req: any): Promise<{
        status: string;
        message: string;
    } | {
        status: string;
        message?: undefined;
    }>;
}
