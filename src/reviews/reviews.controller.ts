import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, ReportReviewDto } from './dto/review.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @Post('products/:productId/reviews')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Create a review for a product (Verified Buyers Only)' })
    create(@Request() req, @Param('productId') productId: string, @Body() dto: CreateReviewDto) {
        return this.reviewsService.create(req.user.id, productId, dto);
    }

    @Get('products/:productId/reviews')
    @ApiOperation({ summary: 'Get reviews for a product' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAll(@Param('productId') productId: string, @Query('page') page = 1, @Query('limit') limit = 10) {
        return this.reviewsService.findAllByProduct(productId, +page, +limit);
    }

    @Get('vendors/:vendorId/reviews')
    @ApiOperation({ summary: 'Get aggregated reviews for a vendor' })
    getVendorReviews(@Param('vendorId') vendorId: string) {
        return this.reviewsService.getVendorReviews(vendorId);
    }

    @Patch('reviews/:id')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Update a review' })
    update(@Request() req, @Param('id') id: string, @Body() dto: UpdateReviewDto) {
        return this.reviewsService.update(req.user.id, id, dto);
    }

    @Delete('reviews/:id')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Delete a review' })
    remove(@Request() req, @Param('id') id: string) {
        // Pass full user for role check
        return this.reviewsService.remove(req.user.id, id);
    }

    @Post('reviews/:id/helpful')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Vote a review as helpful' })
    voteHelpful(@Request() req, @Param('id') id: string) {
        return this.reviewsService.voteHelpful(req.user.id, id);
    }

    @Post('reviews/:id/report')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Report a review' })
    report(@Request() req, @Param('id') id: string, @Body() dto: ReportReviewDto) {
        return this.reviewsService.report(req.user.id, id, dto);
    }
}
