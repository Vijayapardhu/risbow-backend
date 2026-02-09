import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class PerformanceOptimizationService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  // Method to get paginated results to prevent large data loads
  async getPaginatedResults<T>(
    model: any,
    where: any = {},
    page: number = 1,
    limit: number = 20,
    orderBy: any = { createdAt: 'desc' },
    include?: any,
  ): Promise<{ data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const skip = (page - 1) * limit;
    
    const [results, total] = await Promise.all([
      model.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include,
      }),
      model.count({ where }),
    ]);

    return {
      data: results,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Method to implement caching for frequently accessed data
  async getCachedOrFetch<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttl: number = 300, // 5 minutes default
  ): Promise<T> {
    // Try to get from cache first
    const cachedResult = await this.cacheService.get(cacheKey);
    if (cachedResult) {
      return cachedResult as T;
    }

    // If not in cache, fetch from database
    const result = await fetchFn();
    
    // Store in cache
    await this.cacheService.set(cacheKey, result, ttl);
    
    return result;
  }

  // Method to optimize queries by using proper includes to prevent N+1 issues
  async getOptimizedOrderWithRelations(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
          }
        },
        address: true,
        OrderItem: {
          include: {
            Product: {
              select: {
                id: true,
                title: true,
                price: true,
              }
            },
            Vendor: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        payment: true,
        OrderSettlement: true,
      },
    });
  }

  // Method to get optimized product listings with proper indexing
  async getOptimizedProductList(
    filters: {
      categoryId?: string;
      vendorId?: string;
      isActive?: boolean;
      search?: string;
    },
    pagination: { page: number; limit: number },
    sorting: { field: string; order: 'asc' | 'desc' } = { field: 'createdAt', order: 'desc' },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.vendorId) where.vendorId = filters.vendorId;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sorting.field]: sorting.order },
        select: {
          id: true,
          title: true,
          price: true,
          offerPrice: true,
          stock: true,
          isActive: true,
          createdAt: true,
          categoryId: true,
          vendorId: true,
          images: true,
          sku: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Method to implement database connection pooling optimization
  async executeTransactionWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries - 1) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }

  // Method to optimize bulk operations
  async performBulkUpdate(model: any, where: any, data: any) {
    return this.prisma.$transaction(async (tx) => {
      // Use updateMany for bulk updates to avoid individual queries
      return tx[model].updateMany({
        where,
        data,
      });
    });
  }
}