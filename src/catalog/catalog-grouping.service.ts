import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface GroupedProductResult {
    groupKey: string;
    title: string;
    brandName: string | null;
    category: string | null;
    categoryId: string | null;
    image: string | null;
    minPrice: number;
    maxPrice: number;
    vendorCount: number;
    bestOffer: {
        productId: string;
        vendorId: string;
        vendorName: string;
        price: number;
        offerPrice: number | null;
        stock: number;
    } | null;
}

export interface GroupedProductResponse {
    items: GroupedProductResult[];
    meta: {
        total: number;
        grouped: boolean;
    };
}

export interface VendorOffer {
    productId: string;
    vendorId: string;
    vendorName: string;
    storeName?: string;
    price: number;
    offerPrice: number | null;
    effectivePrice: number;
    stock: number;
    isActive: boolean;
    distanceKm?: number;
    vendorRatingAvg?: number;
    vendorRatingCount?: number;
    productRatingAvg?: number;
    productRatingCount?: number;
}

export interface GroupOffersResponse {
    group: {
        groupKey: string;
        title: string;
        image: string | null;
    };
    offers: VendorOffer[];
    meta: {
        total: number;
    };
}

@Injectable()
export class CatalogGroupingService {
    /**
     * Compute a stable groupKey for deduplication
     * Priority: barcode > normalized (title + brandName + categoryId)
     */
    computeGroupKey(product: { barcode?: string | null; title?: string; brandName?: string | null; categoryId?: string | null }): string {
        // Best: use barcode if available
        if (product.barcode) {
            return `barcode:${product.barcode}`;
        }
        
        // Fallback: normalize title + brandName + categoryId
        const parts = [
            this.normalizeString(product.title || ''),
            this.normalizeString(product.brandName || ''),
            product.categoryId || ''
        ].filter(Boolean);
        
        if (parts.length === 0) {
            // If nothing to group by, generate a random key
            return `unknown:${randomUUID()}`;
        }
        
        return `norm:${parts.join(':')}`;
    }
    
    /**
     * Parse groupKey to extract the type and value
     */
    parseGroupKey(groupKey: string): { type: 'barcode' | 'norm' | 'unknown'; value: string } {
        if (groupKey.startsWith('barcode:')) {
            return { type: 'barcode', value: groupKey.replace('barcode:', '') };
        }
        if (groupKey.startsWith('norm:')) {
            return { type: 'norm', value: groupKey.replace('norm:', '') };
        }
        return { type: 'unknown', value: groupKey };
    }
    
    /**
     * Normalize string for grouping: trim, lowercase, collapse whitespace, strip punctuation
     */
    private normalizeString(str: string): string {
        return str
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '')           // collapse whitespace
            .replace(/[^a-z0-9]/g, '');   // strip punctuation
    }
    
    /**
     * Select best image from an array of product images
     */
    selectBestImage(images: string[] | null | undefined, fallbackImage?: string | null): string | null {
        if (!images || images.length === 0) {
            return fallbackImage || null;
        }
        
        // Prefer non-placeholder images
        const validImages = images.filter(img => 
            img && !img.includes('placeholder') && !img.includes('via.placeholder.com')
        );
        
        if (validImages.length > 0) {
            return validImages[0];
        }
        
        return images[0];
    }
    
    /**
     * Group products by their groupKey
     */
    groupProducts(
        products: Array<{
            id: string;
            title: string;
            brandName?: string | null;
            categoryId?: string | null;
            category?: { name: string } | null;
            barcode?: string | null;
            image?: string | null;
            images?: string[] | null;
            price: number;
            offerPrice?: number | null;
            stock: number;
            vendorId: string;
            vendor?: { storeName?: string; name?: string } | null;
        }>
    ): GroupedProductResponse {
        const groupMap = new Map<string, GroupedProductResult>();
        
        for (const product of products) {
            const groupKey = this.computeGroupKey(product);
            
            if (!groupMap.has(groupKey)) {
                // Create new group
                const effectivePrice = product.offerPrice ?? product.price;
                
                groupMap.set(groupKey, {
                    groupKey,
                    title: product.title,
                    brandName: product.brandName || null,
                    category: product.category?.name || null,
                    categoryId: product.categoryId || null,
                    image: this.selectBestImage(product.images || (product.image ? [product.image] : null)),
                    minPrice: effectivePrice,
                    maxPrice: effectivePrice,
                    vendorCount: 1,
                    bestOffer: {
                        productId: product.id,
                        vendorId: product.vendorId,
                        vendorName: product.vendor?.storeName || product.vendor?.name || 'Unknown',
                        price: product.price,
                        offerPrice: product.offerPrice || null,
                        stock: product.stock
                    }
                });
            } else {
                // Update existing group
                const group = groupMap.get(groupKey)!;
                const effectivePrice = product.offerPrice ?? product.price;
                
                // Update price range
                group.minPrice = Math.min(group.minPrice, effectivePrice);
                group.maxPrice = Math.max(group.maxPrice, effectivePrice);
                group.vendorCount += 1;
                
                // Update best offer (lowest effective price)
                if (!group.bestOffer || effectivePrice < (group.bestOffer.offerPrice ?? group.bestOffer.price)) {
                    group.bestOffer = {
                        productId: product.id,
                        vendorId: product.vendorId,
                        vendorName: product.vendor?.storeName || product.vendor?.name || 'Unknown',
                        price: product.price,
                        offerPrice: product.offerPrice || null,
                        stock: product.stock
                    };
                }
            }
        }
        
        return {
            items: Array.from(groupMap.values()),
            meta: {
                total: groupMap.size,
                grouped: true
            }
        };
    }
    
    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371; // Earth's radius in km
        const toRad = (deg: number) => deg * (Math.PI / 180);
        
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c;
    }
}
