import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReturnsQCService {
    private readonly logger = new Logger(ReturnsQCService.name);

    constructor(private prisma: PrismaService) { }

    async submitChecklist(dto: {
        orderId: string;
        agentId: string;
        isBrandBoxIntact: boolean;
        isProductIntact: boolean;
        missingAccessories: string[];
        images: string[];
        videoPath?: string;
        notes?: string;
    }) {
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
            include: { user: true } // items is a Json field, so it's always included in type, but 'user' relation needs include
        });

        if (!order) throw new BadRequestException('Order not found');

        // Identify vendor from first item (simplified)
        // In real world, returns might be split by vendor. Assuming 1 vendor per order or picking first.
        const items = (order.items as any[]) || [];
        const vendorId = items[0]?.vendorId;

        if (!vendorId) throw new BadRequestException('Vendor not found for order');

        // Logic to determine PASS/FAIL
        // Fail if product is damaged or brand box missing
        let status = 'PASSED';
        if (!dto.isProductIntact || !dto.isBrandBoxIntact) {
            status = 'FAILED';
        }

        const checklist = await this.prisma.returnQCChecklist.create({
            data: {
                orderId: dto.orderId,
                vendorId: vendorId,
                agentId: dto.agentId,
                isBrandBoxIntact: dto.isBrandBoxIntact,
                isProductIntact: dto.isProductIntact,
                missingAccessories: dto.missingAccessories,
                images: dto.images,
                videoPath: dto.videoPath,
                status,
                notes: dto.notes
            }
        });

        // Trigger updates based on QC status
        if (status === 'PASSED') {
            await this.prisma.order.update({
                where: { id: dto.orderId },
                data: { status: 'RETURN_RECEIVED' as any } // Moves to processing refund
            });
        } else {
            // QC Failed logic - Notify admin/vendor
            this.logger.warn(`Return QC Failed for Order ${dto.orderId}`);
        }

        return checklist;
    }
}
