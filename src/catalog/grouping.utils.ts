import { randomUUID } from 'crypto';

export interface GroupableProduct {
    barcode?: string | null;
    title?: string;
    brandName?: string | null;
    categoryId?: string | null;
    images?: string[] | null;
    image?: string | null;
}

export function normalizeForGrouping(text: string): string {
    if (!text) return '';
    return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');
}

export function computeGroupKey(product: GroupableProduct): string {
    if (product.barcode) {
        return `barcode:${product.barcode}`;
    }
    
    const parts = [
        normalizeForGrouping(product.title || ''),
        normalizeForGrouping(product.brandName || ''),
        product.categoryId || ''
    ].filter(Boolean);
    
    if (parts.length === 0) {
        return `unknown:${randomUUID()}`;
    }
    
    return `norm:${parts.join(':')}`;
}

export function parseGroupKey(groupKey: string): { type: 'barcode' | 'norm' | 'unknown'; value: string } {
    if (groupKey.startsWith('barcode:')) {
        return { type: 'barcode', value: groupKey.replace('barcode:', '') };
    }
    if (groupKey.startsWith('norm:')) {
        return { type: 'norm', value: groupKey.replace('norm:', '') };
    }
    return { type: 'unknown', value: groupKey };
}

export function pickBestImage(products: GroupableProduct[]): string | null {
    if (!products || products.length === 0) {
        return null;
    }
    
    const allImages: string[] = [];
    for (const product of products) {
        if (product.images && product.images.length > 0) {
            allImages.push(...product.images);
        } else if (product.image) {
            allImages.push(product.image);
        }
    }
    
    if (allImages.length === 0) {
        return null;
    }
    
    const validImages = allImages.filter(img => 
        img && !img.includes('placeholder') && !img.includes('via.placeholder.com')
    );
    
    return validImages.length > 0 ? validImages[0] : allImages[0];
}

export function buildBarcodeWhereClause(barcode: string): { barcode: string } {
    return { barcode };
}

export function buildNormalizedWhereClause(
    normalizedTitle: string,
    normalizedBrand: string,
    categoryId: string
): { AND: Array<{ OR?: Array<{ title?: { contains: string; mode: 'insensitive' }; brandName?: { contains: string; mode: 'insensitive' } }>; categoryId?: string }> } {
    const conditions: Array<{ OR?: Array<{ title?: { contains: string; mode: 'insensitive' }; brandName?: { contains: string; mode: 'insensitive' } }>; categoryId?: string }> = [];
    
    if (categoryId) {
        conditions.push({ categoryId });
    }
    
    if (normalizedTitle || normalizedBrand) {
        const orConditions: Array<{ title?: { contains: string; mode: 'insensitive' }; brandName?: { contains: string; mode: 'insensitive' } }> = [];
        
        if (normalizedTitle) {
            orConditions.push({ title: { contains: normalizedTitle, mode: 'insensitive' } });
        }
        if (normalizedBrand) {
            orConditions.push({ brandName: { contains: normalizedBrand, mode: 'insensitive' } });
        }
        
        conditions.push({ OR: orConditions });
    }
    
    return { AND: conditions };
}
