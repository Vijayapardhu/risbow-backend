import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Delete,
  Param,
  Ip,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import {
  AdminLoginDto,
  AdminLoginResponseDto,
} from './dto/admin-login.dto';
import {
  AdminRefreshDto,
  AdminRefreshResponseDto,
} from './dto/admin-refresh.dto';
import { SetupMfaResponseDto } from './dto/setup-mfa.dto';
import {
  VerifyMfaDto,
  VerifyMfaResponseDto,
} from './dto/verify-mfa.dto';

@ApiTags('Admin Authentication')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private authService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ApiOperation({
    summary: 'Admin login',
    description: 'Authenticate admin user with email and password. Returns JWT tokens or requires MFA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful or MFA required',
    type: AdminLoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account locked' })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  async login(
    @Body() dto: AdminLoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AdminLoginResponseDto | { requiresMfa: true; tempToken: string }> {
    return this.authService.login(dto, ipAddress, userAgent || 'Unknown');
  }

  @Post('verify-mfa')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Verify MFA code during login',
    description: 'Complete login by providing MFA code after initial login returned requiresMfa: true',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA verified, login successful',
    type: VerifyMfaResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid MFA code or temp token' })
  async verifyMfaLogin(
    @Body() dto: VerifyMfaDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<VerifyMfaResponseDto> {
    return this.authService.verifyMfaLogin(
      dto.tempToken!,
      dto.code,
      ipAddress,
      userAgent || 'Unknown',
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get a new access token using a valid refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AdminRefreshResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(
    @Body() dto: AdminRefreshDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AdminRefreshResponseDto> {
    return this.authService.refreshToken(
      dto.refreshToken,
      ipAddress,
      userAgent || 'Unknown',
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout',
    description: 'Invalidate current session',
  })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  async logout(@Request() req: any): Promise<void> {
    await this.authService.logout(req.user.sessionId);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout from all sessions',
    description: 'Invalidate all active sessions for the current admin',
  })
  @ApiResponse({ status: 204, description: 'All sessions revoked' })
  async logoutAll(@CurrentAdmin('id') adminId: string): Promise<void> {
    await this.authService.logoutAll(adminId);
  }

  @Get('me')
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current admin profile',
    description: 'Get the profile of the currently authenticated admin',
  })
  @ApiResponse({ status: 200, description: 'Admin profile' })
  async getProfile(@CurrentAdmin('id') adminId: string) {
    return this.authService.getProfile(adminId);
  }

  @Get('sessions')
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get active sessions',
    description: 'List all active sessions for the current admin',
  })
  @ApiResponse({ status: 200, description: 'List of active sessions' })
  async getSessions(@CurrentAdmin('id') adminId: string) {
    return this.authService.getSessions(adminId);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke specific session',
    description: 'Invalidate a specific session by ID',
  })
  @ApiResponse({ status: 204, description: 'Session revoked' })
  async revokeSession(@Param('sessionId') sessionId: string): Promise<void> {
    await this.authService.revokeSession(sessionId);
  }

  @Post('mfa/setup')
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Setup MFA',
    description: 'Initialize MFA setup and get QR code for authenticator app',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA setup data with QR code',
    type: SetupMfaResponseDto,
  })
  @ApiResponse({ status: 409, description: 'MFA already enabled' })
  async setupMfa(@CurrentAdmin('id') adminId: string): Promise<SetupMfaResponseDto> {
    return this.authService.setupMfa(adminId);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify and enable MFA',
    description: 'Verify the MFA code from authenticator app to enable MFA',
  })
  @ApiResponse({ status: 200, description: 'MFA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async verifyMfaSetup(
    @CurrentAdmin('id') adminId: string,
    @Body('code') code: string,
  ): Promise<{ success: boolean }> {
    return this.authService.verifyMfaSetup(adminId, code);
  }

  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Disable MFA',
    description: 'Disable MFA for the current admin (requires password and MFA code)',
  })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid password or MFA code' })
  async disableMfa(
    @CurrentAdmin('id') adminId: string,
    @Body('code') code: string,
    @Body('password') password: string,
  ): Promise<{ success: boolean }> {
    return this.authService.disableMfa(adminId, code, password);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 attempts per hour
  @ApiOperation({
    summary: 'Change password',
    description: 'Change admin password. All sessions will be invalidated.',
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  async changePassword(
    @CurrentAdmin('id') adminId: string,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ success: boolean }> {
    return this.authService.changePassword(adminId, currentPassword, newPassword);
  }
}
