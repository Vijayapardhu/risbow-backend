import { SetMetadata } from '@nestjs/common';

export const REQUIRE_MFA_KEY = 'require_mfa';

/**
 * Decorator to require MFA to be enabled for accessing a route.
 * Used for sensitive operations like bulk deletes, payment actions, etc.
 * 
 * Usage:
 * @RequireMfa()
 */
export const RequireMfa = () => SetMetadata(REQUIRE_MFA_KEY, true);
