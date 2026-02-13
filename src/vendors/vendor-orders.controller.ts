import {
  Controller,
  Get,
  Post,
  Patch,
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
import { VendorOrdersService } from './vendor-orders.service';
import {
  VendorOrderQueryDto,
  UpdateOrderStatusDto,
  UpdateTrackingDto,
  CancelOrderDto,
} from './dto/vendor-order.dto';

@ApiTags('Vendor Orders')
@ApiBearerAuth()
@Controller('vendors/orders')
@UseGuards(JwtAuthGuard)
export class VendorOrdersController {
  constructor(private readonly vendorOrdersService: VendorOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders belonging to vendor' })
  @ApiResponse({
    status: 200,
    description: 'List of orders with pagination',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    description: 'Filter by order status',
  })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Filter from date (ISO 8601)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Filter to date (ISO 8601)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by order number' })
  async findAll(@Request() req: any, @Query() query: VendorOrderQueryDto) {
    return this.vendorOrdersService.findAll(req.user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details with items' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order details retrieved' })
  @ApiResponse({ status: 403, description: 'Order does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.vendorOrdersService.findOne(req.user.id, id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get order status timeline/history' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order timeline retrieved' })
  @ApiResponse({ status: 403, description: 'Order does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getTimeline(@Request() req: any, @Param('id') id: string) {
    return this.vendorOrdersService.getOrderTimeline(req.user.id, id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update order status',
    description: 'Valid transitions: PENDING→CONFIRMED→PACKED→SHIPPED→DELIVERED',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Order does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.vendorOrdersService.updateStatus(req.user.id, id, dto);
  }

  @Patch(':id/tracking')
  @ApiOperation({ summary: 'Add or update tracking information' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Tracking info updated' })
  @ApiResponse({ status: 400, description: 'Tracking can only be added for PACKED/SHIPPED orders' })
  @ApiResponse({ status: 403, description: 'Order does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateTracking(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTrackingDto,
  ) {
    return this.vendorOrdersService.updateTracking(req.user.id, id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel order with reason' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled and stock restored',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel order in current status',
  })
  @ApiResponse({ status: 403, description: 'Order does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.vendorOrdersService.cancelOrder(req.user.id, id, dto);
  }
}
