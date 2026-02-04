import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface OutfitRecommendation {
    name: string;
    items: Array<{
        productId: string;
        title: string;
        price: number;
        category: string;
    }>;
    totalPrice: number;
    occasion: string;
    reason: string;
}

export interface UserStyle {
    preferredColors: string[];
    preferredBrands: string[];
    preferredCategories: string[];
    stylePreferences: string[];
    priceRange: { min: number; max: number };
    sizes: Record<string, string>; // e.g., shirt: "M", shoes: "10"
}

@Injectable()
export class BowOutfitRecommender {
    private readonly logger = new Logger(BowOutfitRecommender.name);

    constructor(private prisma: PrismaService) {}

    /**
     * Suggest complete outfit based on user style and preferences
     */
    async suggestOutfit(userId: string, occasion: string = 'casual'): Promise<OutfitRecommendation[]> {
        try {
            // Get user's style profile
            const userStyle = await this.buildUserStyleProfile(userId);
            if (!userStyle) {
                return await this.getSuggestedOutfitsForOccasion(occasion, 3);
            }

            const outfits: OutfitRecommendation[] = [];

            // Suggest different outfit combinations
            for (let i = 0; i < 3; i++) {
                const outfit = await this.buildOutfitForOccasion(
                    occasion,
                    userStyle,
                    i
                );
                if (outfit) {
                    outfits.push(outfit);
                }
            }

            this.logger.log(`Generated ${outfits.length} outfit recommendations for user ${userId}`);
            return outfits;
        } catch (error) {
            this.logger.error(`Error suggesting outfit: ${error.message}`);
            return [];
        }
    }

    /**
     * Build user's style profile from purchase history
     */
    private async buildUserStyleProfile(userId: string): Promise<UserStyle | null> {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    colors: true,
                    size: true,
                    stylePrefs: true
                }
            });

            if (!user) return null;

            // Get user's orders to extract preferences
            const userOrders = await this.prisma.order.findMany({
                where: { userId },
                select: { items: true },
                take: 10
            });

            const profile: UserStyle = {
                preferredColors: user.colors ? JSON.parse(user.colors) : [],
                preferredBrands: [],
                preferredCategories: [],
                stylePreferences: user.stylePrefs ? JSON.parse(user.stylePrefs) : [],
                priceRange: { min: 500, max: 5000 },
                sizes: {}
            };

            // Extract preferences from purchase history
            if (userOrders && userOrders.length > 0) {
                const categories = new Map<string, number>();
                const brands = new Map<string, number>();

                userOrders.forEach(order => {
                    // Order.items is a JSON field (array)
                    if (Array.isArray(order.items)) {
                        order.items.forEach((item: any) => {
                            // Since we don't have product details in items, just track count
                            if (item.productTitle) {
                                // Extract brand from title
                                const brandMatch = item.productTitle.match(/^\w+/);
                                if (brandMatch) {
                                    brands.set(brandMatch[0], (brands.get(brandMatch[0]) || 0) + 1);
                                }
                            }
                        });
                    }
                });

                profile.preferredBrands = Array.from(brands.keys()).slice(0, 5);
            }

            // Get frequently purchased categories
            const userProducts = await this.prisma.product.findMany({
                where: { vendor: { id: userId } },
                select: { categoryId: true, Category: { select: { name: true } } },
                take: 5
            });

            profile.preferredCategories = userProducts
                .map(p => p.Category?.name)
                .filter(Boolean)
                .slice(0, 5);

            return profile;
        } catch (error) {
            this.logger.error(`Error building style profile: ${error.message}`);
            return null;
        }
    }

    /**
     * Build a complete outfit for an occasion
     */
    private async buildOutfitForOccasion(
        occasion: string,
        userStyle: UserStyle,
        variant: number
    ): Promise<OutfitRecommendation | null> {
        try {
            // Define what categories are needed for each occasion
            const outfitTemplates = {
                casual: ['Shirts', 'Trousers', 'Shoes', 'Accessories'],
                formal: ['Shirts', 'Trousers', 'Shoes', 'Blazer'],
                party: ['Tops', 'Bottoms', 'Shoes', 'Accessories'],
                sports: ['Sports T-Shirt', 'Sports Shorts', 'Sports Shoes', 'Sports Accessories']
            };

            const categories = outfitTemplates[occasion] || outfitTemplates['casual'];
            const items = [];
            let totalPrice = 0;

            // Get one product from each category
            for (const category of categories) {
                const product = await this.prisma.product.findFirst({
                    where: {
                        category: {
                            name: { contains: category, mode: 'insensitive' }
                        },
                        isActive: true,
                        price: {
                            gte: userStyle.priceRange.min,
                            lte: userStyle.priceRange.max
                        }
                    },
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        Category: { select: { name: true } }
                    },
                    skip: variant // Use variant to get different products
                });

                if (product) {
                    items.push({
                        productId: product.id,
                        title: product.title,
                        price: product.price,
                        category: product.Category.name
                    });
                    totalPrice += product.price;
                }
            }

            if (items.length < 3) return null;

            return {
                name: `${occasion.charAt(0).toUpperCase() + occasion.slice(1)} Outfit #${variant + 1}`,
                items,
                totalPrice,
                occasion,
                reason: `Perfect ${occasion} look with your style preferences! 👗`
            };
        } catch (error) {
            this.logger.error(`Error building outfit: ${error.message}`);
            return null;
        }
    }

    /**
     * Get suggested outfits for occasions without user profile
     */
    private async getSuggestedOutfitsForOccasion(
        occasion: string,
        limit: number
    ): Promise<OutfitRecommendation[]> {
        try {
            const outfits: OutfitRecommendation[] = [];

            // Get trending products for the occasion
            const trendingProducts = await this.prisma.product.findMany({
                where: { isActive: true },
                take: limit * 5,
                select: {
                    id: true,
                    title: true,
                    price: true,
                    Category: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Group by category and create outfit combinations
            const byCategory = new Map<string, any[]>();
            trendingProducts.forEach(p => {
                if (!byCategory.has(p.Category.name)) {
                    byCategory.set(p.Category.name, []);
                }
                byCategory.get(p.Category.name)!.push(p);
            });

            // Create outfits from available categories
            for (let i = 0; i < limit; i++) {
                const items = Array.from(byCategory.values())
                    .slice(0, 4)
                    .map(products => products[i % products.length])
                    .filter(Boolean);

                if (items.length >= 3) {
                    const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
                    outfits.push({
                        name: `Trending ${occasion} Look #${i + 1}`,
                        items: items.map(p => ({
                            productId: p.id,
                            title: p.title,
                            price: p.price,
                            category: p.Category.name
                        })),
                        totalPrice,
                        occasion,
                        reason: `Stylish ${occasion} combination!`
                    });
                }
            }

            return outfits;
        } catch (error) {
            this.logger.error(`Error getting suggested outfits: ${error.message}`);
            return [];
        }
    }

    /**
     * Get complementary products for an item
     */
    async getComplementaryItems(productId: string, limit: number = 5): Promise<any[]> {
        try {
            const product = await this.prisma.product.findUnique({
                where: { id: productId },
                select: {
                    id: true,
                    categoryId: true,
                    category: { select: { name: true } },
                    price: true
                }
            });

            if (!product) return [];

            // Define complementary categories
            const complements: Record<string, string[]> = {
                'Shirts': ['Trousers', 'Shoes', 'Accessories'],
                'Trousers': ['Shirts', 'Shoes', 'Belts'],
                'Shoes': ['Socks', 'Laces'],
                'Phones': ['Cases', 'Chargers', 'Earphones'],
                'Laptops': ['Bags', 'Chargers', 'Mice'],
            };

            const categoryName = product.Category.name;
            const complementCategories = complements[categoryName] || [];

            if (complementCategories.length === 0) return [];

            // Find products in complement categories
            const complementaryProducts = await this.prisma.product.findMany({
                where: {
                    category: {
                        name: { in: complementCategories }
                    },
                    id: { not: productId },
                    isActive: true,
                    price: {
                        lte: product.price * 2 // Similar price range
                    }
                },
                take: limit,
                select: {
                    id: true,
                    title: true,
                    price: true,
                    images: true,
                    Category: { select: { name: true } }
                }
            });

            return complementaryProducts;
        } catch (error) {
            this.logger.error(`Error getting complementary items: ${error.message}`);
            return [];
        }
    }
}
