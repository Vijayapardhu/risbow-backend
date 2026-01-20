import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto, ReportReviewDto } from './dto/review.dto';
export declare class ReviewsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, productId: string, dto: CreateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        comment: string | null;
        isVerified: boolean;
        helpfulCount: number;
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
            status: import(".prisma/client").$Enums.ReviewStatus;
            updatedAt: Date;
            userId: string;
            productId: string | null;
            vendorId: string | null;
            images: string[];
            rating: number;
            comment: string | null;
            isVerified: boolean;
            helpfulCount: number;
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
        status: import(".prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        comment: string | null;
        isVerified: boolean;
        helpfulCount: number;
    }>;
    update(userId: string, id: string, dto: UpdateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        comment: string | null;
        isVerified: boolean;
        helpfulCount: number;
    }>;
    remove(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        comment: string | null;
        isVerified: boolean;
        helpfulCount: number;
    }>;
    voteHelpful(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        comment: string | null;
        isVerified: boolean;
        helpfulCount: number;
    }>;
    report(userId: string, id: string, dto: ReportReviewDto): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        comment: string | null;
        isVerified: boolean;
        helpfulCount: number;
    }>;
}
