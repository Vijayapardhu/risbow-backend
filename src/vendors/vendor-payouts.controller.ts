import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VendorPayoutsService } from './vendor-payouts.service';
import {
    RequestPayoutDto,
    UpdateBankDetailsDto,
    PayoutHistoryQueryDto,
    PayoutBalanceResponseDto,
    PayoutSummaryResponseDto,
} from './dto/vendor-payout.dto';

@ApiTags('Vendor Payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vendors/payouts')
export class VendorPayoutsController {
    constructor(private readonly payoutsService: VendorPayoutsService) {}

    @Get('balance')
    @ApiOperation({ summary: 'Get vendor payout balance' })
    @ApiResponse({
        status: 200,
        description: 'Returns pending earnings, available balance, and total paid out',
        type: PayoutBalanceResponseDto,
    })
    async getBalance(@Request() req: any): Promise<PayoutBalanceResponseDto> {
        return this.payoutsService.getBalance(req.user.id);
    }

    @Get('summary')
    @ApiOperation({ summary: 'Get payout statistics summary' })
    @ApiResponse({
        status: 200,
        description: 'Returns payout statistics summary',
        type: PayoutSummaryResponseDto,
    })
    async getSummary(@Request() req: any): Promise<PayoutSummaryResponseDto> {
        return this.payoutsService.getPayoutSummary(req.user.id);
    }

    @Get()
    @ApiOperation({ summary: 'Get payout history with pagination and filters' })
    @ApiResponse({
        status: 200,
        description: 'Returns paginated payout history',
    })
    async getPayoutHistory(@Request() req: any, @Query() query: PayoutHistoryQueryDto) {
        return this.payoutsService.getPayoutHistory(req.user.id, query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get payout details by ID' })
    @ApiParam({ name: 'id', description: 'Payout ID' })
    @ApiResponse({
        status: 200,
        description: 'Returns payout details',
    })
    @ApiResponse({
        status: 404,
        description: 'Payout not found',
    })
    async getPayoutById(@Request() req: any, @Param('id') id: string) {
        return this.payoutsService.getPayoutById(req.user.id, id);
    }

    @Post('request')
    @ApiOperation({ summary: 'Request a new payout' })
    @ApiResponse({
        status: 201,
        description: 'Payout request created successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request - insufficient balance, missing bank details, or below minimum amount',
    })
    async requestPayout(@Request() req: any, @Body() dto: RequestPayoutDto) {
        return this.payoutsService.requestPayout(req.user.id, dto);
    }
}

@ApiTags('Vendor Payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vendors')
export class VendorBankDetailsController {
    constructor(private readonly payoutsService: VendorPayoutsService) {}

    @Patch('bank-details')
    @ApiOperation({ summary: 'Update vendor bank details' })
    @ApiResponse({
        status: 200,
        description: 'Bank details updated successfully',
    })
    async updateBankDetails(@Request() req: any, @Body() dto: UpdateBankDetailsDto) {
        return this.payoutsService.updateBankDetails(req.user.id, dto);
    }
}
