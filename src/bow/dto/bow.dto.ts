import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BowActionType } from '@prisma/client';

export class BowMessageDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiProperty({ required: false })
    @IsObject()
    @IsOptional()
    context?: any;
}

export class BowActionExecuteDto {
    @ApiProperty({ enum: BowActionType })
    @IsEnum(BowActionType)
    action: BowActionType;

    @ApiProperty()
    @IsObject()
    payload: any;
}

export interface BowIntent {
    intent: BowActionType | 'CHAT' | 'SEARCH' | 'UNKNOWN';
    confidence: number;
    entities: {
        productId?: string;
        variantId?: string;
        quantity?: number;
        query?: string;
        targetPage?: string;
        code?: string;
        itemId?: string;
    };
}

export interface BowActionProposal {
    type: BowActionType;
    label: string;
    requiresConfirmation: boolean;
    payload: any;
}

export interface BowResponse {
    message: string;
    actions?: BowActionProposal[];
    products?: {
        id: string;
        title: string;
        price: number;
        images?: string[];
        category?: { name: string };
    }[];
    metadata?: {
        aiInsights?: any;
        processedAt?: Date;
        nlpAnalysis?: {
            sentiment?: string;
            hasFilters?: boolean;
            expandedQueries?: string[];
        };
    };
}
