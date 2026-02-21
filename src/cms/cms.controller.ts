import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Put, UseInterceptors, UploadedFile } from '@nestjs/common';
import { CmsService } from './cms.service';
import { CmsSettingsService } from './cms-settings.service';
import { CreatePageDto, UpdatePageDto } from './dto/create-page.dto';
import { CreateMenuDto, UpdateMenuDto, CreateMenuItemDto } from './dto/create-menu.dto';
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin/auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from '../admin/auth/guards/admin-permissions.guard';
import { AdminRoles } from '../admin/auth/decorators/admin-roles.decorator';
import { AdminRole, MenuLocation } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('admin/cms')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
export class AdminCmsController {
  constructor(private readonly cmsService: CmsService) { }

  @Get('stats')
  async getDashboardStats() {
    return this.cmsService.getDashboardStats();
  }

  // Pages
  @Post('pages')
  @HttpCode(HttpStatus.CREATED)
  createPage(@Body() dto: CreatePageDto, @CurrentUser('id') adminId: string) {
    return this.cmsService.createPage(dto, adminId);
  }

  @Get('pages')
  findAllPages(@Query() query: { page?: number; limit?: number; isActive?: boolean; search?: string }) {
    return this.cmsService.findAllPages(query);
  }

  @Get('pages/:id')
  findPageById(@Param('id') id: string) {
    return this.cmsService.findPageById(id);
  }

  @Patch('pages/:id')
  updatePage(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.cmsService.updatePage(id, dto);
  }

  @Delete('pages/:id')
  deletePage(@Param('id') id: string) {
    return this.cmsService.deletePage(id);
  }

  // Menus
  @Post('menus')
  @HttpCode(HttpStatus.CREATED)
  createMenu(@Body() dto: CreateMenuDto) {
    return this.cmsService.createMenu(dto);
  }

  @Get('menus')
  findAllMenus(@Query() query: { location?: MenuLocation; isActive?: boolean }) {
    return this.cmsService.findAllMenus(query);
  }

  @Get('menus/:id')
  findMenuById(@Param('id') id: string) {
    return this.cmsService.findAllMenus({}).then(menus => {
      const menu = menus.find(m => m.id === id);
      if (!menu) throw new Error('Menu not found');
      return menu;
    });
  }

  @Patch('menus/:id')
  updateMenu(@Param('id') id: string, @Body() dto: UpdateMenuDto) {
    return this.cmsService.updateMenu(id, dto);
  }

  @Delete('menus/:id')
  deleteMenu(@Param('id') id: string) {
    return this.cmsService.deleteMenu(id);
  }

  // Menu Items
  @Post('menus/:menuId/items')
  @HttpCode(HttpStatus.CREATED)
  addMenuItem(@Param('menuId') menuId: string, @Body() dto: CreateMenuItemDto) {
    return this.cmsService.addMenuItem(menuId, dto);
  }

  @Patch('menus/items/:id')
  updateMenuItem(@Param('id') id: string, @Body() dto: Partial<CreateMenuItemDto>) {
    return this.cmsService.updateMenuItem(id, dto);
  }

  @Delete('menus/items/:id')
  deleteMenuItem(@Param('id') id: string) {
    return this.cmsService.deleteMenuItem(id);
  }
}

// Public CMS Controller - route will be /api/v1/pages/:slug
@Controller('pages')
export class PublicPagesController {
  constructor(private readonly cmsService: CmsService) { }

  @Get(':slug')
  async findPageBySlug(@Param('slug') slug: string) {
    const page = await this.cmsService.findPageBySlug(slug);
    return {
      title: page.metaTitle || page.title,
      content: page.content,
      metaTitle: page.metaTitle,
      metaDesc: page.metaDesc,
      ogImage: page.ogImage,
      favicon: page.favicon,
    };
  }
}

@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) { }

  @Get('menus/:location')
  findMenuByLocation(@Param('location') location: MenuLocation) {
    return this.cmsService.findMenuByLocation(location);
  }
}

// Settings Controller - Public
@Controller('cms/settings')
export class CmsSettingsController {
  constructor(private readonly cmsSettingsService: CmsSettingsService) { }

  @Get()
  getSettings() {
    return this.cmsSettingsService.getSettings();
  }

  @Put()
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
  updateSettings(@Body() data: any) {
    return this.cmsSettingsService.updateSettings(data);
  }

  @Post('upload')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@UploadedFile() file: Express.Multer.File, @Body('type') type: 'logo' | 'favicon' | 'ogImage') {
    return this.cmsSettingsService.uploadImage(file, type);
  }
}
