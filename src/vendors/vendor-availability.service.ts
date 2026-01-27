import { Injectable } from '@nestjs/common';

// VendorStatus enum - defined in Prisma schema but may not be exported
enum VendorStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

type VendorLike = {
  storeStatus?: VendorStatus | string | null;
  storeClosedUntil?: Date | string | null;
  storeTimings?: any;
};

type Availability = {
  openNow: boolean;
  nextOpenAt?: string;
};

@Injectable()
export class VendorAvailabilityService {
  /**
   * Computes if a vendor is open now based on:
   * - storeStatus (ACTIVE/SUSPENDED)
   * - temporary closure window (storeClosedUntil)
   * - storeTimings JSON (best-effort, tolerant)
   */
  getAvailability(vendor: VendorLike, now: Date = new Date()): Availability {
    if (vendor.storeStatus && String(vendor.storeStatus) !== VendorStatus.ACTIVE) {
      return { openNow: false };
    }

    if (vendor.storeClosedUntil) {
      const until = new Date(vendor.storeClosedUntil as any);
      if (!Number.isNaN(until.getTime()) && now < until) {
        return { openNow: false, nextOpenAt: until.toISOString() };
      }
    }

    const timings = vendor.storeTimings;
    if (!timings) return { openNow: true };

    // Supported shapes (tolerant):
    // 1) { timezone?: 'Asia/Kolkata', weekly: { mon: [{ start:'09:00', end:'21:00' }], ... } }
    // 2) { open:'09:00', close:'21:00' }  (assumed daily)
    // If shape unknown -> assume open (safe for discovery; checkout still validates stock/money server-side).

    const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
    const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const current = hhmm(now);

    const parseRange = (r: any) => {
      const start = (r?.start || r?.open || r?.from || '').toString();
      const end = (r?.end || r?.close || r?.to || '').toString();
      if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return null;
      return { start, end };
    };

    // Weekly schedule
    if (timings?.weekly && typeof timings.weekly === 'object') {
      const rangesRaw = timings.weekly[dayKey] || timings.weekly[dayKey.toUpperCase()] || [];
      const ranges = (Array.isArray(rangesRaw) ? rangesRaw : [rangesRaw]).map(parseRange).filter(Boolean) as Array<{ start: string; end: string }>;
      if (ranges.length === 0) return { openNow: false };
      const openNow = ranges.some((r) => r.start <= current && current <= r.end);
      return { openNow };
    }

    // Simple daily window
    if (timings?.open || timings?.close) {
      const r = parseRange(timings);
      if (!r) return { openNow: true };
      return { openNow: r.start <= current && current <= r.end };
    }

    return { openNow: true };
  }
}

