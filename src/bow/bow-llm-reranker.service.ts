import { Injectable, Logger } from '@nestjs/common';
import { OpenRouterService } from '../shared/openrouter.service';
import { RedisService } from '../shared/redis.service';
import { createHash } from 'crypto';

type Candidate = {
  id: string;
  title: string;
  pricePaise: number;
  categoryId?: string | null;
  brandName?: string | null;
  reasons?: string[];
};

@Injectable()
export class BowLlmRerankerService {
  private readonly logger = new Logger(BowLlmRerankerService.name);
  // Default to a free OpenRouter model; override via env if needed.
  private readonly model =
    process.env.OPENROUTER_RERANK_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';

  constructor(private openrouter: OpenRouterService, private redis: RedisService) {}

  private hash(input: any) {
    return createHash('sha256').update(JSON.stringify(input)).digest('hex');
  }

  async rerank(userId: string, candidates: Candidate[]): Promise<string[] | null> {
    if (!candidates.length) return [];
    // Skip LLM cost/latency for tiny candidate lists
    if (candidates.length < 3) return candidates.map((c) => c.id);

    const cacheKey = `bow:rerank:v1:${userId}:${this.hash(candidates.map((c) => c.id))}`;
    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.rankedProductIds)) return parsed.rankedProductIds;
      } catch {
        // ignore
      }
    }

    const system = [
      'You are an ecommerce recommendation reranker for an Indian marketplace app.',
      'Goal: reorder products to maximize conversion while avoiding repeats and irrelevant items.',
      'Only output JSON. Do not add commentary.',
      'Do not invent IDs. Only use candidate IDs.',
    ].join('\n');

    const user = JSON.stringify(
      {
        userId,
        candidates: candidates.map((c) => ({
          id: c.id,
          title: c.title,
          priceRupees: Math.round(c.pricePaise / 100),
          categoryId: c.categoryId ?? null,
          brandName: c.brandName ?? null,
          reasons: c.reasons ?? [],
        })),
        outputSchema: {
          rankedProductIds: ['prod_1', 'prod_2'],
        },
      },
      null,
      2,
    );

    const result = await this.openrouter.chatJson<{ rankedProductIds: string[] }>({
      model: this.model,
      system,
      user,
      maxTokens: 250,
      timeoutMs: 8000,
    });

    if (!result?.rankedProductIds || !Array.isArray(result.rankedProductIds)) {
      return null;
    }

    // Safety: keep only known IDs, preserve order, fill missing deterministically.
    const known = new Set(candidates.map((c) => c.id));
    const out: string[] = [];
    for (const id of result.rankedProductIds) {
      const s = String(id);
      if (!known.has(s)) continue;
      if (out.includes(s)) continue;
      out.push(s);
    }
    for (const c of candidates) {
      if (!out.includes(c.id)) out.push(c.id);
    }

    // Cache longer for free models to reduce latency + rate pressure.
    await this.redis.set(cacheKey, JSON.stringify({ rankedProductIds: out }), 1800).catch(() => undefined);
    this.logger.debug(`Reranked ${candidates.length} candidates for user ${userId}`);
    return out;
  }
}

