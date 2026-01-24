import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VendorMembershipsService } from './vendor-memberships.service';
import {
    SubscribeMembershipDto,
    UpgradeMembershipDto,
    MembershipTierResponseDto,
    CurrentMembershipResponseDto,
} from './dto/membership.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Idempotent } from '../idempotency/idempotency.decorator';

@ApiTags('Vendor Memberships')
@Controller('api/v1/vendor-memberships')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorMembershipsController {
    constructor(private readonly membershipService: VendorMembershipsService) { }

    @Get('tiers')
    @ApiOperation({ summary: 'Get all membership tiers' })
    @ApiResponse({
        status: 200,
        description: 'List of all available membership tiers',
        type: [MembershipTierResponseDto],
    })
    async getAllTiers(): Promise<MembershipTierResponseDto[]> {
        return this.membershipService.getAllTiers();
    }

    @Post('subscribe')
    @ApiOperation({ summary: 'Subscribe to a membership tier' })
    @ApiResponse({
        status: 201,
        description: 'Subscription successful',
        type: CurrentMembershipResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Bad request - already subscribed or insufficient balance' })
    @Idempotent({ required: true, ttlSeconds: 600 })
    async subscribe(@Req() req, @Body() dto: SubscribeMembershipDto): Promise<CurrentMembershipResponseDto> {
        const vendorId = req.user.id;
        return this.membershipService.subscribe(vendorId, dto);
    }

    @Post('upgrade')
    @ApiOperation({ summary: 'Upgrade to a higher tier' })
    @ApiResponse({
        status: 200,
        description: 'Upgrade successful',
        type: CurrentMembershipResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Bad request - cannot downgrade or no active membership' })
    @Idempotent({ required: true, ttlSeconds: 600 })
    async upgrade(@Req() req, @Body() dto: UpgradeMembershipDto): Promise<CurrentMembershipResponseDto> {
        const vendorId = req.user.id;
        return this.membershipService.upgrade(vendorId, dto);
    }

    @Get('current')
    @ApiOperation({ summary: 'Get current membership details' })
    @ApiResponse({
        status: 200,
        description: 'Current membership details with usage statistics',
        type: CurrentMembershipResponseDto,
    })
    @ApiResponse({ status: 404, description: 'No active membership found' })
    async getCurrentMembership(@Req() req): Promise<CurrentMembershipResponseDto> {
        const vendorId = req.user.id;
        return this.membershipService.getCurrentMembership(vendorId);
    }

    @Post('cancel-auto-renewal')
    @ApiOperation({ summary: 'Cancel auto-renewal' })
    @ApiResponse({
        status: 200,
        description: 'Auto-renewal cancelled',
        schema: {
            properties: {
                message: { type: 'string', example: 'Auto-renewal cancelled successfully' },
                endDate: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'No active membership found' })
    async cancelAutoRenewal(@Req() req): Promise<{ message: string; endDate: Date }> {
        const vendorId = req.user.id;
        return this.membershipService.cancelAutoRenewal(vendorId);
    }

    @Post('cancel')
    @ApiOperation({ summary: 'Cancel membership auto-renewal (Alias)' })
    @ApiResponse({
        status: 200,
        description: 'Auto-renewal cancelled',
        schema: {
            properties: {
                message: { type: 'string', example: 'Auto-renewal cancelled successfully' },
                endDate: { type: 'string', format: 'date-time' },
            },
        },
    })
    async cancel(@Req() req): Promise<{ message: string; endDate: Date }> {
        const vendorId = req.user.id;
        return this.membershipService.cancelAutoRenewal(vendorId);
    }
}
