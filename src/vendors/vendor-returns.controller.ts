import {
  Controller,
  Get,
  Post,
  Param,
  Body,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VendorReturnsService } from './vendor-returns.service';
import {
  VendorReturnQueryDto,
  AcceptReturnDto,
  RejectReturnDto,
  ProcessRefundDto,
  ReturnStatsResponse,
} from './dto/vendor-return.dto';

@ApiTags('Vendor Returns')
@ApiBearerAuth()
@Controller('vendors/returns')
@UseGuards(JwtAuthGuard)
export class VendorReturnsController {
  constructor(private readonly vendorReturnsService: VendorReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'List return requests for vendor orders' })
  @ApiResponse({
    status: 200,
    description: 'List of return requests with pagination',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'PENDING_APPROVAL',
      'APPROVED',
      'REJECTED',
      'PICKUP_SCHEDULED',
      'PICKUP_COMPLETED',
      'IN_TRANSIT',
      'RECEIVED_AT_WAREHOUSE',
      'QC_IN_PROGRESS',
      'QC_PASSED',
      'QC_FAILED',
      'REFUND_INITIATED',
      'REFUND_COMPLETED',
      'REPLACEMENT_INITIATED',
      'REPLACEMENT_SHIPPED',
      'REPLACEMENT_COMPLETED',
      'CANCELLED',
    ],
    description: 'Filter by return status',
  })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Filter from date (ISO 8601)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Filter to date (ISO 8601)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by return or order number' })
  async findAll(@Request() req, @Query() query: VendorReturnQueryDto) {
    return this.vendorReturnsService.findAll(req.user.id, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get return statistics for vendor' })
  @ApiResponse({
    status: 200,
    description: 'Return statistics',
    type: ReturnStatsResponse,
  })
  async getStats(@Request() req): Promise<ReturnStatsResponse> {
    return this.vendorReturnsService.getStats(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return request details' })
  @ApiParam({ name: 'id', description: 'Return request ID' })
  @ApiResponse({ status: 200, description: 'Return request details retrieved' })
  @ApiResponse({ status: 403, description: 'Return does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Return request not found' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.vendorReturnsService.findOne(req.user.id, id);
  }

  @Post(':id/accept')
  @ApiOperation({
    summary: 'Accept a return request',
    description: 'Approves a pending return request. Optionally schedule pickup.',
  })
  @ApiParam({ name: 'id', description: 'Return request ID' })
  @ApiResponse({ status: 200, description: 'Return request accepted' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Return does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Return request not found' })
  async acceptReturn(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AcceptReturnDto,
  ) {
    return this.vendorReturnsService.acceptReturn(req.user.id, id, dto);
  }

  @Post(':id/reject')
  @ApiOperation({
    summary: 'Reject a return request',
    description: 'Rejects a pending return request with a reason.',
  })
  @ApiParam({ name: 'id', description: 'Return request ID' })
  @ApiResponse({ status: 200, description: 'Return request rejected' })
  @ApiResponse({ status: 400, description: 'Invalid status transition or missing reason' })
  @ApiResponse({ status: 403, description: 'Return does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Return request not found' })
  async rejectReturn(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RejectReturnDto,
  ) {
    return this.vendorReturnsService.rejectReturn(req.user.id, id, dto);
  }

  @Post(':id/refund')
  @ApiOperation({
    summary: 'Process refund for a return',
    description: 'Creates and processes a refund for an approved return request.',
  })
  @ApiParam({ name: 'id', description: 'Return request ID' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status or refund already processed' })
  @ApiResponse({ status: 403, description: 'Return does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Return request not found' })
  async processRefund(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ProcessRefundDto,
  ) {
    return this.vendorReturnsService.processRefund(req.user.id, id, dto);
  }
}
