import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { DeliveryOptionsService } from '../delivery/delivery-options.service';
import { VendorAvailabilityService } from '../vendors/vendor-availability.service';
import { UserProductEventType } from '@prisma/client';
import { EcommerceEventsService } from './ecommerce-events.service';

export type SuggestionContext = 'HOME' | 'PDP_SIMILAR' | 'CART' | 'SEARCH_DROPDOWN';

export type SuggestionRequest = {
  limit?: number;
  location?: { lat: number; lng: number; pincode?: string };
  region?: string;
};

export type SuggestedProduct = {
  productId: string;
  title: string;
  price: number; // paise (effective)
  offerPrice?: number | null;
  images: string[];
  vendorId: string;
  categoryId: string;
  score: number;
  reasons: string[];
};

@Injectable()
export class ProductSuggestionsService {
  private readonly logger = new Logger(ProductSuggestionsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private delivery: DeliveryOptionsService,
    private availability: VendorAvailabilityService,
    private events: EcommerceEventsService,
  ) {}

  private bucketKey(location?: { lat: number; lng: number; pincode?: string }, region?: string): string {
    if (location && Number.isFinite(location.lat) && Number.isFinite(location.lng)) {
      return `geo:${Number(location.lat.toFixed(1))}:${Number(location.lng.toFixed(1))}`;
    }
    const pin = (location?.pincode || '').trim();
    if (/^\d{6}$/.test(pin)) return `pin:${pin}`;
    if (region && region.length <= 32) return region.toLowerCase();
    return 'global';
  }

  private effectivePrice(p: { price: number; offerPrice?: number | null }): number {
    return (p.offerPrice ?? null) ? (p.offerPrice as number) : p.price;
  }

  private async isVendorDeliverableCached(vendorId: string, location: { lat: number; lng: number }): Promise<boolean> {
    const key = `delivery:elig:v1:${vendorId}:${Number(location.lat.toFixed(2))}:${Number(location.lng.toFixed(2))}`;
    let cached: string | null = null;
    try {
      cached = await this.redis.get(key);
    } catch {
      cached = null;
    }
    if (cached === '1') return true;
    if (cached === '0') return false;

    const res = await this.delivery.checkEligibility({ vendorId, point: { lat: location.lat, lng: location.lng } });
    const ok = !!res.eligible;
    try {
      await this.redis.set(key, ok ? '1' : '0', 60 * 10); // 10m
    } catch {
      // best-effort cache
    }
    return ok;
  }

  private async filterAndHydrateProductIds(params: {
    productIds: string[];
    location?: { lat: number; lng: number; pincode?: string };
    excludeProductIds?: Set<string>;
    limit: number;
  }): Promise<Array<{ p: any; deliverable: boolean; openNow: boolean }>> {
    const ids = Array.from(new Set(params.productIds)).filter(Boolean);
    const exclude = params.excludeProductIds || new Set<string>();

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: ids.filter((id) => !exclude.has(id)) },
        isActive: true,
        stock: { gt: 0 },
      },
      select: {
        id: true,
        title: true,
        price: true,
        offerPrice: true,
        images: true,
        vendorId: true,
        categoryId: true,
        brandName: true,
        tags: true,
        popularityScore: true,
        createdAt: true,
        vendor: { select: { storeStatus: true, storeClosedUntil: true, storeTimings: true } },
      } as any,
      take: Math.min(200, params.limit * 6),
    });

    const location = params.location;
    const vendorIds = Array.from(new Set(products.map((p: any) => p.vendorId)));
    const deliverableByVendor = new Map<string, boolean>();

    if (location) {
      await Promise.all(
        vendorIds.map(async (vId) => {
          const ok = await this.isVendorDeliverableCached(vId, { lat: location.lat, lng: location.lng });
          deliverableByVendor.set(vId, ok);
        }),
      );
    }

    return products.map((p: any) => {
      const deliverable = location ? !!deliverableByVendor.get(p.vendorId) : true;
      const { openNow } = this.availability.getAvailability(p.vendor);
      return { p, deliverable, openNow };
    });
  }

  private scoreProduct(params: {
    context: SuggestionContext;
    baseReasons: string[];
    p: any;
    openNow: boolean;
    deliverable: boolean;
    seed?: { categoryId?: string; brandName?: string; tags?: string[]; price?: number };
  }): { score: number; reasons: string[] } {
    const reasons = new Set<string>(params.baseReasons || []);
    const p = params.p;
    let score = 0;

    // Hard filters handled outside; here we rank.
    // Popularity + freshness
    score += Math.min(40, Math.round(Number(p.popularityScore || 0) / 5));
    const daysOld = Math.max(0, (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    score += Math.max(0, 10 - Math.round(daysOld / 7)); // new-ish boost (up to ~10)

    // Discount boost
    if (p.offerPrice != null && p.offerPrice < p.price) {
      score += Math.min(15, Math.round((p.price - p.offerPrice) / 5000)); // +1 per ₹50
      reasons.add('discounted');
    }

    // Location-aware boosts/penalties
    if (params.deliverable) {
      score += 15;
      reasons.add('deliverable');
    } else {
      score -= 100; // effectively drop if location provided but not deliverable
      reasons.add('not_deliverable');
    }

    if (params.openNow) {
      score += 5;
      reasons.add('store_open');
    } else {
      score -= 5;
    }

    // Context-specific similarity
    const seed = params.seed;
    if (seed?.categoryId && p.categoryId === seed.categoryId) {
      score += 20;
      reasons.add('same_category');
    }
    if (seed?.brandName && p.brandName && p.brandName === seed.brandName) {
      score += 10;
      reasons.add('same_brand');
    }
    if (seed?.tags?.length && Array.isArray(p.tags)) {
      const s = new Set(seed.tags.map(String));
      const overlap = p.tags.filter((t: any) => s.has(String(t))).length;
      if (overlap > 0) {
        score += Math.min(15, overlap * 5);
        reasons.add('similar_tags');
      }
    }
    if (seed?.price != null) {
      const price = this.effectivePrice(p);
      const delta = Math.abs(price - seed.price);
      if (delta <= 5000) score += 5; // within ₹50
      else if (delta <= 20000) score += 2;
    }

    // Base reasons weight
    if (reasons.has('trending')) score += 15;
    if (reasons.has('based_on_viewed')) score += 25;
    if (reasons.has('based_on_purchased')) score += 10;
    if (reasons.has('co_purchased')) score += 20;

    return { score, reasons: Array.from(reasons) };
  }

  private async getCoPurchasedProductIds(seedProductId: string, limit: number): Promise<string[]> {
    const cacheKey = `reco:fbt:v2:${seedProductId}:${limit}`;
    let cached: string | null = null;
    try {
      cached = await this.redis.get(cacheKey);
    } catch {
      cached = null;
    }
    if (cached) return JSON.parse(cached);

    let seedEvents: any[] = [];
    try {
      seedEvents = await (this.prisma as any).userProductEvent.findMany({
        where: { type: UserProductEventType.PURCHASE, productId: seedProductId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { metadata: true },
      });
    } catch {
      seedEvents = [];
    }
    if (!Array.isArray(seedEvents)) seedEvents = [];

    const orderIds = Array.from(
      new Set(
        seedEvents
          .map((e: any) => e?.metadata?.orderId)
          .filter((x: any) => typeof x === 'string' && x.length > 0),
      ),
    ).slice(0, 30);

    if (orderIds.length === 0) {
      try {
        await this.redis.set(cacheKey, JSON.stringify([]), 60 * 30);
      } catch {
        // ignore
      }
      return [];
    }

    const or = orderIds.map((id) => ({ metadata: { path: ['orderId'], equals: id } }));
    let related: any[] = [];
    try {
      related = await (this.prisma as any).userProductEvent.findMany({
        where: {
          type: UserProductEventType.PURCHASE,
          OR: or,
        } as any,
        take: 2000,
        select: { productId: true },
      });
    } catch {
      related = [];
    }
    if (!Array.isArray(related)) related = [];

    const counts = new Map<string, number>();
    for (const r of related as any[]) {
      const pid = String(r.productId);
      if (!pid || pid === seedProductId) continue;
      counts.set(pid, (counts.get(pid) || 0) + 1);
    }

    const top = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([pid]) => pid);

    try {
      await this.redis.set(cacheKey, JSON.stringify(top), 60 * 60 * 6); // 6h
    } catch {
      // ignore
    }
    return top;
  }

  async suggestHome(userId: string, req: SuggestionRequest = {}): Promise<SuggestedProduct[]> {
    const limit = Math.max(1, Math.min(50, req.limit ?? 10));
    const bucket = this.bucketKey(req.location, req.region);
    const cacheKey = `reco:home:v2:${userId}:${bucket}:${limit}`;
    let cached: string | null = null;
    try {
      cached = await this.redis.get(cacheKey);
    } catch {
      cached = null;
    }
    if (cached) return JSON.parse(cached);

    // Candidates: trending + viewed + cart categories + preference profile
    const [cart, profile, trendingIds, recentViews] = await Promise.all([
      this.prisma.cart.findUnique({
        where: { userId },
        include: { CartItem: { include: { Product: { select: { id: true, categoryId: true, vendorId: true } } } } },
      }),
      (async () => {
        try {
          return await (this.prisma as any).userPreferenceProfile.findUnique({ where: { userId } });
        } catch {
          return null;
        }
      })(),
      this.events.getTrending(UserProductEventType.PRODUCT_VIEW, 50),
      (async () => {
        try {
          return await (this.prisma as any).userProductEvent.findMany({
            where: { userId, type: UserProductEventType.PRODUCT_VIEW },
            orderBy: { createdAt: 'desc' },
            take: 40,
            select: { productId: true },
          });
        } catch {
          return [];
        }
      })(),
    ]);

    const cartProductIds = new Set<string>((cart?.items || []).map((i: any) => String(i.productId)));
    const seedCategoryIds: string[] = Array.from(
      new Set([
        ...(Array.isArray(profile?.preferredCategories) ? profile.preferredCategories : []),
        ...((cart?.items || []).map((i: any) => i.product?.categoryId).filter(Boolean) as string[]),
      ]),
    ).slice(0, 8);

    const viewedIds = Array.from(new Set((recentViews as any[]).map((e) => String(e.productId)))).filter((id) => !cartProductIds.has(id));

    const categoryCandidates = seedCategoryIds.length
      ? await this.prisma.product.findMany({
          where: { isActive: true, stock: { gt: 0 }, categoryId: { in: seedCategoryIds } },
          select: { id: true },
          take: 120,
        })
      : [];

    const candidates: Array<{ id: string; reasons: string[] }> = [];
    for (const id of viewedIds.slice(0, 40)) candidates.push({ id, reasons: ['based_on_viewed'] });
    for (const id of trendingIds.slice(0, 50)) candidates.push({ id, reasons: ['trending'] });
    for (const p of categoryCandidates) candidates.push({ id: p.id, reasons: ['category_affinity'] });

    const byId = new Map<string, Set<string>>();
    for (const c of candidates) {
      if (!c.id || cartProductIds.has(c.id)) continue;
      const s = byId.get(c.id) || new Set<string>();
      c.reasons.forEach((r) => s.add(r));
      byId.set(c.id, s);
    }

    const hydrated = await this.filterAndHydrateProductIds({
      productIds: Array.from(byId.keys()),
      location: req.location,
      excludeProductIds: cartProductIds,
      limit,
    });

    const scored = hydrated
      .map(({ p, deliverable, openNow }) => {
        const baseReasons = Array.from(byId.get(p.id) || []);
        const { score, reasons } = this.scoreProduct({ context: 'HOME', baseReasons, p, deliverable, openNow });
        return {
          productId: p.id,
          title: p.title,
          price: this.effectivePrice(p),
          offerPrice: p.offerPrice,
          images: p.images || [],
          vendorId: p.vendorId,
          categoryId: p.categoryId,
          score,
          reasons,
        } as SuggestedProduct;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    try {
      await this.redis.set(cacheKey, JSON.stringify(scored), 60); // 60s
    } catch {
      // ignore
    }
    return scored;
  }

  async suggestSimilar(productId: string, req: SuggestionRequest = {}): Promise<SuggestedProduct[]> {
    const limit = Math.max(1, Math.min(50, req.limit ?? 10));
    const bucket = this.bucketKey(req.location, req.region);
    const cacheKey = `reco:similar:v2:${productId}:${bucket}:${limit}`;
    let cached: string | null = null;
    try {
      cached = await this.redis.get(cacheKey);
    } catch {
      cached = null;
    }
    if (cached) return JSON.parse(cached);

    const seed = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, categoryId: true, brandName: true, tags: true, price: true, offerPrice: true },
    });
    if (!seed) return [];
    const seedEff = this.effectivePrice(seed as any);

    const coPurchased = await this.getCoPurchasedProductIds(productId, 40);
    const candidates1 = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        id: { not: productId },
        OR: [
          { categoryId: seed.categoryId },
          seed.brandName ? { brandName: seed.brandName } : undefined,
          Array.isArray(seed.tags) && seed.tags.length ? { tags: { hasSome: seed.tags as any } } : undefined,
          coPurchased.length ? { id: { in: coPurchased } } : undefined,
        ].filter(Boolean) as any,
      },
      select: { id: true },
      take: 160,
    });

    const byId = new Map<string, Set<string>>();
    for (const pid of coPurchased) byId.set(pid, new Set(['co_purchased']));
    for (const c of candidates1) {
      const s = byId.get(c.id) || new Set<string>();
      s.add('similar');
      byId.set(c.id, s);
    }

    const hydrated = await this.filterAndHydrateProductIds({
      productIds: Array.from(byId.keys()),
      location: req.location,
      excludeProductIds: new Set([productId]),
      limit,
    });

    const scored = hydrated
      .map(({ p, deliverable, openNow }) => {
        const baseReasons = Array.from(byId.get(p.id) || []);
        const { score, reasons } = this.scoreProduct({
          context: 'PDP_SIMILAR',
          baseReasons,
          p,
          deliverable,
          openNow,
          seed: { categoryId: seed.categoryId, brandName: seed.brandName, tags: seed.tags || [], price: seedEff },
        });
        return {
          productId: p.id,
          title: p.title,
          price: this.effectivePrice(p),
          offerPrice: p.offerPrice,
          images: p.images || [],
          vendorId: p.vendorId,
          categoryId: p.categoryId,
          score,
          reasons,
        } as SuggestedProduct;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    try {
      await this.redis.set(cacheKey, JSON.stringify(scored), 60 * 5); // 5m
    } catch {
      // ignore
    }
    return scored;
  }

  async suggestCart(userId: string, req: SuggestionRequest = {}): Promise<SuggestedProduct[]> {
    const limit = Math.max(1, Math.min(50, req.limit ?? 10));
    const bucket = this.bucketKey(req.location, req.region);
    const cacheKey = `reco:cart:v2:${userId}:${bucket}:${limit}`;
    let cached: string | null = null;
    try {
      cached = await this.redis.get(cacheKey);
    } catch {
      cached = null;
    }
    if (cached) return JSON.parse(cached);

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { CartItem: { include: { Product: { select: { id: true, categoryId: true, vendorId: true, brandName: true, tags: true, price: true, offerPrice: true } } } } },
    });
    if (!cart || cart.CartItem.length === 0) return [];

    const cartIds = new Set<string>(cart.CartItem.map((i: any) => String(i.productId)));
    const seeds = cart.CartItem.map((i: any) => i.Product).filter(Boolean);

    const candidateIds: string[] = [];
    const byId = new Map<string, Set<string>>();
    for (const s of seeds.slice(0, 6)) {
      const co = await this.getCoPurchasedProductIds(String(s.id), 20);
      for (const pid of co) {
        if (cartIds.has(pid)) continue;
        const r = byId.get(pid) || new Set<string>();
        r.add('co_purchased');
        byId.set(pid, r);
        candidateIds.push(pid);
      }
    }

    // category-based backfill
    const catIds = Array.from(new Set(seeds.map((s: any) => s.categoryId))).slice(0, 6);
    const backfill = await this.prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 }, categoryId: { in: catIds }, id: { notIn: Array.from(cartIds) } },
      select: { id: true },
      take: 120,
    });
    for (const b of backfill) {
      const r = byId.get(b.id) || new Set<string>();
      r.add('category_affinity');
      byId.set(b.id, r);
    }

    const hydrated = await this.filterAndHydrateProductIds({
      productIds: Array.from(byId.keys()),
      location: req.location,
      excludeProductIds: cartIds,
      limit,
    });

    // Seed profile for similarity scoring: use most common category/brand
    const seedCategoryId = catIds[0];
    const seedBrand = seeds.find((s: any) => s.brandName)?.brandName;
    const seedTags = seeds.flatMap((s: any) => (Array.isArray(s.tags) ? s.tags : [])).slice(0, 20);
    const seedPrice = this.effectivePrice(seeds[0]);

    const scored = hydrated
      .map(({ p, deliverable, openNow }) => {
        const baseReasons = Array.from(byId.get(p.id) || []);
        const { score, reasons } = this.scoreProduct({
          context: 'CART',
          baseReasons,
          p,
          deliverable,
          openNow,
          seed: { categoryId: seedCategoryId, brandName: seedBrand, tags: seedTags, price: seedPrice },
        });
        return {
          productId: p.id,
          title: p.title,
          price: this.effectivePrice(p),
          offerPrice: p.offerPrice,
          images: p.images || [],
          vendorId: p.vendorId,
          categoryId: p.categoryId,
          score,
          reasons,
        } as SuggestedProduct;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    try {
      await this.redis.set(cacheKey, JSON.stringify(scored), 60);
    } catch {
      // ignore
    }
    return scored;
  }

  async suggestSearchDropdown(query: string, req: SuggestionRequest = {}): Promise<SuggestedProduct[]> {
    const q = (query || '').trim();
    const limit = Math.max(1, Math.min(20, req.limit ?? 10));
    const bucket = this.bucketKey(req.location, req.region);
    const cacheKey = `reco:searchdrop:v2:${q.toLowerCase()}:${bucket}:${limit}`;
    let cached: string | null = null;
    try {
      cached = await this.redis.get(cacheKey);
    } catch {
      cached = null;
    }
    if (cached) return JSON.parse(cached);

    if (q.length < 2) return [];

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { brandName: { contains: q, mode: 'insensitive' } },
          { tags: { has: q.toLowerCase() } },
        ],
      },
      select: { id: true },
      take: 80,
      orderBy: { popularityScore: 'desc' },
    });

    const byId = new Map(products.map((p) => [p.id, new Set<string>(['search_match'])]));
    const hydrated = await this.filterAndHydrateProductIds({
      productIds: Array.from(byId.keys()),
      location: req.location,
      limit,
    });

    const scored = hydrated
      .map(({ p, deliverable, openNow }) => {
        const { score, reasons } = this.scoreProduct({
          context: 'SEARCH_DROPDOWN',
          baseReasons: Array.from(byId.get(p.id) || []),
          p,
          deliverable,
          openNow,
        });
        return {
          productId: p.id,
          title: p.title,
          price: this.effectivePrice(p),
          offerPrice: p.offerPrice,
          images: p.images || [],
          vendorId: p.vendorId,
          categoryId: p.categoryId,
          score,
          reasons,
        } as SuggestedProduct;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    try {
      await this.redis.set(cacheKey, JSON.stringify(scored), 60);
    } catch {
      // ignore
    }
    return scored;
  }
}

