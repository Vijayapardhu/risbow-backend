import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

/**
 * Helper to get vendor ID from user ID
 * Vendors and Users are separate entities linked by mobile/email
 */
export async function getVendorIdFromUserId(
  prisma: PrismaService,
  userId: string,
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mobile: true, email: true, role: true },
  });

  if (!user) {
    throw new BadRequestException('User not found');
  }

  // If user role is VENDOR or WHOLESALER, find vendor by mobile/email
  if (user.role === 'VENDOR' || user.role === 'WHOLESALER') {
    const vendor = await prisma.vendor.findFirst({
      where: {
        OR: [
          { mobile: user.mobile },
          ...(user.email ? [{ email: user.email }] : []),
        ],
      },
      select: { id: true },
    });

    if (!vendor) {
      throw new BadRequestException('Vendor not found for this user');
    }

    return vendor.id;
  }

  throw new BadRequestException('User is not a vendor');
}
