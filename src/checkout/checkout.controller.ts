import { Controller, Get, Post, Body, Param, Query, Put, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CheckoutService } from './checkout.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('checkout')
export class CheckoutController {
    constructor(private readonly checkoutService: CheckoutService) { }

    @Post('capture')
    @Throttle({ default: { limit: 10, ttl: 60000 } }) // Rate limit: 10 per minute to prevent spam
    async captureCheckout(@Body() body: {
        userId?: string;
        guestInfo?: any;
        cartItems: any[];
        financeDetails: any;
    }) {
        // Public endpoint for abandoned cart capture (guest or authenticated)
        // Rate limited to prevent spam attacks
        return this.checkoutService.captureCheckout(body);
    }

    // Admin / Telecaller Endpoints

    @UseGuards(JwtAuthGuard)
    @Get('admin/leads')
    async getLeads(
        @Request() req,
        @Query('page') page: string,
        @Query('status') status?: string,
        @Query('urgency') urgency?: boolean
    ) {
        const user = req.user;
        const take = 20;
        const skip = (Number(page || 1) - 1) * take;

        const where: Prisma.AbandonedCheckoutWhereInput = {};

        // RBAC: Telecaller only sees their own leads
        if (user.role === 'TELECALLER' || user.role === 'SUPPORT') { // Assuming SUPPORT is telecaller like
            // Or if simple role check:
            // where.agentId = user.id; // BUT 'agentId' matches Admin ID.
            // If user is Admin, user.id is valid.
            // Prompt says "Telecaller sees only assigned leads".
            where.agentId = user.id;
        }

        if (status) where.status = status as any;

        return this.checkoutService.getCheckouts({
            take,
            skip,
            where,
            orderBy: { createdAt: 'desc' }
        });
    }

    @UseGuards(JwtAuthGuard)
    @Get('admin/leads/:id')
    async getLeadDetails(@Request() req, @Param('id') id: string) {
        const lead = await this.checkoutService.getCheckoutById(id);
        if (!lead) return null;

        const user = req.user;
        if (user.role === 'TELECALLER') {
            if (lead.agentId !== user.id) {
                throw new ForbiddenException('You are not assigned to this lead');
            }
        }
        return lead;
    }

    @UseGuards(JwtAuthGuard)

    @Post('admin/assign')
    async assignLead(@Request() req, @Body() body: { checkoutId: string, agentId: string }) {
        const user = req.user;
        let targetAgentId = body.agentId;

        // Handle placeholder or missing ID by defaulting to current user
        if (!targetAgentId || targetAgentId === 'CURRENT_ADMIN_ID') {
            targetAgentId = user.id;
        }

        // If telecaller assigns to someone else, forbid.
        if (user.role === 'TELECALLER' && targetAgentId !== user.id) {
            throw new ForbiddenException('Telecallers can only assign leads to themselves');
        }
        return this.checkoutService.assignLead(body.checkoutId, targetAgentId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('admin/followup')
    async addFollowup(@Request() req, @Body() body: { checkoutId: string, agentId: string, note: string, outcome: string }) {
        const user = req.user;
        let agentId = body.agentId;

        // Auto-resolve ID if placeholder
        if (!agentId || agentId === 'CURRENT_ADMIN_ID') {
            agentId = user.id;
        }

        if (user.role === 'TELECALLER' && agentId !== user.id) {
            throw new ForbiddenException('Cannot log followup for another agent');
        }

        return this.checkoutService.addFollowup({
            checkoutId: body.checkoutId,
            agentId: agentId,
            note: body.note,
            outcome: body.outcome as any
        });
    }
}
