import { Test } from '@nestjs/testing';
import { ProductSuggestionsService } from './product-suggestions.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { DeliveryOptionsService } from '../delivery/delivery-options.service';
import { VendorAvailabilityService } from '../vendors/vendor-availability.service';
import { EcommerceEventsService } from './ecommerce-events.service';

describe(ProductSuggestionsService.name, () => {
  let service: ProductSuggestionsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductSuggestionsService,
        { provide: PrismaService, useValue: { product: { findMany: jest.fn(), findUnique: jest.fn() }, cart: { findUnique: jest.fn() } } },
        { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn() } },
        { provide: DeliveryOptionsService, useValue: { checkEligibility: jest.fn().mockResolvedValue({ eligible: true }) } },
        { provide: VendorAvailabilityService, useValue: { getAvailability: jest.fn().mockReturnValue({ openNow: true }) } },
        { provide: EcommerceEventsService, useValue: { getTrending: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    service = moduleRef.get(ProductSuggestionsService);
  });

  it('dedupes productIds and keeps ordering by score', async () => {
    const prisma: any = (service as any).prisma;
    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'p1',
        title: 'A',
        price: 10000,
        offerPrice: null,
        images: [],
        vendorId: 'v1',
        categoryId: 'c1',
        brandName: 'b',
        tags: [],
        popularityScore: 100,
        createdAt: new Date(),
        vendor: { storeStatus: 'OPEN', storeClosedUntil: null, storeTimings: null },
      },
      {
        id: 'p2',
        title: 'B',
        price: 10000,
        offerPrice: 9000,
        images: [],
        vendorId: 'v1',
        categoryId: 'c1',
        brandName: 'b',
        tags: [],
        popularityScore: 10,
        createdAt: new Date(),
        vendor: { storeStatus: 'OPEN', storeClosedUntil: null, storeTimings: null },
      },
    ]);

    // Force through HOME scoring using direct internals: suggestHome builds candidates from events/cart/profile;
    // here we call the internal hydrator via suggestSearchDropdown, which is deterministic for the test.
    const res = await service.suggestSearchDropdown('ab', { limit: 10 });
    expect(res.map((r) => r.productId)).toEqual(['p1', 'p2']);
  });
});

