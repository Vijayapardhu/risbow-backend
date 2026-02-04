import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from './redis.service';
import axios from 'axios';

export type GeoPoint = { lat: number; lng: number };
export type GeoResolveResult = { point: GeoPoint; source: 'PINCODE_DB' | 'NOMINATIM' | 'MANUAL' };

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  constructor(private prisma: PrismaService, private redis: RedisService) {}

  /**
   * Best-effort geocoding for Indian addresses.
   * - Prefer pincode centroid DB (`PincodeGeo`)
   * - Fallback: Nominatim (rate-limited) with aggressive caching
   * Returns null on failure (callers must degrade gracefully).
   */
  async resolveAddressGeo(params: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  }): Promise<GeoResolveResult | null> {
    const pincode = (params.pincode || '').trim();
    if (!pincode) return null;

    const cacheKey = `geo:pincode:${pincode}`;
    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.lat && parsed?.lng && parsed?.source) {
          return { point: { lat: Number(parsed.lat), lng: Number(parsed.lng) }, source: parsed.source };
        }
      } catch {
        // ignore
      }
    }

    // 1) Pincode centroid DB
    const fromDb = await this.prisma.pincodeGeo
      .findUnique({ where: { pincode } })
      .catch(() => null);
    if (fromDb?.latitude != null && fromDb?.longitude != null) {
      const out: GeoResolveResult = {
        point: { lat: Number(fromDb.latitude), lng: Number(fromDb.longitude) },
        source: (fromDb.source as any) || 'PINCODE_DB',
      };
      await this.redis.set(cacheKey, JSON.stringify({ lat: out.point.lat, lng: out.point.lng, source: out.source }), 60 * 60 * 24 * 30).catch(() => undefined);
      return out;
    }

    // 2) Nominatim fallback (free, but rate-limited)
    const q = [
      params.addressLine1,
      params.addressLine2,
      params.city,
      params.state,
      pincode,
      'India',
    ]
      .filter(Boolean)
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0)
      .join(', ');

    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q, format: 'json', limit: 1, countrycodes: 'in' },
        timeout: 8000,
        headers: {
          // Nominatim requires a valid UA
          'User-Agent': 'risbow-backend/1.0 (geo; contact=admin@risbow.local)',
        },
      });

      const first = Array.isArray(res.data) ? res.data[0] : null;
      const lat = first?.lat != null ? Number(first.lat) : null;
      const lng = first?.lon != null ? Number(first.lon) : null;
      if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null;

      // Upsert into DB as a lightweight centroid cache (so we don't repeatedly call Nominatim)
      await this.prisma.pincodeGeo
        .upsert({
          where: { pincode },
          update: { latitude: lat, longitude: lng, source: 'NOMINATIM' as any },
          create: { pincode, latitude: lat, longitude: lng, source: 'NOMINATIM' as any, updatedAt: new Date() },
        })
        .catch(() => undefined);

      const out: GeoResolveResult = { point: { lat, lng }, source: 'NOMINATIM' };
      await this.redis
        .set(cacheKey, JSON.stringify({ lat, lng, source: out.source }), 60 * 60 * 24 * 30)
        .catch(() => undefined);
      return out;
    } catch (e: any) {
      this.logger.warn(`Nominatim geocode failed for pincode ${pincode}: ${e?.message || e}`);
      return null;
    }
  }
}

