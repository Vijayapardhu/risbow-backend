import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorBowCoinLedgerService {
  private readonly logger = new Logger(VendorBowCoinLedgerService.name);

  constructor(private prisma: PrismaService) {}

  async creditVendorCoins(
    vendorId: string,
    coinsDelta: number,
    sourceType: string,
    sourceId?: string,
    tx?: any,
  ) {
    const execute = async (db: any) => {
      // Calculate balanceAfter from previous ledger entries
      const previousEntries = await db.vendorBowCoinLedger.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      const previousBalance = previousEntries.length > 0 
        ? previousEntries[0].balanceAfter 
        : 0;

      const balanceAfter = previousBalance + coinsDelta;

      // Create VendorBowCoinLedger entry
      const ledgerEntry = await db.vendorBowCoinLedger.create({
        data: {
          vendorId,
          sourceType,
          sourceId,
          coinsDelta,
          balanceAfter,
        },
      });

      // NO direct balance update on Vendor model (ledger-only)
      return ledgerEntry;
    };

    if (tx) {
      return execute(tx);
    } else {
      return this.prisma.$transaction(execute);
    }
  }

  async debitVendorCoins(
    vendorId: string,
    coinsDelta: number,
    sourceType: string,
    sourceId?: string,
    tx?: any,
  ) {
    // Ensure coinsDelta is negative for debit
    const actualDelta = coinsDelta > 0 ? -coinsDelta : coinsDelta;
    return this.creditVendorCoins(vendorId, actualDelta, sourceType, sourceId, tx);
  }

  async getVendorBalance(vendorId: string): Promise<number> {
    // Sum all ledger entries for vendor
    const latestEntry = await this.prisma.vendorBowCoinLedger.findFirst({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });

    return latestEntry?.balanceAfter || 0;
  }

  async getVendorLedger(vendorId: string, limit = 100) {
    return this.prisma.vendorBowCoinLedger.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
