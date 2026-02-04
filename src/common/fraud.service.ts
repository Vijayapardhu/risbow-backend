import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FraudService {
    private readonly logger = new Logger(FraudService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Checks if a user registration/login is potentially fraudulent.
     * Detects multiple accounts on the same device linking to the same referral.
     */
    async evaluateRisk(userId: string, deviceFingerprint?: string, ipAddress?: string) {
        if (!deviceFingerprint) return { score: 0, tag: 'LOW' };

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, referredBy: true, metadata: true }
        });

        // 1. Device Association Count
        const deviceUserCount = await (this.prisma as any).userDevice.count({
            where: { token: deviceFingerprint }
        });

        let riskScore = 0;

        // More than 2 accounts on one device is suspicious
        if (deviceUserCount > 2) riskScore += 40;
        if (deviceUserCount > 5) riskScore += 80;

        // 2. Referral Chain Exploitation
        if (user?.referredBy && deviceUserCount > 1) {
            // Check if other users on this device share the same referrer
            const siblingUsersOnDevice = await (this.prisma as any).userDevice.findMany({
                where: { token: deviceFingerprint, userId: { not: userId } },
                include: { User: { select: { referredBy: true } } }
            });

            const shareReferrer = siblingUsersOnDevice.some((d: any) => d.User.referredBy === user.referredBy);
            if (shareReferrer) {
                riskScore += 50; // High probability of referral farming
                this.logger.warn(`Potential referral abuse detected for User ${userId} on device ${deviceFingerprint}`);
            }
        }

        // 3. Status Tagging
        const tag = riskScore >= 80 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW';

        // Update user metadata with risk indicators
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                riskTag: tag,
                metadata: {
                    ...((user as any)?.metadata || {}),
                    riskScore,
                    riskTag: tag,
                    analyzedAt: new Date()
                }
            }
        });

        return { score: riskScore, tag };
    }

    /**
     * Blocks sensitive actions for high-risk users.
     */
    async validateAction(userId: string, actionType: 'REDEMPTION' | 'REFERRAL') {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const metadata = ((user as any)?.metadata as any) || {};

        if (metadata.riskTag === 'HIGH' && actionType === 'REDEMPTION') {
            throw new BadRequestException('Security verification required for coin redemption.');
        }
    }
}
