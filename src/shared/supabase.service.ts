import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
    private readonly logger = new Logger(SupabaseService.name);
    private supabase: SupabaseClient | null = null;
    private isEnabled: boolean = false;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!supabaseUrl || !supabaseKey) {
            this.logger.warn('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set. Supabase Auth integration disabled.');
            this.isEnabled = false;
            return;
        }

        try {
            this.supabase = createClient(supabaseUrl, supabaseKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
            this.isEnabled = true;
            this.logger.log('✅ Supabase Auth client initialized');
        } catch (error) {
            this.logger.error(`Failed to initialize Supabase client: ${error.message}`);
            this.isEnabled = false;
        }
    }

    async createAuthUser(email: string, password: string) {
        if (!this.isEnabled || !this.supabase) {
            throw new Error('Supabase Auth is not enabled. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
        }

        const { data, error } = await this.supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
        });

        if (error) {
            throw new Error(`Supabase Auth Error: ${error.message}`);
        }

        return data.user;
    }

    async deleteAuthUser(userId: string) {
        if (!this.isEnabled || !this.supabase) {
            throw new Error('Supabase Auth is not enabled. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
        }

        const { error } = await this.supabase.auth.admin.deleteUser(userId);

        if (error) {
            throw new Error(`Supabase Auth Error: ${error.message}`);
        }
    }

    getClient(): SupabaseClient | null {
        return this.supabase;
    }

    isAuthEnabled(): boolean {
        return this.isEnabled;
    }
}
