import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

export interface VisualSearchResult {
  productId: string;
  title: string;
  price: number;
  images: string[];
  category?: string;
  confidence: number;
  similarity: number;
}

export interface VisualSearchOptions {
  includeSimilar?: boolean;
  categoryFilter?: string;
  priceRange?: { min: number; max: number };
  maxResults?: number;
}

@Injectable()
export class BowVisualSearchService {
  private readonly logger = new Logger(BowVisualSearchService.name);
  private openaiClient: any;

  constructor(private prisma: PrismaService) {
    this.initializeOpenAI();
  }

  private async initializeOpenAI(): Promise<void> {
    try {
      // Initialize OpenAI for vision analysis via REST API
      this.openaiClient = {
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: 'https://api.openai.com/v1'
      };
      this.logger.log('OpenAI client initialized for visual search');
    } catch (error) {
      this.logger.error(`Failed to initialize OpenAI: ${error.message}`);
    }
  }

  /**
   * Search products by image using AI analysis
   */
  async searchByImage(
    imageBuffer: Buffer,
    options: VisualSearchOptions = { maxResults: 10 }
  ): Promise<VisualSearchResult[]> {
    try {
      this.logger.log('Processing visual search request');

      // Step 1: Analyze image with AI
      const imageAnalysis = await this.analyzeImage(imageBuffer);
      
      if (!imageAnalysis) {
        throw new Error('Could not analyze image');
      }

      this.logger.log(`Image analysis: ${JSON.stringify(imageAnalysis)}`);

      // Step 2: Extract search terms from analysis
      const searchTerms = this.extractSearchTerms(imageAnalysis);

      // Step 3: Search products using extracted terms
      const products = await this.searchProductsByTerms(searchTerms, options);

      // Step 4: Rank and filter results
      const rankedResults = await this.rankProductsByImageSimilarity(
        products,
        imageAnalysis,
        options
      );

      return rankedResults;

    } catch (error) {
      this.logger.error(`Visual search error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Analyze image using OpenAI Vision API
   */
  private async analyzeImage(imageBuffer: Buffer): Promise<any> {
    try {
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this product image and provide:
1. Main product category (e.g., "shoes", "shirt", "electronics")
2. Key features and attributes (color, style, material, brand if visible)
3. Product type and use case
4. Suggested search keywords
5. Confidence level (1-10)

Respond in JSON format like:
{
  "category": "shoes",
  "features": ["black", "running", "synthetic", "sport"],
  "type": "athletic footwear", 
  "useCase": "running/sports",
  "keywords": ["black running shoes", "athletic footwear", "sports shoes"],
  "confidence": 8
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiClient.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const analysisText = response.data.choices[0].message.content;
      
      // Try to parse as JSON
      try {
        return JSON.parse(analysisText);
      } catch {
        // Fallback: extract information manually
        return this.parseAnalysisText(analysisText);
      }

    } catch (error) {
      this.logger.error(`Image analysis error: ${error.message}`);
      
      // Fallback to basic analysis
      return {
        category: 'unknown',
        features: [],
        type: 'product',
        useCase: 'general',
        keywords: ['product'],
        confidence: 3
      };
    }
  }

  /**
   * Extract search terms from AI analysis
   */
  private extractSearchTerms(analysis: any): string[] {
    const terms: string[] = [];

    if (analysis.category) {
      terms.push(analysis.category);
    }
    
    if (analysis.keywords && Array.isArray(analysis.keywords)) {
      terms.push(...analysis.keywords);
    }
    
    if (analysis.features && Array.isArray(analysis.features)) {
      const featureTerms = analysis.features.map((f: string) => `${analysis.category} ${f}`);
      terms.push(...featureTerms);
    }
    
    if (analysis.type) {
      terms.push(analysis.type);
    }

    // Remove duplicates and empty strings
    return [...new Set(terms.filter(term => term && term.trim().length > 0))];
  }

  /**
   * Search products by extracted terms
   */
  private async searchProductsByTerms(
    terms: string[],
    options: VisualSearchOptions
  ): Promise<any[]> {
    if (terms.length === 0) {
      return [];
    }

    // Build Prisma query with OR conditions for each term
    const searchConditions = terms.flatMap(term => [
      { title: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { category: { name: { contains: term, mode: 'insensitive' } } }
    ]);

    const whereClause: any = {
      isActive: true,
      stock: { gt: 0 },
      OR: searchConditions
    };

    // Apply filters
    if (options.categoryFilter) {
      whereClause.category = { name: { contains: options.categoryFilter, mode: 'insensitive' } };
    }

    if (options.priceRange) {
      whereClause.AND = [
        {
          OR: [
            { price: { gte: options.priceRange.min, lte: options.priceRange.max } },
            { offerPrice: { gte: options.priceRange.min, lte: options.priceRange.max } }
          ]
        }
      ];
    }

    const products = await this.prisma.product.findMany({
      where: whereClause,
      take: options.maxResults || 20,
      include: {
        category: { select: { name: true } }
      }
    });

    return products;
  }

  /**
   * Rank products by similarity to image
   */
  private async rankProductsByImageSimilarity(
    products: any[],
    imageAnalysis: any,
    options: VisualSearchOptions
  ): Promise<VisualSearchResult[]> {
    const results: VisualSearchResult[] = [];

    for (const product of products) {
      // Calculate similarity score based on multiple factors
      let similarityScore = 0;
      const productText = `${product.title} ${product.description || ''}`.toLowerCase();

      // Category match (highest weight)
      if (imageAnalysis.category) {
        const categoryMatch = productText.includes(imageAnalysis.category.toLowerCase());
        if (categoryMatch) {
          similarityScore += 30;
        }
      }

      // Features match
      if (imageAnalysis.features && Array.isArray(imageAnalysis.features)) {
        for (const feature of imageAnalysis.features) {
          if (productText.includes(feature.toLowerCase())) {
            similarityScore += 15;
          }
        }
      }

      // Keywords match
      if (imageAnalysis.keywords && Array.isArray(imageAnalysis.keywords)) {
        for (const keyword of imageAnalysis.keywords) {
          if (productText.includes(keyword.toLowerCase())) {
            similarityScore += 10;
          }
        }
      }

      // Price similarity (if we can estimate price from image)
      const productPrice = product.offerPrice || product.price;
      if (imageAnalysis.estimatedPrice) {
        const priceDiff = Math.abs(productPrice - imageAnalysis.estimatedPrice);
        const priceSimilarity = Math.max(0, 20 - (priceDiff / 100));
        similarityScore += priceSimilarity;
      }

      // Normalize score to 0-1 range
      const normalizedScore = Math.min(1, similarityScore / 100);

      results.push({
        productId: product.id,
        title: product.title,
        price: product.offerPrice || product.price,
        images: product.images,
        category: product.category?.name,
        confidence: imageAnalysis.confidence || 5,
        similarity: normalizedScore
      });
    }

    // Sort by similarity and confidence
    results.sort((a, b) => {
      const scoreA = a.similarity * a.confidence;
      const scoreB = b.similarity * b.confidence;
      return scoreB - scoreA;
    });

    // Return top results
    return results.slice(0, options.maxResults || 10);
  }

  /**
   * Find visually similar products
   */
  async findSimilarProducts(
    productId: string,
    options: VisualSearchOptions = { maxResults: 5 }
  ): Promise<VisualSearchResult[]> {
    try {
      // Get reference product
      const referenceProduct = await this.prisma.product.findUnique({
        where: { id: productId },
        include: { Category: { select: { name: true } } }
      });

      if (!referenceProduct) {
        throw new Error('Reference product not found');
      }

      // Find similar products based on category and attributes
      const similarProducts = await this.prisma.product.findMany({
        where: {
          id: { not: productId },
          categoryId: referenceProduct.categoryId,
          isActive: true,
          stock: { gt: 0 },
          OR: [
            { title: { contains: referenceProduct.title.split(' ')[0], mode: 'insensitive' } },
            { description: { contains: referenceProduct.title.split(' ')[0], mode: 'insensitive' } }
          ]
        },
        take: options.maxResults || 5,
        include: { Category: { select: { name: true } } }
      });

      return similarProducts.map(product => ({
        productId: product.id,
        title: product.title,
        price: product.offerPrice || product.price,
        images: product.images,
        category: product.category?.name,
        confidence: 8, // High confidence for similar products
        similarity: 0.8 // High similarity for same category
      }));

    } catch (error) {
      this.logger.error(`Similar products error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get visual search analytics
   */
  async getVisualSearchStats(): Promise<any> {
    try {
      // Query audit logs for visual search events
      const searchLogs = await this.prisma.auditLog.findMany({
        where: {
          action: 'VISUAL_SEARCH',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        },
        take: 1000
      });

      // Parse analytics from logs
      const categoryCount = new Map<string, number>();
      let totalConfidence = 0;
      let successfulMatches = 0;

      for (const log of searchLogs) {
        try {
          const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
          if (details?.category) {
            categoryCount.set(details.category, (categoryCount.get(details.category) || 0) + 1);
          }
          if (details?.confidence) {
            totalConfidence += details.confidence;
          }
          if (details?.matchCount > 0) {
            successfulMatches++;
          }
        } catch {
          continue;
        }
      }

      const topCategories = Array.from(categoryCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));

      return {
        totalSearches: searchLogs.length,
        averageConfidence: searchLogs.length > 0 ? totalConfidence / searchLogs.length : 0,
        topCategories,
        successfulMatches
      };
    } catch (error) {
      this.logger.warn(`Failed to get visual search stats: ${error.message}`);
      return {
        totalSearches: 0,
        averageConfidence: 0,
        topCategories: [],
        successfulMatches: 0
      };
    }
  }

  /**
   * Fallback text parser for AI analysis
   */
  private parseAnalysisText(text: string): any {
    const analysis: any = {
      category: 'unknown',
      features: [],
      type: 'product',
      useCase: 'general',
      keywords: ['product'],
      confidence: 3
    };

    // Try to extract category
    const categoryMatch = text.match(/category["':]\s*["']?([^"',\n]+)/i);
    if (categoryMatch) {
      analysis.category = categoryMatch[1].trim();
    }

    // Try to extract features
    const featuresMatch = text.match(/features["':]\s*\[([^\]]+)\]/i);
    if (featuresMatch) {
      analysis.features = featuresMatch[1]
        .split(',')
        .map((f: string) => f.replace(/["']/g, '').trim())
        .filter((f: string) => f.length > 0);
    }

    // Try to extract keywords
    const keywordsMatch = text.match(/keywords["':]\s*\[([^\]]+)\]/i);
    if (keywordsMatch) {
      analysis.keywords = keywordsMatch[1]
        .split(',')
        .map((k: string) => k.replace(/["']/g, '').trim())
        .filter((k: string) => k.length > 0);
    }

    // Try to extract confidence
    const confidenceMatch = text.match(/confidence["':]\s*(\d+)/i);
    if (confidenceMatch) {
      analysis.confidence = parseInt(confidenceMatch[1]);
    }

    return analysis;
  }

  /**
   * Check if visual search is properly configured
   */
  async isVisualSearchReady(): Promise<{ ready: boolean; issues: string[] }> {
    const issues: string[] = [];

    if (!process.env.OPENAI_API_KEY) {
      issues.push('OpenAI API key not configured');
    }

    if (!this.openaiClient) {
      issues.push('OpenAI client not initialized');
    }

    return {
      ready: issues.length === 0,
      issues
    };
  }
}