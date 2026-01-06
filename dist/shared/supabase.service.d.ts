import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService {
    private supabase;
    constructor();
    createAuthUser(email: string, password: string): Promise<import("@supabase/supabase-js").AuthUser>;
    deleteAuthUser(userId: string): Promise<void>;
    getClient(): SupabaseClient<any, "public", "public", any, any>;
}
