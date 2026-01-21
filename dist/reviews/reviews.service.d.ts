import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto, ReportReviewDto } from './dto/review.dto';
import { CacheService } from '../shared/cache.service';
export declare class ReviewsService {
    private prisma;
    private cache;
    constructor(prisma: PrismaService, cache: CacheService);
    create(userId: string, productId: string, dto: CreateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        helpfulCount: number;
        comment: string | null;
        isVerified: boolean;
    }>;
    findAllByProduct(productId: string, page?: number, limit?: number): Promise<{
        data: ({
            user: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            status: string;
            updatedAt: Date;
            userId: string;
            productId: string | null;
            vendorId: string | null;
            images: string[];
            rating: number;
            helpfulCount: number;
            comment: string | null;
            isVerified: boolean;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getVendorReviews(vendorId: string): Promise<{
        vendorId: string;
        averageRating: number;
        totalReviews: number;
    }>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        helpfulCount: number;
        comment: string | null;
        isVerified: boolean;
    }>;
    update(userId: string, id: string, dto: UpdateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        helpfulCount: number;
        comment: string | null;
        isVerified: boolean;
    }>;
    remove(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        helpfulCount: number;
        comment: string | null;
        isVerified: boolean;
    }>;
    voteHelpful(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        helpfulCount: number;
        comment: string | null;
        isVerified: boolean;
    }>;
    report(userId: string, id: string, dto: ReportReviewDto): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        helpfulCount: number;
        comment: string | null;
        isVerified: boolean;
    }>;
}
