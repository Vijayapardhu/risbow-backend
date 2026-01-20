export declare class CreateReviewDto {
    rating: number;
    comment?: string;
    images?: string[];
}
export declare class UpdateReviewDto {
    rating?: number;
    comment?: string;
}
export declare class ReportReviewDto {
    reason: string;
    details?: string;
}
