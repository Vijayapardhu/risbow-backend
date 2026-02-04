import { Prisma } from '@prisma/client';

/**
 * Helper utilities for PlatformConfig operations
 * Handles category extraction, unique key building, and Json type handling
 */
export class PlatformConfigHelper {
  /**
   * Extract category from a dotted key
   * Examples:
   *   "general.siteName" → "general"
   *   "verification.requireKyc" → "verification"
   *   "MAINTENANCE_MODE" → "app" (fallback for uppercase keys)
   */
  static extractCategory(key: string): string {
    if (key.includes('.')) {
      return key.split('.')[0];
    }
    // Uppercase keys without dots get "app" category
    return 'app';
  }

  /**
   * Extract the key part without category prefix
   * Examples:
   *   "general.siteName" → "siteName"
   *   "verification.requireKyc" → "requireKyc"
   *   "MAINTENANCE_MODE" → "MAINTENANCE_MODE"
   */
  static extractKey(fullKey: string): string {
    if (fullKey.includes('.')) {
      return fullKey.split('.').slice(1).join('.');
    }
    return fullKey;
  }

  /**
   * Build the proper where clause for Prisma unique constraint
   */
  static buildWhereUnique(
    category: string,
    key: string,
  ): Prisma.PlatformConfigWhereUniqueInput {
    return {
      category_key: {
        category,
        key,
      },
    };
  }

  /**
   * Build where clause from a full dotted key
   */
  static buildWhereUniqueFromFullKey(
    fullKey: string,
  ): Prisma.PlatformConfigWhereUniqueInput {
    const category = this.extractCategory(fullKey);
    const key = this.extractKey(fullKey);
    return this.buildWhereUnique(category, key);
  }

  /**
   * Parse Json value safely
   */
  static parseJsonValue(value: Prisma.JsonValue): any {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  /**
   * Serialize a value to Json type
   */
  static serializeValue(value: any): Prisma.JsonValue {
    if (typeof value === 'object' && value !== null) {
      return value as Prisma.JsonValue;
    }
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  /**
   * Build upsert args for PlatformConfig
   */
  static buildUpsertArgs(
    fullKey: string,
    value: any,
    updatedById: string,
    description?: string,
  ): Prisma.PlatformConfigUpsertArgs {
    const category = this.extractCategory(fullKey);
    const key = this.extractKey(fullKey);
    const serializedValue = this.serializeValue(value);

    return {
      where: this.buildWhereUnique(category, key),
      update: {
        value: serializedValue,
        updatedById,
      },
      create: {
        category,
        key,
        value: serializedValue,
        updatedById,
        description: description || `${category} setting: ${key}`,
      },
    };
  }
}
