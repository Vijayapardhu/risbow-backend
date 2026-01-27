import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { CreateCreatorProfileDto } from './dto/create-creator-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async becomeCreator(
    @Request() req: any,
    @Body() dto: CreateCreatorProfileDto,
  ) {
    return this.creatorsService.becomeCreator(
      req.user.id,
      dto.displayName,
      dto.bio,
      dto.profileImageUrl,
    );
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateCreatorProfile(
    @Request() req: any,
    @Body() dto: Partial<CreateCreatorProfileDto>,
  ) {
    return this.creatorsService.updateCreatorProfile(
      req.user.id,
      dto.displayName,
      dto.bio,
      dto.profileImageUrl,
    );
  }

  @Get(':id')
  async getCreatorProfile(@Param('id') id: string) {
    return this.creatorsService.getCreatorProfile(id);
  }

  @Get(':id/reels')
  async getCreatorReels(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.creatorsService.getCreatorReels(
      id,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }
}
