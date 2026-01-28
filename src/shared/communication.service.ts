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
     * Sends an SMS via Twilio or MSG91
     * Supports both providers based on configuration
     */
    async sendSMS(payload: MessagePayload): Promise<{ success: boolean; providerId?: string }> {
        // Try Twilio first, then MSG91
        const twilioAccountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
        const twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
        const twilioPhoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

        const msg91ApiKey = this.configService.get<string>('MSG91_API_KEY');
        const msg91SenderId = this.configService.get<string>('MSG91_SENDER_ID');

        if (!this.isProduction && !twilioAccountSid && !msg91ApiKey) {
            this.logger.log(`[STUB SMS] To: ${payload.to} | Body: ${payload.body}`);
            return { success: true, providerId: 'stub-sms-' + Date.now() };
        }

        // Try Twilio first
        if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
            try {
                const response = await axios.post(
                    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
                    new URLSearchParams({
                        From: twilioPhoneNumber,
                        To: payload.to,
                        Body: payload.body,
                    }),
                    {
                        auth: {
                            username: twilioAccountSid,
                            password: twilioAuthToken,
                        },
                        timeout: 10000,
                    },
                );

                this.logger.log(`[SMS SENT via Twilio] To: ${payload.to}, SID: ${response.data.sid}`);
                return { success: true, providerId: response.data.sid };
            } catch (error: any) {
                this.logger.error(`Twilio SMS failed: ${error.message}`);
                // Fall through to MSG91
            }
        }

        // Try MSG91 as fallback
        if (msg91ApiKey && msg91SenderId) {
            try {
                const response = await axios.post(
                    'https://api.msg91.com/api/v2/sendsms',
                    {
                        sender: msg91SenderId,
                        route: '4', // Transactional route
                        country: '91', // India
                        sms: [
                            {
                                message: payload.body,
                                to: [payload.to.replace(/^\+91/, '').replace(/^91/, '')], // Remove country code prefix
                            },
                        ],
                    },
                    {
                        headers: {
                            authkey: msg91ApiKey,
                            'Content-Type': 'application/json',
                        },
                        timeout: 10000,
                    },
                );

                this.logger.log(`[SMS SENT via MSG91] To: ${payload.to}, RequestId: ${response.data.request_id}`);
                return { success: true, providerId: response.data.request_id };
            } catch (error: any) {
                this.logger.error(`MSG91 SMS failed: ${error.message}`);
                return { success: false };
            }
        }

        this.logger.warn(`[SMS NOT CONFIGURED] No SMS provider configured. To: ${payload.to}`);
        return { success: false };
    }

    /**
     * Sends a WhatsApp message via Twilio WhatsApp API
     */
    async sendWhatsApp(payload: MessagePayload): Promise<{ success: boolean; providerId?: string }> {
        const twilioAccountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
        const twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
        const twilioWhatsAppNumber = this.configService.get<string>('TWILIO_WHATSAPP_NUMBER') || `whatsapp:${this.configService.get<string>('TWILIO_PHONE_NUMBER')}`;

        if (!this.isProduction && !twilioAccountSid) {
            this.logger.log(`[STUB WHATSAPP] To: ${payload.to} | Body: ${payload.body}`);
            return { success: true, providerId: 'stub-wa-' + Date.now() };
        }

        if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
            this.logger.warn(`[WHATSAPP NOT CONFIGURED] Twilio credentials missing. To: ${payload.to}`);
            return { success: false };
        }

        try {
            const toNumber = payload.to.startsWith('whatsapp:') ? payload.to : `whatsapp:${payload.to}`;
            const response = await axios.post(
                `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
                new URLSearchParams({
                    From: twilioWhatsAppNumber,
                    To: toNumber,
                    Body: payload.body,
                }),
                {
                    auth: {
                        username: twilioAccountSid,
                        password: twilioAuthToken,
                    },
                    timeout: 10000,
                },
            );

            this.logger.log(`[WHATSAPP SENT via Twilio] To: ${payload.to}, SID: ${response.data.sid}`);
            return { success: true, providerId: response.data.sid };
        } catch (error: any) {
            this.logger.error(`Failed to send WhatsApp to ${payload.to}: ${error.message}`);
            return { success: false };
        }
    }
}
