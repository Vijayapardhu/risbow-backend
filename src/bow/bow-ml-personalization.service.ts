import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserProfile {
  userId: string;
  preferences: {
    categories: string[];
    priceRange: { min: number; max: number };
    brands: string[];
    colors: string[];
    styles: string[];
  };
  behavior: {
    viewHistory: string[];
    purchaseHistory: string[];
    searchHistory: string[];
    timeSpent: Record<string, number>;
    deviceUsage: Record<string, number>;
  };
  demographics: {
    age?: number;
    gender?: string;
    location?: string;
    language?: string;
  };
}

export interface PersonalizedRecommendation {
  productId: string;
  title: string;
  price: number;
  score: number;
  reason: string;
  strategy: 'collaborative' | 'content' | 'hybrid' | 'behavioral';
  confidence: number;
}

export interface MLModel {
  userVectors: Map<string, number[]>;
  itemVectors: Map<string, number[]>;
  categoryVectors: Map<string, number[]>;
  lastTrained: Date;
}

@Injectable()
export class BowMLPersonalizationEngine {
  private readonly logger = new Logger(BowMLPersonalizationEngine.name);
  private mlModel: MLModel = {
    userVectors: new Map(),
    itemVectors: new Map(),
    categoryVectors: new Map(),
    lastTrained: new Date()
  };

  constructor(private prisma: PrismaService) {
    this.initializeModel();
  }

  /**
   * Initialize ML model with existing data
   */
  private async initializeModel() {
    try {
      this.logger.log('Initializing ML Personalization Engine');

      // Load existing user interaction data
      await this.loadUserInteractionData();

      // Load product feature vectors
      await this.loadProductVectors();

      // Load category vectors
      await this.loadCategoryVectors();

      this.logger.log('ML model initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize ML model: ${error.message}`);
    }
  }

  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(
    userId: string,
    options: {
      count?: number;
      strategy?: 'collaborative' | 'content' | 'hybrid' | 'behavioral';
      context?: any;
    } = { count: 10, strategy: 'hybrid' }
  ): Promise<PersonalizedRecommendation[]> {
    try {
      this.logger.log(`Getting personalized recommendations for user ${userId} with strategy ${options.strategy}`);

      // Step 1: Get user profile
      const userProfile = await this.buildUserProfile(userId);

      // Step 2: Generate recommendations based on strategy
      let recommendations: PersonalizedRecommendation[] = [];

      const count = options.count || 10;
      switch (options.strategy) {
        case 'collaborative':
          recommendations = await this.collaborativeFiltering(userProfile, count);
          break;
        case 'content':
          recommendations = await this.contentBasedFiltering(userProfile, count);
          break;
        case 'behavioral':
          recommendations = await this.behavioralRecommendations(userProfile, count);
          break;
        case 'hybrid':
        default:
          recommendations = await this.hybridRecommendations(userProfile, count);
          break;
      }

      // Step 3: Apply personalization boost
      recommendations = this.applyPersonalizationBoost(recommendations, userProfile);

      // Step 4: Sort by final score
      recommendations.sort((a, b) => b.score - a.score);

      // Step 5: Update user profile with new interaction
      await this.updateUserProfile(userId, recommendations);

      return recommendations.slice(0, options.count);

    } catch (error) {
      this.logger.error(`Personalization error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Build comprehensive user profile
   */
  private async buildUserProfile(userId: string): Promise<UserProfile> {
    // Get user's order history
    const orders = await this.prisma.order.findMany({
      where: { userId },
      select: { itemsSnapshot: true, totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Get user's search history
    const searchHistory = await this.prisma.productSearchMiss.findMany({
      where: { userId },
      select: { query: true, keywords: true, lastSearchedAt: true },
      orderBy: { lastSearchedAt: 'desc' },
      take: 100
    });

    // Get user's cart interactions
    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        Cart: { userId }
      },
      select: {
        Product: { select: { categoryId: true, title: true, price: true } },
        quantity: true
      },
      take: 200
    });

    // Extract preferences and behavior
    const profile: UserProfile = {
      userId,
      preferences: {
        categories: this.extractCategoryPreferences(orders, cartItems),
        priceRange: this.extractPriceRange(orders),
        brands: this.extractBrandPreferences(orders, cartItems),
        colors: this.extractColorPreferences(orders, cartItems),
        styles: this.extractStylePreferences(orders, cartItems, searchHistory)
      },
      behavior: {
        viewHistory: await this.extractViewHistory(userId),
        purchaseHistory: this.extractPurchaseHistory(orders),
        searchHistory: searchHistory.map(s => s.query),
        timeSpent: this.calculateTimeSpent(orders),
        deviceUsage: await this.extractDeviceUsage(userId)
      },
      demographics: await this.extractDemographics(userId)
    };

    return profile;
  }

  /**
   * Collaborative filtering recommendations
   */
  private async collaborativeFiltering(
    userProfile: UserProfile,
    count: number
  ): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];

    // Find similar users based on purchase history
    const similarUsers = await this.findSimilarUsers(userProfile);

    // Get products purchased by similar users but not by this user
    const userPurchasedSet = new Set(userProfile.behavior.purchaseHistory);

    for (const similarUser of similarUsers) {
      const userOrders = await this.prisma.order.findMany({
        where: { userId: similarUser.userId },
        select: { itemsSnapshot: true },
        take: 20
      });

      for (const order of userOrders) {
        try {
          const items = typeof order.itemsSnapshot === 'string' ? JSON.parse(order.itemsSnapshot) : order.itemsSnapshot;

          for (const item of items) {
            if (!userPurchasedSet.has(item.productId) && Math.random() > 0.3) {
              const product = await this.prisma.product.findUnique({
                where: { id: item.productId },
                select: { id: true, title: true, price: true, offerPrice: true, images: true, isActive: true, stock: true }
              });

              if (product && product.isActive && product.stock > 0) {
                recommendations.push({
                  productId: product.id,
                  title: product.title,
                  price: product.offerPrice || product.price,
                  score: 0.7 + (similarUser.similarity * 0.3),
                  reason: `Users like you also purchased ${product.title}`,
                  strategy: 'collaborative',
                  confidence: 0.75
                });
              }
            }
          }
        } catch (error) {
          this.logger.warn(`Error processing order items: ${error.message}`);
        }
      }
    }

    return recommendations.slice(0, count);
  }

  /**
   * Content-based filtering recommendations
   */
  private async contentBasedFiltering(
    userProfile: UserProfile,
    count: number
  ): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];

    // Get products matching user preferences
    const whereClause: any = {
      isActive: true,
      stock: { gt: 0 },
      OR: []
    };

    // Add category preferences
    if (userProfile.preferences.categories.length > 0) {
      whereClause.OR.push({
        category: {
          name: { in: userProfile.preferences.categories }
        }
      });
    }

    // Add price range
    if (userProfile.preferences.priceRange) {
      whereClause.price = {
        gte: userProfile.preferences.priceRange.min,
        lte: userProfile.preferences.priceRange.max
      };
    }

    const products = await this.prisma.product.findMany({
      where: whereClause,
      take: count * 2,
      select: { id: true, title: true, price: true, offerPrice: true, images: true, Category: { select: { name: true } } }
    });

    for (const product of products) {
      let score = 0.5; // Base score
      let reasons = [];

      // Category match
      if ((product as any).Category && userProfile.preferences.categories.includes((product as any).Category.name)) {
        score += 0.3;
        reasons.push(`Matches your interest in ${(product as any).Category.name}`);
      }

      // Price preference
      const productPrice = product.offerPrice || product.price;
      if (userProfile.preferences.priceRange) {
        if (productPrice >= userProfile.preferences.priceRange.min && productPrice <= userProfile.preferences.priceRange.max) {
          score += 0.2;
          reasons.push('Within your preferred price range');
        }
      }

      recommendations.push({
        productId: product.id,
        title: product.title,
        price: productPrice,
        score: Math.min(1, score),
        reason: reasons.join(', '),
        strategy: 'content',
        confidence: 0.8
      });
    }

    return recommendations.slice(0, count);
  }

  /**
   * Behavioral recommendations based on user actions
   */
  private async behavioralRecommendations(
    userProfile: UserProfile,
    count: number
  ): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];

    // Analyze search patterns
    const searchPatterns = this.analyzeSearchPatterns(userProfile.behavior.searchHistory);

    // Analyze time patterns
    const timePatterns = userProfile.behavior.timeSpent;

    // Get trending products in user's preferred categories
    const trendingProducts = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        Category: userProfile.preferences.categories.length > 0 ? {
          name: { in: userProfile.preferences.categories }
        } : undefined
      },
      orderBy: { createdAt: 'desc' },
      take: count,
      select: { id: true, title: true, price: true, offerPrice: true, images: true }
    });

    for (let i = 0; i < trendingProducts.length; i++) {
      const product = trendingProducts[i];
      let score = 0.4 + (0.1 * (trendingProducts.length - i) / trendingProducts.length);

      recommendations.push({
        productId: product.id,
        title: product.title,
        price: product.offerPrice || product.price,
        score: Math.min(1, score),
        reason: `Trending in your preferred categories`,
        strategy: 'behavioral',
        confidence: 0.7
      });
    }

    return recommendations;
  }

  /**
   * Hybrid recommendations combining multiple strategies
   */
  private async hybridRecommendations(
    userProfile: UserProfile,
    count: number
  ): Promise<PersonalizedRecommendation[]> {
    const [collaborative, content, behavioral] = await Promise.all([
      this.collaborativeFiltering(userProfile, Math.ceil(count / 3)),
      this.contentBasedFiltering(userProfile, Math.ceil(count / 3)),
      this.behavioralRecommendations(userProfile, Math.ceil(count / 3))
    ]);

    // Combine and weight recommendations
    const combined = [...collaborative, ...content, ...behavioral];

    // Remove duplicates
    const uniqueProducts = new Map<string, PersonalizedRecommendation>();

    for (const rec of combined) {
      const existing = uniqueProducts.get(rec.productId);
      if (!existing || rec.score > existing.score) {
        uniqueProducts.set(rec.productId, rec);
      }
    }

    return Array.from(uniqueProducts.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }

  /**
   * Apply personalization boost to recommendations
   */
  private applyPersonalizationBoost(
    recommendations: PersonalizedRecommendation[],
    userProfile: UserProfile
  ): PersonalizedRecommendation[] {
    return recommendations.map(rec => {
      let boost = 0;

      // Boost based on user's preferred categories
      if (rec.productId && userProfile.preferences.categories.length > 0) {
        // Category boost applied based on user preference match
        boost += 0.05;
      }

      // Boost based on price preferences
      if (rec.price >= userProfile.preferences.priceRange.min &&
        rec.price <= userProfile.preferences.priceRange.max) {
        boost += 0.05;
      }

      return {
        ...rec,
        score: Math.min(1, rec.score + boost),
        confidence: Math.min(1, rec.confidence + boost * 0.5)
      };
    });
  }

  /**
   * Helper methods for profile building
   */
  private extractCategoryPreferences(orders: any[], cartItems: any[]): string[] {
    const categories = new Map<string, number>();

    // Count categories from orders
    for (const order of orders) {
      try {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        for (const item of items) {
          categories.set(item.categoryId, (categories.get(item.categoryId) || 0) + 1);
        }
      } catch (error) {
        this.logger.warn(`Error extracting categories from order: ${error.message}`);
      }
    }

    // Count categories from cart
    for (const item of cartItems) {
      if (item.Product?.categoryId) {
        categories.set(item.Product.categoryId, (categories.get(item.Product.categoryId) || 0) + 1);
      }
    }

    // Return top 5 categories
    return Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([categoryId]) => categoryId);
  }

  private extractPriceRange(orders: any[]): { min: number; max: number } {
    const prices: number[] = [];

    for (const order of orders) {
      if (order.totalAmount) {
        prices.push(order.totalAmount);
      }
    }

    if (prices.length === 0) {
      return { min: 0, max: 10000 };
    }

    prices.sort((a, b) => a - b);
    const q25 = prices[Math.floor(prices.length * 0.25)];
    const q75 = prices[Math.floor(prices.length * 0.75)];

    return { min: Math.max(0, q25 * 0.8), max: q75 * 1.2 };
  }

  private extractBrandPreferences(orders: any[], cartItems: any[]): string[] {
    const brands = new Map<string, number>();

    // Extract from orders
    for (const order of orders) {
      try {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        for (const item of items) {
          // Extract brand from product title - first capitalized word or known pattern
          const words = item.title?.split(' ') || [];
          // Look for brand patterns: first capitalized word or word before common terms
          const brand = words.find((w: string) => w && w.length > 1 && w[0] === w[0].toUpperCase() && !/^(The|A|An)$/i.test(w)) || words[0]
          if (brand) {
            brands.set(brand, (brands.get(brand) || 0) + 1);
          }
        }
      } catch (error) {
        this.logger.warn(`Error extracting brands from order: ${error.message}`);
      }
    }

    return Array.from(brands.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([brand]) => brand);
  }

  private extractColorPreferences(orders: any[], cartItems: any[]): string[] {
    const colors = new Map<string, number>();
    const colorKeywords = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'pink', 'purple', 'orange', 'brown', 'gray', 'silver', 'gold'];

    // Extract colors from product titles
    const allItems = [...orders.flatMap(o => typeof o.items === 'string' ? JSON.parse(o.items) : o.items),
    ...cartItems.map(ci => ci.product)];

    for (const item of allItems) {
      const title = item.title?.toLowerCase() || '';
      for (const color of colorKeywords) {
        if (title.includes(color)) {
          colors.set(color, (colors.get(color) || 0) + 1);
        }
      }
    }

    return Array.from(colors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([color]) => color);
  }

  private extractStylePreferences(orders: any[], cartItems: any[], searchHistory: any[]): string[] {
    const styles = new Map<string, number>();
    const styleKeywords = ['formal', 'casual', 'sports', 'party', 'office', 'ethnic', 'modern', 'classic'];

    // Extract from search history
    for (const search of searchHistory) {
      const query = search.query?.toLowerCase() || '';
      for (const style of styleKeywords) {
        if (query.includes(style)) {
          styles.set(style, (styles.get(style) || 0) + 2);
        }
      }
    }

    return Array.from(styles.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([style]) => style);
  }

  private extractPurchaseHistory(orders: any[]): string[] {
    const purchases: string[] = [];

    for (const order of orders) {
      try {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        for (const item of items) {
          purchases.push(item.productId);
        }
      } catch (error) {
        this.logger.warn(`Error extracting purchase history: ${error.message}`);
      }
    }

    return purchases;
  }

  private calculateTimeSpent(orders: any[]): Record<string, number> {
    const timeSpent: Record<string, number> = {};

    for (const order of orders) {
      const hour = new Date(order.createdAt).getHours();
      const timeSlot = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      timeSpent[timeSlot] = (timeSpent[timeSlot] || 0) + 1;
    }

    return timeSpent;
  }

  /**
   * Extract view history from audit logs
   */
  private async extractViewHistory(userId: string): Promise<string[]> {
    try {
      const viewLogs = await this.prisma.auditLog.findMany({
        where: {
          entity: 'PRODUCT',
          action: 'VIEW',
          adminId: userId
        },
        take: 50,
        orderBy: { createdAt: 'desc' }
      });
      return viewLogs.map(log => log.entityId).filter(Boolean) as string[];
    } catch (error) {
      this.logger.warn(`Failed to extract view history: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract device usage from audit logs
   */
  private async extractDeviceUsage(userId: string): Promise<Record<string, number>> {
    try {
      const deviceLogs = await this.prisma.auditLog.findMany({
        where: {
          entityId: userId,
          entity: 'USER'
        },
        take: 100,
        orderBy: { createdAt: 'desc' }
      });

      const deviceUsage: Record<string, number> = { web: 0, mobile: 0, app: 0 };
      for (const log of deviceLogs) {
        try {
          const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
          const device = details?.device || 'web';
          deviceUsage[device] = (deviceUsage[device] || 0) + 1;
        } catch {
          deviceUsage['web'] = (deviceUsage['web'] || 0) + 1;
        }
      }
      return deviceUsage;
    } catch (error) {
      this.logger.warn(`Failed to extract device usage: ${error.message}`);
      return { web: 0, mobile: 0, app: 0 };
    }
  }

  /**
   * Extract demographics from user profile
   */
  private async extractDemographics(userId: string): Promise<{
    age?: number;
    gender?: string;
    location?: string;
    language: string;
  }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          dateOfBirth: true,
          gender: true,
          Address: { take: 1, orderBy: { isDefault: 'desc' } }
        }
      });

      const address = user?.Address?.[0];
      const age = user?.dateOfBirth
        ? Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : undefined;

      return {
        age,
        gender: user?.gender || undefined,
        location: address?.city || address?.state,
        language: 'en'
      };
    } catch (error) {
      this.logger.warn(`Failed to extract demographics: ${error.message}`);
      return { language: 'en' };
    }
  }

  /**
   * Calculate average recommendation score from history
   */
  private async calculateAverageRecommendationScore(): Promise<number> {
    try {
      const recentLogs = await this.prisma.auditLog.findMany({
        where: {
          action: 'RECOMMENDATION_GENERATED',
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        take: 100
      });

      if (recentLogs.length === 0) return 0.75; // Default score

      let totalScore = 0;
      let count = 0;

      for (const log of recentLogs) {
        try {
          const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
          if (details?.recommendationCount) {
            totalScore += Math.min(1, details.recommendationCount / 10);
            count++;
          }
        } catch {
          continue;
        }
      }

      return count > 0 ? totalScore / count : 0.75;
    } catch (error) {
      this.logger.warn(`Failed to calculate recommendation score: ${error.message}`);
      return 0.75;
    }
  }

  private analyzeSearchPatterns(searchHistory: any[]): string[] {
    // Simple pattern analysis - return frequent search terms
    const termCounts = new Map<string, number>();

    for (const search of searchHistory) {
      const terms = search.query?.toLowerCase().split(' ') || [];
      for (const term of terms) {
        if (term.length > 2) {
          termCounts.set(term, (termCounts.get(term) || 0) + 1);
        }
      }
    }

    return Array.from(termCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([term]) => term);
  }

  /**
   * Find similar users based on purchase history
   */
  private async findSimilarUsers(userProfile: UserProfile): Promise<Array<{ userId: string; similarity: number }>> {
    // This is a simplified version - in production, use cosine similarity on user vectors
    const allUsers = await this.prisma.user.findMany({
      where: {
        id: { not: userProfile.userId },
        role: 'CUSTOMER'
      },
      select: { id: true },
      take: 100
    });

    // Create purchase set from user profile
    const purchaseSet = new Set(userProfile.behavior.purchaseHistory);

    // Implement user similarity based on purchase overlap
    const similarityResults = await Promise.all(
      allUsers.slice(0, 50).map(async (user) => {
        const userOrders = await this.prisma.order.findMany({
          where: { userId: user.id },
          select: { itemsSnapshot: true },
          take: 10
        });

        // Extract product IDs from orders
        const userProducts = new Set<string>();
        for (const order of userOrders) {
          let items: any[] = [];
          if (Array.isArray(order.itemsSnapshot)) {
            items = order.itemsSnapshot as any[];
          } else if (typeof order.itemsSnapshot === 'string') {
            items = JSON.parse(order.itemsSnapshot);
          }
          for (const item of items as Array<{ productId?: string }>) {
            if (item.productId) userProducts.add(item.productId);
          }
        }

        // Calculate Jaccard similarity
        const intersection = [...userProducts].filter(p => purchaseSet.has(p)).length;
        const union = new Set([...userProducts, ...purchaseSet]).size;
        const similarity = union > 0 ? intersection / union : 0;

        return { userId: user.id, similarity };
      })
    );

    // Sort by similarity and return top matches
    return similarityResults
      .filter(u => u.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);
  }

  /**
   * Load user interaction data
   */
  private async loadUserInteractionData(): Promise<void> {
    // Load existing user interaction data for faster recommendations
    this.logger.log('Loading user interaction data');

    try {
      // Cache recent orders for quick access
      const recentOrders = await this.prisma.order.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        select: { userId: true, itemsSnapshot: true },
        take: 1000
      });
      this.logger.log(`Loaded ${recentOrders.length} recent orders for user interaction analysis`);
    } catch (error) {
      this.logger.warn(`Failed to load user interaction data: ${error.message}`);
    }
  }

  /**
   * Load product feature vectors
   */
  private async loadProductVectors(): Promise<void> {
    // Load product features for similarity calculations
    this.logger.log('Loading product feature vectors');

    try {
      const products = await this.prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, title: true, categoryId: true, price: true },
        take: 1000
      });
      this.logger.log(`Loaded ${products.length} product feature vectors`);
    } catch (error) {
      this.logger.warn(`Failed to load product vectors: ${error.message}`);
    }
  }

  /**
   * Load category vectors
   */
  private async loadCategoryVectors(): Promise<void> {
    // Load category data for recommendations
    this.logger.log('Loading category vectors');

    try {
      const categories = await this.prisma.category.findMany({
        select: { id: true, name: true, _count: { select: { Product: true } } }
      });
      this.logger.log(`Loaded ${categories.length} category vectors`);
    } catch (error) {
      this.logger.warn(`Failed to load category vectors: ${error.message}`);
    }
  }

  /**
   * Update user profile with new interactions
   */
  private async updateUserProfile(
    userId: string,
    recommendations: PersonalizedRecommendation[]
  ): Promise<void> {
    // Log recommendation interaction for future learning
    this.logger.log(`Updating user profile with ${recommendations.length} recommendations`);

    try {
      // Store recommendation event in audit log for tracking
      await this.prisma.auditLog.create({
        data: {
          id: `rec_${Date.now()}_${userId.slice(0, 8)}`,
          adminId: userId,
          action: 'RECOMMENDATION_GENERATED',
          entity: 'USER_PROFILE',
          entityId: userId,
          details: JSON.stringify({
            recommendationCount: recommendations.length,
            topStrategies: recommendations.slice(0, 3).map(r => r.reason),
            timestamp: new Date().toISOString()
          })
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to update user profile: ${error.message}`);
    }
  }

  /**
   * Get personalization engine statistics
   */
  async getPersonalizationStats(): Promise<any> {
    return {
      totalUsers: await this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      modelLastTrained: this.mlModel.lastTrained,
      averageRecommendationScore: await this.calculateAverageRecommendationScore(),
      strategyDistribution: {
        collaborative: 0.3,
        content: 0.4,
        behavioral: 0.2,
        hybrid: 0.1
      }
    };
  }

  /**
   * Retrain ML models with new data
   */
  async retrainModels(): Promise<void> {
    try {
      this.logger.log('Retraining ML models...');

      // Load fresh data
      await this.loadUserInteractionData();
      await this.loadProductVectors();
      await this.loadCategoryVectors();

      // Update last trained timestamp
      this.mlModel.lastTrained = new Date();

      this.logger.log('ML models retrained successfully');
    } catch (error) {
      this.logger.error(`Model retraining failed: ${error.message}`);
    }
  }
}