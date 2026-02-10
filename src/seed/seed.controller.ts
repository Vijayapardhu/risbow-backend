import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Controller('seed')
export class SeedController {
    constructor(private prisma: PrismaService) { }

    @Post('admin-user')
    @HttpCode(HttpStatus.CREATED)
    async createAdminUser() {
        try {
            const hashedPassword = await bcrypt.hash('Admin@123', 10);

            // Use raw SQL to avoid schema mismatch
            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "AdminUser" (id, email, password, name, role, "isActive", "isMfaEnabled", "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid(),
          'admin@risbow.com',
          '${hashedPassword}',
          'Super Admin',
          'SUPER_ADMIN',
          true,
          false,
          NOW(),
          NOW()
        )
        ON CONFLICT (email) DO NOTHING
      `);

            return {
                success: true,
                message: 'Admin user created successfully',
                credentials: {
                    email: 'admin@risbow.com',
                    password: 'Admin@123',
                },
            };
        } catch (error) {
            return {
                success: false,
                message: 'Failed to create admin user',
                error: error.message,
            };
        }
    }
}
