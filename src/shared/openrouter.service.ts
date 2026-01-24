import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class OpenRouterService {
    private readonly logger = new Logger(OpenRouterService.name);
    private readonly apiKey: string;
    private readonly baseUrl = 'https://openrouter.ai/api/v1';

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get('OPENROUTER_API_KEY');
    }

    /**
     * Generates an embedding for the given text using OpenRouter.
     * Uses a standard embedding model (e.g., text-embedding-3-small via OpenAI provider on OpenRouter).
     */
    async getEmbedding(text: string): Promise<number[]> {
        if (!this.apiKey) {
            this.logger.warn('OPENROUTER_API_KEY not configured; semantic search logic may fail');
            return [];
        }

        try {
            const response = await axios.post(
                `${this.baseUrl}/embeddings`,
                {
                    model: 'openai/text-embedding-3-small',
                    input: text.replace(/\n/g, ' '),
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return response.data.data[0].embedding;
        } catch (error) {
            this.logger.error(`Failed to generate embedding: ${error.message}`, error.stack);
            return [];
        }
    }

    /**
     * Minimal JSON-first chat completion helper (deterministic).
     * Returns parsed JSON or null on failure.
     */
    async chatJson<T>(args: {
        model: string;
        system: string;
        user: string;
        maxTokens?: number;
        timeoutMs?: number;
    }): Promise<T | null> {
        if (!this.apiKey) {
            this.logger.warn('OPENROUTER_API_KEY not configured; LLM features disabled');
            return null;
        }

        try {
            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
                    model: args.model,
                    temperature: 0,
                    max_tokens: args.maxTokens ?? 600,
                    response_format: { type: 'json_object' },
                    messages: [
                        { role: 'system', content: args.system },
                        { role: 'user', content: args.user },
                    ],
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: args.timeoutMs ?? 8000,
                }
            );

            const content = response?.data?.choices?.[0]?.message?.content;
            if (!content || typeof content !== 'string') return null;

            return JSON.parse(content) as T;
        } catch (error) {
            this.logger.error(`OpenRouter chatJson failed: ${error.message}`, error.stack);
            return null;
        }
    }
}
