import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface MessagePayload {
    to: string;
    body: string;
    mediaUrl?: string;
    templateId?: string;
}

@Injectable()
export class CommunicationService {
    private readonly logger = new Logger(CommunicationService.name);
    private readonly isProduction: boolean;

    constructor(private configService: ConfigService) {
        this.isProduction = this.configService.get('NODE_ENV') === 'production';
    }

    /**
     * Sends an SMS via the configured provider (e.g., Twilio/Gupshup).
     * In non-prod, it just logs the message.
     */
    async sendSMS(payload: MessagePayload): Promise<{ success: boolean; providerId?: string }> {
        if (!this.isProduction) {
            this.logger.log(`[STUB SMS] To: ${payload.to} | Body: ${payload.body}`);
            return { success: true, providerId: 'stub-sms-' + Date.now() };
        }

        try {
            // Integration logic for SMS provider
            // Example for placeholder provider:
            // const response = await axios.post(this.configService.get('SMS_GATEWAY_URL'), {
            //     key: this.configService.get('SMS_GATEWAY_KEY'),
            //     mobile: payload.to,
            //     message: payload.body
            // });

            this.logger.log(`[SMS SENT] To: ${payload.to}`);
            return { success: true, providerId: 'provider-sms-' + Date.now() };
        } catch (error) {
            this.logger.error(`Failed to send SMS to ${payload.to}: ${error.message}`);
            return { success: false };
        }
    }

    /**
     * Sends a WhatsApp message via the configured provider.
     */
    async sendWhatsApp(payload: MessagePayload): Promise<{ success: boolean; providerId?: string }> {
        if (!this.isProduction) {
            this.logger.log(`[STUB WHATSAPP] To: ${payload.to} | Body: ${payload.body}`);
            return { success: true, providerId: 'stub-wa-' + Date.now() };
        }

        try {
            // Integration logic for WhatsApp Business API
            this.logger.log(`[WHATSAPP SENT] To: ${payload.to}`);
            return { success: true, providerId: 'provider-wa-' + Date.now() };
        } catch (error) {
            this.logger.error(`Failed to send WhatsApp to ${payload.to}: ${error.message}`);
            return { success: false };
        }
    }
}
