import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, ReportReviewDto } from './dto/review.dto';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    create(req: any, productId: string, dto: CreateReviewDto): Promise<{
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
    findAll(productId: string, page?: number, limit?: number): Promise<{
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
    update(req: any, id: string, dto: UpdateReviewDto): Promise<{
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
    remove(req: any, id: string): Promise<{
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
    voteHelpful(req: any, id: string): Promise<{
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
    report(req: any, id: string, dto: ReportReviewDto): Promise<{
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
