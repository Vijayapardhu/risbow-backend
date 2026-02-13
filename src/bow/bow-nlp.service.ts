import { Injectable, Logger } from '@nestjs/common';

export interface ParsedQuery {
    action: string;
    items: string[];
    quantity: number;
    priceFilter?: { min?: number; max?: number; exact?: number };
    sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
    brand?: string;
    category?: string;
    color?: string;
}

@Injectable()
export class BowNLPService {
    private readonly logger = new Logger(BowNLPService.name);

    // Product synonym mapping
    private synonyms = {
        'mobile': ['phone', 'smartphone', 'cellphone', 'handset', 'iphone', 'android', 'samsung'],
        'tv': ['television', 'smart tv', 'led tv'],
        'sofa': ['couch', 'settee', 'divan'],
        'laptop': ['notebook', 'computer', 'macbook', 'dell', 'hp'],
        'earphones': ['headphones', 'earbuds', 'buds', 'headset', 'airpods'],
        'shirt': ['tshirt', 't-shirt', 'top', 'polo'],
        'shoes': ['footwear', 'sneakers', 'sandals', 'nike', 'adidas'],
        'furniture': ['furnishing', 'home decor', 'chair', 'table'],
        'jeans': ['denim', 'pants', 'trousers'],
        'dress': ['gown', 'frock'],
        'serum': ['cream', 'lotion', 'moisturizer'],
        'lipstick': ['makeup', 'gloss']
    };

    // Keyword to Category mapping
    private categoryMapping = {
        'iphone': 'Mobiles',
        'mobile': 'Mobiles',
        'phone': 'Mobiles',
        'smartphone': 'Mobiles',
        'samsung': 'Mobiles',
        'android': 'Mobiles',
        'macbook': 'Laptops',
        'laptop': 'Laptops',
        'computer': 'Laptops',
        'shirt': 'Fashion',
        'tshirt': 'Fashion',
        'jeans': 'Fashion',
        'dress': 'Fashion',
        'shoes': 'Fashion',
        'saree': 'Fashion',
        'kurta': 'Fashion',
        'buds': 'Audio',
        'headphone': 'Audio',
        'earphone': 'Audio',
        'speaker': 'Audio',
        'sofa': 'Home & Living',
        'chair': 'Home & Living',
        'furniture': 'Home & Living',
        'lipstick': 'Beauty',
        'makeup': 'Beauty',
        'serum': 'Beauty',
        'skincare': 'Beauty'
    };

    mapKeywordToCategory(text: string): string | null {
        const words = text.toLowerCase().split(/\s+/);
        for (const word of words) {
            // Check direct mapping
            if ((this.categoryMapping as Record<string, string>)[word]) {
                return (this.categoryMapping as Record<string, string>)[word];
            }
            // Check synonyms
            for (const [key, synonyms] of Object.entries(this.synonyms)) {
                if ((synonyms as string[]).includes(word) && (this.categoryMapping as Record<string, string>)[key]) {
                    return (this.categoryMapping as Record<string, string>)[key];
                }
            }
        }
        return null;
    }

    // Sentiment patterns
    private sentimentPatterns = {
        frustrated: [
            'not working', 'doesn\'t work', 'frustrated', 'annoyed',
            'useless', 'terrible', 'awful', 'hate', 'worst',
            'give up', 'forget it', 'whatever', 'never mind'
        ],
        negative: [
            'no', 'don\'t', 'stop', 'wrong', 'error', 'problem',
            'issue', 'bad', 'poor', 'disappointing'
        ],
        positive: [
            'great', 'awesome', 'perfect', 'excellent', 'love',
            'amazing', 'wonderful', 'fantastic', 'thank', 'thanks'
        ]
    };

    parseQuantity(text: string): number {
        const patterns = [
            /(\d+)\s*(items?|pieces?|pcs)/i,
            /add\s+(\d+)/i,
            /(\d+)\s+of/i,
            /(one|two|three|four|five|six|seven|eight|nine|ten)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const num = match[1];
                // Convert word numbers to digits
                const wordToNum: any = {
                    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
                };
                return wordToNum[num.toLowerCase()] || parseInt(num, 10);
            }
        }

        return 1; // Default quantity
    }

    parsePriceFilter(text: string): ParsedQuery['priceFilter'] | undefined {
        const patterns = {
            range: /(?:between|from)\s*₹?\s*(\d+)\s*(?:to|and|-)\s*₹?\s*(\d+)/i,
            under: /(?:under|below|less than|cheaper than)\s*₹?\s*(\d+)/i,
            over: /(?:over|above|more than|expensive than)\s*₹?\s*(\d+)/i,
            exact: /(?:at|exactly|around)\s*₹?\s*(\d+)/i
        };

        let match;

        if (match = text.match(patterns.range)) {
            return { min: parseInt(match[1]), max: parseInt(match[2]) };
        }

        if (match = text.match(patterns.under)) {
            return { max: parseInt(match[1]) };
        }

        if (match = text.match(patterns.over)) {
            return { min: parseInt(match[1]) };
        }

        if (match = text.match(patterns.exact)) {
            const price = parseInt(match[1]);
            return { min: price - 100, max: price + 100 }; // ±100 range
        }

        return undefined;
    }

    parseSortPreference(text: string): ParsedQuery['sortBy'] | undefined {
        if (/cheapest|lowest price|sort.*(price|low)/i.test(text)) {
            return 'price_asc';
        }

        if (/most expensive|highest price|premium|luxury/i.test(text)) {
            return 'price_desc';
        }

        if (/newest|latest|new arrivals|recent/i.test(text)) {
            return 'newest';
        }

        if (/popular|trending|best seller|top/i.test(text)) {
            return 'popular';
        }

        return undefined;
    }

    expandQueryWithSynonyms(query: string): string[] {
        const queries = [query.toLowerCase()];
        const words = query.toLowerCase().split(/\s+/);

        // Check each word against synonyms
        for (const [primary, synonymList] of Object.entries(this.synonyms)) {
            for (const word of words) {
                if (synonymList.includes(word) || word === primary) {
                    // Add query with primary term
                    queries.push(query.replace(new RegExp(word, 'gi'), primary));
                    // Add all synonym variations
                    synonymList.forEach(syn => {
                        if (syn !== word) {
                            queries.push(query.replace(new RegExp(word, 'gi'), syn));
                        }
                    });
                }
            }
        }

        return [...new Set(queries)]; // Remove duplicates
    }

    detectSentiment(text: string): 'positive' | 'neutral' | 'negative' | 'frustrated' {
        const lowerText = text.toLowerCase();

        // Check frustrated patterns first (most specific)
        if (this.sentimentPatterns.frustrated.some(pattern => lowerText.includes(pattern))) {
            return 'frustrated';
        }

        // Count positive and negative words
        const positiveCount = this.sentimentPatterns.positive.filter(pattern =>
            lowerText.includes(pattern)
        ).length;

        const negativeCount = this.sentimentPatterns.negative.filter(pattern =>
            lowerText.includes(pattern)
        ).length;

        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    extractBrand(text: string): string | undefined {
        const brandPattern = /\b(samsung|apple|nike|adidas|sony|lg|mi|oneplus|realme|vivo|oppo)\b/i;
        const match = text.match(brandPattern);
        return match ? match[1] : undefined;
    }

    extractColor(text: string): string | undefined {
        const colorPattern = /\b(red|blue|green|yellow|black|white|grey|gray|pink|purple|orange|brown|gold|silver)\b/i;
        const match = text.match(colorPattern);
        return match ? match[1] : undefined;
    }

    parseAdvancedQuery(text: string): ParsedQuery {
        return {
            action: this.extractAction(text),
            items: this.extractItems(text),
            quantity: this.parseQuantity(text),
            priceFilter: this.parsePriceFilter(text),
            sortBy: this.parseSortPreference(text),
            brand: this.extractBrand(text),
            color: this.extractColor(text)
        };
    }

    private extractAction(text: string): string {
        if (/add|buy|purchase|get/i.test(text)) return 'add';
        if (/remove|delete/i.test(text)) return 'remove';
        if (/show|find|search|display/i.test(text)) return 'search';
        if (/compare/i.test(text)) return 'compare';
        return 'chat';
    }

    private extractItems(text: string): string[] {
        // Remove common words and extract potential product names
        const words = text.toLowerCase()
            .replace(/\b(add|buy|show|me|the|a|an|to|my|cart|find|search|for)\b/gi, '')
            .trim()
            .split(/\s+/)
            .filter(w => w.length > 2);

        return words;
    }

    // Check if query is asking about cart analytics
    isCartAnalyticsQuery(text: string): boolean {
        return /how much|total|cost|price|save|savings|discount/i.test(text) &&
            /cart|order|checkout/i.test(text);
    }

    // Check if query is multi-item operation
    isMultiItemOperation(text: string): boolean {
        return /all|everything|multiple|several|few|bunch/i.test(text);
    }
}
