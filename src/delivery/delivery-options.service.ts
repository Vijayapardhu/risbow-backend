import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type DeliverySlot = { startAt: string; endAt: string };
export type DeliveryEligibility = { eligible: boolean; reason?: string };

@Injectable()
export class DeliveryOptionsService {
  constructor(private prisma: PrismaService) {}

  private haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s1 = Math.sin(dLat / 2);
    const s2 = Math.sin(dLng / 2);
    const q = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
    return 2 * R * Math.asin(Math.sqrt(q));
  }

  // Ray casting algorithm; polygon points in {lat,lng} or [lat,lng]
  private pointInPolygon(point: { lat: number; lng: number }, polygon: any): boolean {
    const pts: Array<{ lat: number; lng: number }> = Array.isArray(polygon)
      ? polygon
          .map((p: any) => {
            if (Array.isArray(p) && p.length >= 2) return { lat: Number(p[0]), lng: Number(p[1]) };
            if (p && p.lat != null && p.lng != null) return { lat: Number(p.lat), lng: Number(p.lng) };
            if (p && p.latitude != null && p.longitude != null) return { lat: Number(p.latitude), lng: Number(p.longitude) };
            return null;
          })
          .filter((p): p is { lat: number; lng: number } => p !== null)
      : [];
    if (pts.length < 3) return false;

    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].lng;
      const yi = pts[i].lat;
      const xj = pts[j].lng;
      const yj = pts[j].lat;

      const intersect =
        yi > point.lat !== yj > point.lat &&
        point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + 0.0) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  async checkEligibility(params: { vendorId: string; point: { lat: number; lng: number } }): Promise<DeliveryEligibility> {
    const areas = await this.prisma.vendorServiceArea.findMany({
      where: { vendorId: params.vendorId, isActive: true },
      take: 50,
    });
    if (!areas || areas.length === 0) return { eligible: false, reason: 'NO_SERVICE_AREA' };

    for (const a of areas as any[]) {
      const type = String(a.type || '').toUpperCase();
      if (type === 'RADIUS') {
        if (a.centerLat == null || a.centerLng == null || a.radiusKm == null) continue;
        const d = this.haversineKm(params.point, { lat: Number(a.centerLat), lng: Number(a.centerLng) });
        if (d <= Number(a.radiusKm)) return { eligible: true };
      } else if (type === 'POLYGON') {
        if (!a.polygon) continue;
        if (this.pointInPolygon(params.point, a.polygon)) return { eligible: true };
      } else {
        // Unknown type; ignore
      }
    }
    return { eligible: false, reason: 'OUT_OF_COVERAGE' };
  }

  private istOffsetMinutes(): number {
    return 330; // Asia/Kolkata fixed offset (+05:30)
  }

  private toIstDate(d: Date): Date {
    return new Date(d.getTime() + this.istOffsetMinutes() * 60 * 1000);
  }
  private fromIstDate(dIst: Date): Date {
    return new Date(dIst.getTime() - this.istOffsetMinutes() * 60 * 1000);
  }

  private parseHHMM(s: string): number | null {
    if (!/^\d{2}:\d{2}$/.test(s)) return null;
    const [hh, mm] = s.split(':').map((x) => Number(x));
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return hh * 60 + mm;
  }

  private rangesFromStoreTimings(timings: any, weekday: number): Array<{ startMinute: number; endMinute: number }> {
    if (!timings) return [];
    const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][weekday];
    const parseRange = (r: any) => {
      const start = (r?.start || r?.open || r?.from || '').toString();
      const end = (r?.end || r?.close || r?.to || '').toString();
      const sMin = this.parseHHMM(start);
      const eMin = this.parseHHMM(end);
      if (sMin == null || eMin == null) return null;
      return { startMinute: sMin, endMinute: eMin };
    };

    if (timings?.weekly && typeof timings.weekly === 'object') {
      const rangesRaw = timings.weekly[dayKey] || timings.weekly[dayKey.toUpperCase()] || [];
      const ranges = (Array.isArray(rangesRaw) ? rangesRaw : [rangesRaw]).map(parseRange).filter(Boolean) as Array<{
        startMinute: number;
        endMinute: number;
      }>;
      return ranges;
    }

    if (timings?.open || timings?.close) {
      const r = parseRange(timings);
      return r ? [r] : [];
    }

    return [];
  }

  async getAvailableSlots(params: { vendorId: string; now?: Date }): Promise<DeliverySlot[]> {
    const now = params.now || new Date();
    const vendor = await this.prisma.vendor.findUnique({ where: { id: params.vendorId }, select: { storeTimings: true } });
    const windows = await this.prisma.vendorDeliveryWindow.findMany({
      where: { vendorId: params.vendorId, isActive: true },
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
      take: 50,
    });

    const timezone = 'Asia/Kolkata';
    const istNow = this.toIstDate(now);
    const slots: DeliverySlot[] = [];

    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const dayIst = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));
      dayIst.setUTCDate(dayIst.getUTCDate() + dayOffset);

      const weekday = (this.toIstDate(new Date(this.fromIstDate(dayIst))).getDay() + 7) % 7;

      const dayWindows =
        windows.length > 0
          ? (windows as any[]).filter((w) => Number(w.weekday) === weekday).map((w) => ({ startMinute: Number(w.startMinute), endMinute: Number(w.endMinute) }))
          : this.rangesFromStoreTimings(vendor?.storeTimings, weekday);

      const effectiveWindows =
        dayWindows.length > 0 ? dayWindows : [{ startMinute: 9 * 60, endMinute: 21 * 60 }]; // safe default

      for (const w of effectiveWindows) {
        const startMin = Math.max(0, Math.min(24 * 60, w.startMinute));
        const endMin = Math.max(0, Math.min(24 * 60, w.endMinute));
        if (endMin <= startMin) continue;

        // create slots of 60 minutes
        for (let m = startMin; m + 60 <= endMin; m += 60) {
          const slotStartIst = new Date(dayIst.getTime() + m * 60 * 1000);
          const slotEndIst = new Date(dayIst.getTime() + (m + 60) * 60 * 1000);

          // skip past slots for today
          if (dayOffset === 0 && slotEndIst.getTime() <= istNow.getTime()) continue;

          const slotStartUtc = this.fromIstDate(slotStartIst);
          const slotEndUtc = this.fromIstDate(slotEndIst);

          slots.push({ startAt: slotStartUtc.toISOString(), endAt: slotEndUtc.toISOString() });
          if (slots.length >= 60) return slots;
        }
      }
    }

    return slots;
  }

  async getDeliveryOptions(params: { vendorId: string; point: { lat: number; lng: number } }): Promise<{
    eligible: boolean;
    reason?: string;
    timezone: string;
    availableSlots: DeliverySlot[];
  }> {
    const eligibility = await this.checkEligibility({ vendorId: params.vendorId, point: params.point });
    if (!eligibility.eligible) {
      return { eligible: false, reason: eligibility.reason, timezone: 'Asia/Kolkata', availableSlots: [] };
    }

    const availableSlots = await this.getAvailableSlots({ vendorId: params.vendorId });
    return { eligible: true, timezone: 'Asia/Kolkata', availableSlots };
  }
}

