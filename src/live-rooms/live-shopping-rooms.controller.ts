import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { LiveShoppingRoomsService } from './live-shopping-rooms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin/auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from '../admin/auth/guards/admin-permissions.guard';
import { AdminRoles } from '../admin/auth/decorators/admin-roles.decorator';
import { AdminRole } from '@prisma/client';

class CreateRoomDto {
  name: string;
  description?: string;
  productId: string;
  variantId?: string;
  basePrice: number;
  costPrice: number;
  minDiscount?: number;
  maxDiscount?: number;
  scheduledStart: Date;
  scheduledEnd: Date;
  maxParticipants?: number;
  minParticipants?: number;
  discountTiers: {
    minParticipants: number;
    maxParticipants?: number;
    discountPercent: number;
  }[];
}

class SendMessageDto {
  content: string;
}

@ApiTags('Live Shopping Rooms')
@Controller('live-rooms')
export class LiveShoppingRoomsController {
  constructor(private readonly liveRoomsService: LiveShoppingRoomsService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get()
  @ApiOperation({
    summary: 'Get all active live shopping rooms',
    description: 'Returns all scheduled and live rooms for discovery',
  })
  @ApiResponse({ status: 200, description: 'List of active rooms' })
  async getActiveRooms() {
    return this.liveRoomsService.getActiveRooms();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get room details with current pricing',
    description: 'Returns room details including dynamic pricing based on participant count',
  })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Room details with pricing' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRoom(@Param('id') id: string) {
    return this.liveRoomsService.getRoomWithPricing(id);
  }

  @Get(':id/messages')
  @ApiOperation({
    summary: 'Get room messages',
    description: 'Returns chat messages for a room',
  })
  @ApiResponse({ status: 200, description: 'List of messages' })
  async getMessages(
    @Param('id') id: string,
    @Query('limit') limit: string = '50',
    @Query('before') before?: string,
  ) {
    return this.liveRoomsService.getMessages(
      id,
      parseInt(limit),
      before ? new Date(before) : undefined,
    );
  }

  @Get(':id/participants')
  @ApiOperation({
    summary: 'Get active participants',
    description: 'Returns list of users currently in the room',
  })
  @ApiResponse({ status: 200, description: 'List of participants' })
  async getParticipants(@Param('id') id: string) {
    return this.liveRoomsService.getActiveParticipants(id);
  }

  // ==================== USER ENDPOINTS ====================

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Join a live shopping room',
    description: 'Allows a logged-in user to join a room',
  })
  @ApiResponse({ status: 200, description: 'Successfully joined room' })
  @ApiResponse({ status: 400, description: 'Room is full or not active' })
  async joinRoom(@Param('id') id: string, @Request() req: any) {
    return this.liveRoomsService.joinRoom(id, req.user.id);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Leave a live shopping room',
    description: 'Allows a user to leave a room',
  })
  async leaveRoom(@Param('id') id: string, @Request() req: any) {
    return this.liveRoomsService.leaveRoom(id, req.user.id);
  }

  @Post(':id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send a message to the room',
    description: 'Allows a user to send a chat message',
  })
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ) {
    return this.liveRoomsService.addMessage(id, req.user.id, dto.content);
  }

  // ==================== VENDOR ENDPOINTS ====================

  @Get('vendor/my-rooms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get vendor rooms',
    description: 'Returns all rooms created by the authenticated vendor',
  })
  async getVendorRooms(@Request() req: any, @Query('status') status?: string) {
    // Assuming req.user has vendorId or we need to look it up
    const vendorId = req.user.vendorId || req.user.id;
    return this.liveRoomsService.getVendorRooms(vendorId, status as any);
  }

  @Post('vendor/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a vendor-managed room',
    description: 'Allows a vendor to create a live shopping room for their products',
  })
  async createVendorRoom(@Body() dto: CreateRoomDto, @Request() req: any) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.liveRoomsService.createVendorRoom(vendorId, dto);
  }

  @Patch('vendor/:id/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Start a vendor room',
    description: 'Changes room status to LIVE',
  })
  async startVendorRoom(@Param('id') id: string, @Request() req: any) {
    return this.liveRoomsService.startRoom(id, req.user.id);
  }

  @Patch('vendor/:id/end')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'End a vendor room',
    description: 'Changes room status to ENDED',
  })
  async endVendorRoom(@Param('id') id: string, @Request() req: any) {
    return this.liveRoomsService.endRoom(id, req.user.id);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin/all')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
  @AdminRoles(AdminRole.OPERATIONS_ADMIN, AdminRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all rooms (Admin)',
    description: 'Returns all rooms across the platform',
  })
  async getAllRoomsAdmin(@Query('status') status?: string) {
    // Implementation would return all rooms with filtering
    return this.liveRoomsService.getActiveRooms();
  }

  @Post('admin/create')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
  @AdminRoles(AdminRole.OPERATIONS_ADMIN, AdminRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create an admin-managed room',
    description: 'Allows admin to create rooms for any product',
  })
  async createAdminRoom(@Body() dto: CreateRoomDto, @Request() req: any) {
    return this.liveRoomsService.createAdminRoom(req.user.id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a room (Admin)',
    description: 'Allows super admin to delete any room',
  })
  async deleteRoomAdmin(@Param('id') id: string) {
    // Implementation for admin deletion
    throw new BadRequestException('Not implemented yet');
  }
}
