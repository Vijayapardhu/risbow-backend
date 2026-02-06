import { Injectable, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

export interface UploadedFileInfo {
    filename: string;
    originalName: string;
    path: string;
    size: number;
    mimetype: string;
    url: string;
}

@Injectable()
export class FileUploadService {
    private readonly uploadDir = path.join(process.cwd(), 'uploads', 'vendor-documents');
    private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
    private readonly allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/pdf'
    ];

    constructor() {
        this.ensureUploadDir();
    }

    private async ensureUploadDir() {
        try {
            await fs.access(this.uploadDir);
        } catch {
            await fs.mkdir(this.uploadDir, { recursive: true });
        }
    }

    /**
     * Validate uploaded file
     */
    validateFile(file: Express.Multer.File): void {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        if (file.size > this.maxFileSize) {
            throw new BadRequestException(
                `File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`
            );
        }

        if (!this.allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`
            );
        }
    }

    /**
     * Save uploaded file to disk
     */
    async saveFile(file: Express.Multer.File, subfolder?: string): Promise<UploadedFileInfo> {
        this.validateFile(file);

        const fileExtension = path.extname(file.originalname);
        const randomName = randomBytes(16).toString('hex');
        const filename = `${randomName}${fileExtension}`;

        const targetDir = subfolder
            ? path.join(this.uploadDir, subfolder)
            : this.uploadDir;

        // Ensure subfolder exists
        try {
            await fs.access(targetDir);
        } catch {
            await fs.mkdir(targetDir, { recursive: true });
        }

        const filePath = path.join(targetDir, filename);
        await fs.writeFile(filePath, file.buffer);

        const relativePath = subfolder
            ? path.join('vendor-documents', subfolder, filename)
            : path.join('vendor-documents', filename);

        return {
            filename,
            originalName: file.originalname,
            path: relativePath,
            size: file.size,
            mimetype: file.mimetype,
            url: `/uploads/${relativePath.replace(/\\/g, '/')}`
        };
    }

    /**
     * Delete file from disk
     */
    async deleteFile(filePath: string): Promise<void> {
        try {
            const fullPath = path.join(process.cwd(), 'uploads', filePath);
            await fs.unlink(fullPath);
        } catch (error) {
            console.error(`Failed to delete file: ${filePath}`, error);
        }
    }

    /**
     * Save multiple files
     */
    async saveFiles(
        files: Express.Multer.File[],
        subfolder?: string
    ): Promise<UploadedFileInfo[]> {
        const uploadPromises = files.map(file => this.saveFile(file, subfolder));
        return Promise.all(uploadPromises);
    }
}
