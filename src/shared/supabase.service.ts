import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
    private supabase?: SupabaseClient;
    private isEnabled = false;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!supabaseUrl || !supabaseKey) {
            console.warn('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set. Supabase Auth integration disabled.');
            return;
        }

        this.supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        this.isEnabled = true;
    }

    async createAuthUser(email: string, password: string) {
        if (!this.isEnabled || !this.supabase) {
            throw new Error('Supabase is not configured');
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
            throw new Error('Supabase is not configured');
        }

        const { error } = await this.supabase.auth.admin.deleteUser(userId);

        if (error) {
            throw new Error(`Supabase Auth Error: ${error.message}`);
        }
    }

    getClient() {
        return this.supabase;
    }
}
