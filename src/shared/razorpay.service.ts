import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// Razorpay SDK types (minimal implementation to avoid dependency)
interface RazorpayOrderOptions {
    amount: number; // in paise
    currency: string;
    receipt: string;
    notes?: Record<string, any>;
}

interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
    created_at: number;
}

@Injectable()
export class RazorpayService {
    private readonly keyId: string;
    private readonly keySecret: string;
    private readonly registrationFee = 50000; // ₹500 in paise

    constructor(private readonly configService: ConfigService) {
        this.keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
        this.keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

        if (!this.keyId || !this.keySecret) {
            throw new Error('Razorpay credentials not configured');
        }
    }

    /**
     * Create payment order for vendor registration
     */
    async createRegistrationOrder(vendorId: string, vendorName: string): Promise<RazorpayOrder> {
        try {
            const orderOptions: RazorpayOrderOptions = {
                amount: this.registrationFee,
                currency: 'INR',
                receipt: `vendor_reg_${vendorId}_${Date.now()}`,
                notes: {
                    vendorId,
                    vendorName,
                    purpose: 'vendor_registration',
                }
            };

            // Make HTTP request to Razorpay API
            const response = await fetch('https://api.razorpay.com/v1/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`
                },
                body: JSON.stringify(orderOptions)
            });

            if (!response.ok) {
                const errorData = await response.json() as any;
                throw new Error(`Razorpay API error: ${errorData.error?.description || 'Unknown error'}`);
            }

            const order = await response.json() as RazorpayOrder;
            return order;
        } catch (error) {
            console.error('Error creating Razorpay order:', error);
            throw new InternalServerErrorException('Failed to create payment order');
        }
    }

    /**
     * Verify payment signature
     */
    verifyPaymentSignature(
        razorpayOrderId: string,
        razorpayPaymentId: string,
        razorpaySignature: string
    ): boolean {
        try {
            const body = `${razorpayOrderId}|${razorpayPaymentId}`;
            const expectedSignature = crypto
                .createHmac('sha256', this.keySecret)
                .update(body)
                .digest('hex');

            return expectedSignature === razorpaySignature;
        } catch (error) {
            console.error('Error verifying payment signature:', error);
            return false;
        }
    }

    /**
     * Fetch payment details from Razorpay
     */
    async getPaymentDetails(paymentId: string): Promise<any> {
        try {
            const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch payment details');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching payment details:', error);
            throw new InternalServerErrorException('Failed to fetch payment details');
        }
    }

    /**
     * Get registration fee amount
     */
    getRegistrationFee(): number {
        return this.registrationFee;
    }

    /**
     * Get Razorpay key ID (for frontend)
     */
    getKeyId(): string {
        return this.keyId;
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
        try {
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            return expectedSignature === signature;
        } catch (error) {
            console.error('Error verifying webhook signature:', error);
            return false;
        }
    }
}
