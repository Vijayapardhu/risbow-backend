export declare enum UploadContext {
    PRODUCT = "products",
    VENDOR = "vendors",
    BANNER = "banners"
}
export declare enum DocumentType {
    KYC = "KYC",
    RETURN_PROOF = "RETURN_PROOF",
    OTHER = "OTHER"
}
export declare class SingleImageUploadDto {
    context: UploadContext;
    contextId: string;
}
export declare class MultipleImageUploadDto {
    context: UploadContext;
    contextId: string;
}
export declare class DocumentUploadDto {
    documentType: DocumentType;
}
