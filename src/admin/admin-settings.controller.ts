import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PlatformConfigHelper } from '../common/platform-config.helper';

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
            where: { category: 'general' },
        });
        const settings: any = {};
        configs.forEach((c) => {
            settings[c.key] = PlatformConfigHelper.parseJsonValue(c.value);
        });
        return settings;
    }

    @Patch('general')
    @ApiOperation({ summary: 'Update general settings' })
    async updateGeneralSettings(@Req() req: any, @Body() data: any) {
        const updatedById = req.user?.id || 'system';
        const updates = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(
                this.prisma.platformConfig.upsert({
                    where: PlatformConfigHelper.buildWhereUnique('general', key),
                    update: { 
                        value: PlatformConfigHelper.serializeValue(value),
                        updatedById 
                    },
                    create: {
                        category: 'general',
                        key,
                        value: PlatformConfigHelper.serializeValue(value),
                        updatedById,
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
            where: { category: 'verification' },
        });
        const settings: any = {
            requireKyc: true,
            kycProvider: 'MANUAL',
            autoApprove: false,
            minDocuments: 2,
        };
        configs.forEach((c) => {
            settings[c.key] = PlatformConfigHelper.parseJsonValue(c.value);
        });
        return settings;
    }

    @Patch('verification')
    @ApiOperation({ summary: 'Update verification settings' })
    async updateVerificationSettings(@Req() req: any, @Body() data: any) {
        const updatedById = req.user?.id || 'system';
        const updates = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(
                this.prisma.platformConfig.upsert({
                    where: PlatformConfigHelper.buildWhereUnique('verification', key),
                    update: { 
                        value: PlatformConfigHelper.serializeValue(value),
                        updatedById 
                    },
                    create: {
                        category: 'verification',
                        key,
                        value: PlatformConfigHelper.serializeValue(value),
                        updatedById,
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
            where: { category: 'ai' },
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
            settings[c.key] = PlatformConfigHelper.parseJsonValue(c.value);
        });
        return settings;
    }

    @Patch('ai')
    @ApiOperation({ summary: 'Update AI settings' })
    async updateAISettings(@Req() req: any, @Body() data: any) {
        const updatedById = req.user?.id || 'system';
        const updates = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(
                this.prisma.platformConfig.upsert({
                    where: PlatformConfigHelper.buildWhereUnique('ai', key),
                    update: { 
                        value: PlatformConfigHelper.serializeValue(value),
                        updatedById 
                    },
                    create: {
                        category: 'ai',
                        key,
                        value: PlatformConfigHelper.serializeValue(value),
                        updatedById,
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
            where: { category: 'theme' },
        });
        const settings: any = {
            primaryColor: '#3b82f6',
            secondaryColor: '#8b5cf6',
            accentColor: '#10b981',
            backgroundColor: '#ffffff',
            textColor: '#1f2937',
        };
        configs.forEach((c) => {
            settings[c.key] = PlatformConfigHelper.parseJsonValue(c.value);
        });
        return settings;
    }

    @Patch('theme')
    @ApiOperation({ summary: 'Update theme settings' })
    async updateThemeSettings(@Req() req: any, @Body() data: any) {
        const updatedById = req.user?.id || 'system';
        const updates = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(
                this.prisma.platformConfig.upsert({
                    where: PlatformConfigHelper.buildWhereUnique('theme', key),
                    update: { 
                        value: PlatformConfigHelper.serializeValue(value),
                        updatedById 
                    },
                    create: {
                        category: 'theme',
                        key,
                        value: PlatformConfigHelper.serializeValue(value),
                        updatedById,
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
            where: { category: 'social' },
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
            settings[c.key] = PlatformConfigHelper.parseJsonValue(c.value);
        });
        return settings;
    }

    @Patch('social')
    @ApiOperation({ summary: 'Update social links settings' })
    async updateSocialSettings(@Req() req: any, @Body() data: any) {
        const updatedById = req.user?.id || 'system';
        const updates = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(
                this.prisma.platformConfig.upsert({
                    where: PlatformConfigHelper.buildWhereUnique('social', key),
                    update: { 
                        value: PlatformConfigHelper.serializeValue(value),
                        updatedById 
                    },
                    create: {
                        category: 'social',
                        key,
                        value: PlatformConfigHelper.serializeValue(value),
                        updatedById,
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
            where: PlatformConfigHelper.buildWhereUnique('tickets', 'issueTypes'),
        });
        if (config) {
            const parsed = PlatformConfigHelper.parseJsonValue(config.value);
            return { types: Array.isArray(parsed) ? parsed : [parsed] };
        }
        return { types: ['Order Issue', 'Payment Issue', 'Product Issue', 'Account Issue', 'Other'] };
    }

    @Patch('tickets')
    @ApiOperation({ summary: 'Update ticket issue types' })
    async updateTicketSettings(@Req() req: any, @Body() data: { types: string[] }) {
        const updatedById = req.user?.id || 'system';
        await this.prisma.platformConfig.upsert({
            where: PlatformConfigHelper.buildWhereUnique('tickets', 'issueTypes'),
            update: { 
                value: PlatformConfigHelper.serializeValue(data.types),
                updatedById 
            },
            create: {
                category: 'tickets',
                key: 'issueTypes',
                value: PlatformConfigHelper.serializeValue(data.types),
                updatedById,
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
            if (!settings[c.category]) {
                settings[c.category] = {};
            }
            settings[c.category][c.key] = PlatformConfigHelper.parseJsonValue(c.value);
        });
        return settings;
    }

    @Patch()
    @ApiOperation({ summary: 'Update settings (nested object)' })
    async updateSettings(@Req() req: any, @Body() data: any) {
        const updatedById = req.user?.id || 'system';
        const updates: any[] = [];
        
        const flatten = (obj: any, category: string) => {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    // Nested object - treat as new category
                    flatten(value, key);
                } else {
                    updates.push(
                        this.prisma.platformConfig.upsert({
                            where: PlatformConfigHelper.buildWhereUnique(category, key),
                            update: { 
                                value: PlatformConfigHelper.serializeValue(value),
                                updatedById 
                            },
                            create: {
                                category,
                                key,
                                value: PlatformConfigHelper.serializeValue(value),
                                updatedById,
                                description: `${category} setting: ${key}`,
                            },
                        }),
                    );
                }
            }
        };
        
        // Process top-level categories
        for (const [category, settings] of Object.entries(data)) {
            if (typeof settings === 'object' && settings !== null) {
                flatten(settings, category);
            }
        }
        
        await Promise.all(updates);
        return { success: true };
    }
}
