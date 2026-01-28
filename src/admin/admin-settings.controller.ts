import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin Settings')
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminSettingsController {
    constructor(private prisma: PrismaService) {}

    // General Settings
    @Get('general')
    @ApiOperation({ summary: 'Get general settings' })
    async getGeneralSettings() {
        const configs = await this.prisma.platformConfig.findMany({
            where: { key: { startsWith: 'general.' } },
        });
        const settings: any = {};
        configs.forEach((c) => {
            const key = c.key.replace('general.', '');
            try {
                settings[key] = JSON.parse(c.value);
            } catch {
                settings[key] = c.value;
            }
        });
        return settings;
    }

    @Patch('general')
    @ApiOperation({ summary: 'Update general settings' })
    async updateGeneralSettings(@Body() data: any) {
        const updates = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(
                this.prisma.platformConfig.upsert({
                    where: { key: `general.${key}` },
                    update: { value: typeof value === 'string' ? value : JSON.stringify(value) },
                    create: {
                        key: `general.${key}`,
                        value: typeof value === 'string' ? value : JSON.stringify(value),
                        description: `General setting: ${key}`,
                    },
                }),
            );
        }
        await Promise.all(updates);
        return { success: true };
    }

    // Verification Settings
    @Get('verification')
    @ApiOperation({ summary: 'Get verification settings' })
    async getVerificationSettings() {
        const configs = await this.prisma.platformConfig.findMany({
            where: { key: { startsWith: 'verification.' } },
        });
        const settings: any = {
            requireKyc: true,
            kycProvider: 'MANUAL',
            autoApprove: false,
            minDocuments: 2,
        };
        configs.forEach((c) => {
            const key = c.key.replace('verification.', '');
            try {
                settings[key] = JSON.parse(c.value);
            } catch {
                settings[key] = c.value === 'true' ? true : c.value === 'false' ? false : c.value;
            }
        });
        return settings;
    }

    @Patch('verification')
    @ApiOperation({ summary: 'Update verification settings' })
    async updateVerificationSettings(@Body() data: any) {
        const updates = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(
                this.prisma.platformConfig.upsert({
                    where: { key: `verification.${key}` },
                    update: { value: typeof value === 'string' ? value : JSON.stringify(value) },
                    create: {
                        key: `verification.${key}`,
                        value: typeof value === 'string' ? value : JSON.stringify(value),
                        description: `Verification setting: ${key}`,
                    },
                }),
            );
        }
        await Promise.all(updates);
        return { success: true };
    }

    // AI Settings
    @Get('ai')
    @ApiOperation({ summary: 'Get AI settings' })
    async getAISettings() {
        const configs = await this.prisma.platformConfig.findMany({
            where: { key: { startsWith: 'ai.' } },
        });
        const settings: any = {
            systemPrompt: '',
            productDescriptionPrompt: '',
            customerServicePrompt: '',
            apiKey: '',
            model: 'gpt-4',
            temperature: 0.7,
        };
        configs.forEach((c) => {
            const key = c.key.replace('ai.', '');
            try {
                settings[key] = JSON.parse(c.value);
            } catch {
                settings[key] = c.value;
            }
        });
        return settings;
    }

    @Patch('ai')
    @ApiOperation({ summary: 'Update AI settings' })
    async updateAISettings(@Body() data: any) {
        const updates = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(
                this.prisma.platformConfig.upsert({
                    where: { key: `ai.${key}` },
                    update: { value: typeof value === 'string' ? value : JSON.stringify(value) },
                    create: {
                        key: `ai.${key}`,
                        value: typeof value === 'string' ? value : JSON.stringify(value),
                        description: `AI setting: ${key}`,
                    },
                }),
            );
        }
        await Promise.all(updates);
        return { success: true };
    }

    // Theme Settings
    @Get('theme')
    @ApiOperation({ summary: 'Get theme settings' })
    async getThemeSettings() {
        const configs = await this.prisma.platformConfig.findMany({
            where: { key: { startsWith: 'theme.' } },
        });
        const settings: any = {
            primaryColor: '#3b82f6',
            secondaryColor: '#8b5cf6',
            accentColor: '#10b981',
            backgroundColor: '#ffffff',
            textColor: '#1f2937',
        };
        configs.forEach((c) => {
            const key = c.key.replace('theme.', '');
            settings[key] = c.value;
        });
        return settings;
    }

    @Patch('theme')
    @ApiOperation({ summary: 'Update theme settings' })
    async updateThemeSettings(@Body() data: any) {
        const updates = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(
                this.prisma.platformConfig.upsert({
                    where: { key: `theme.${key}` },
                    update: { value: String(value) },
                    create: {
                        key: `theme.${key}`,
                        value: String(value),
                        description: `Theme setting: ${key}`,
                    },
                }),
            );
        }
        await Promise.all(updates);
        return { success: true };
    }

    // Social Links Settings
    @Get('social')
    @ApiOperation({ summary: 'Get social links settings' })
    async getSocialSettings() {
        const configs = await this.prisma.platformConfig.findMany({
            where: { key: { startsWith: 'social.' } },
        });
        const settings: any = {
            facebook: '',
            twitter: '',
            instagram: '',
            linkedin: '',
            youtube: '',
            whatsapp: '',
        };
        configs.forEach((c) => {
            const key = c.key.replace('social.', '');
            settings[key] = c.value;
        });
        return settings;
    }

    @Patch('social')
    @ApiOperation({ summary: 'Update social links settings' })
    async updateSocialSettings(@Body() data: any) {
        const updates = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(
                this.prisma.platformConfig.upsert({
                    where: { key: `social.${key}` },
                    update: { value: String(value) },
                    create: {
                        key: `social.${key}`,
                        value: String(value),
                        description: `Social link: ${key}`,
                    },
                }),
            );
        }
        await Promise.all(updates);
        return { success: true };
    }

    // Ticket Issue Types Settings
    @Get('tickets')
    @ApiOperation({ summary: 'Get ticket issue types' })
    async getTicketSettings() {
        const config = await this.prisma.platformConfig.findUnique({
            where: { key: 'tickets.issueTypes' },
        });
        if (config) {
            try {
                return { types: JSON.parse(config.value) };
            } catch {
                return { types: config.value.split(',') };
            }
        }
        return { types: ['Order Issue', 'Payment Issue', 'Product Issue', 'Account Issue', 'Other'] };
    }

    @Patch('tickets')
    @ApiOperation({ summary: 'Update ticket issue types' })
    async updateTicketSettings(@Body() data: { types: string[] }) {
        await this.prisma.platformConfig.upsert({
            where: { key: 'tickets.issueTypes' },
            update: { value: JSON.stringify(data.types) },
            create: {
                key: 'tickets.issueTypes',
                value: JSON.stringify(data.types),
                description: 'Support ticket issue types',
            },
        });
        return { success: true };
    }

    // Main Settings Endpoint (for backward compatibility)
    @Get()
    @ApiOperation({ summary: 'Get all settings' })
    async getAllSettings() {
        const configs = await this.prisma.platformConfig.findMany();
        const settings: any = {};
        configs.forEach((c) => {
            const parts = c.key.split('.');
            let current = settings;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) current[parts[i]] = {};
                current = current[parts[i]];
            }
            try {
                current[parts[parts.length - 1]] = JSON.parse(c.value);
            } catch {
                current[parts[parts.length - 1]] = c.value;
            }
        });
        return settings;
    }

    @Patch()
    @ApiOperation({ summary: 'Update settings (nested object)' })
    async updateSettings(@Body() data: any) {
        const updates: any[] = [];
        const flatten = (obj: any, prefix = '') => {
            for (const [key, value] of Object.entries(obj)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    flatten(value, fullKey);
                } else {
                    updates.push(
                        this.prisma.platformConfig.upsert({
                            where: { key: fullKey },
                            update: { value: typeof value === 'string' ? value : JSON.stringify(value) },
                            create: {
                                key: fullKey,
                                value: typeof value === 'string' ? value : JSON.stringify(value),
                                description: `Setting: ${fullKey}`,
                            },
                        }),
                    );
                }
            }
        };
        flatten(data);
        await Promise.all(updates);
        return { success: true };
    }
}
