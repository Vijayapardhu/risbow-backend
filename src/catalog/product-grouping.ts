import { Prisma } from '@prisma/client';

const base64UrlEncode = (input: string) => {
    return Buffer.from(input, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
};

const base64UrlDecode = (input: string) => {
    const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf8');
};

export const normalizeForGroupKey = (value: string | null | undefined) => {
    return (value ?? '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

export const tokenize = (value: string | null | undefined) => {
    const normalized = normalizeForGroupKey(value);
    if (!normalized) return [];
    return normalized.split(' ').filter(t => t.length >= 2);
};

export type ParsedGroupKey =
    | { type: 'barcode'; barcode: string }
    | { type: 'normalized'; categoryId: string; titleNorm: string; brandNorm: string };

export const makeGroupKeyFromProduct = (product: {
    barcode?: string | null;
    categoryId?: string | null;
    title?: string | null;
    brandName?: string | null;
}) => {
    const barcode = (product.barcode ?? '').trim();
    if (barcode) return `b:${barcode}`;

    const payload = {
        c: product.categoryId ?? '',
        t: normalizeForGroupKey(product.title),
        b: normalizeForGroupKey(product.brandName),
    };

    return `n:${base64UrlEncode(JSON.stringify(payload))}`;
};

export const parseGroupKey = (groupKey: string): ParsedGroupKey => {
    if (groupKey.startsWith('b:')) {
        return { type: 'barcode', barcode: groupKey.slice(2) };
    }
    if (groupKey.startsWith('n:')) {
        const raw = base64UrlDecode(groupKey.slice(2));
        const parsed = JSON.parse(raw) as { c?: string; t?: string; b?: string };
        return {
            type: 'normalized',
            categoryId: parsed.c ?? '',
            titleNorm: parsed.t ?? '',
            brandNorm: parsed.b ?? '',
        };
    }
    return { type: 'barcode', barcode: groupKey };
};

export const pickBestImage = (images: Array<string | null | undefined> | null | undefined) => {
    if (!images || images.length === 0) return null;
    for (const img of images) {
        const v = (img ?? '').trim();
        if (v) return v;
    }
    return null;
};

export const effectivePrice = (price: number, offerPrice?: number | null) => {
    return offerPrice !== null && offerPrice !== undefined ? offerPrice : price;
};

export const buildWhereForGroupKey = (
    groupKey: ParsedGroupKey,
    baseWhere: Prisma.ProductWhereInput
): Prisma.ProductWhereInput => {
    if (groupKey.type === 'barcode') {
        return {
            ...baseWhere,
            barcode: groupKey.barcode,
        };
    }

    const titleTokens = tokenize(groupKey.titleNorm);
    const brandTokens = tokenize(groupKey.brandNorm);

    const and: Prisma.ProductWhereInput[] = [];
    if (groupKey.categoryId) and.push({ categoryId: groupKey.categoryId });

    for (const token of titleTokens) {
        and.push({ title: { contains: token, mode: 'insensitive' } });
    }
    for (const token of brandTokens) {
        and.push({ brandName: { contains: token, mode: 'insensitive' } });
    }

    return {
        ...baseWhere,
        AND: [...(baseWhere.AND ? (Array.isArray(baseWhere.AND) ? baseWhere.AND : [baseWhere.AND]) : []), ...and],
    };
};

