import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CmsService } from './cms.service';
import { CreatePageDto, UpdatePageDto } from './dto/create-page.dto';
import { CreateMenuDto, UpdateMenuDto, CreateMenuItemDto } from './dto/create-menu.dto';
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin/auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from '../admin/auth/guards/admin-permissions.guard';
import { AdminRoles } from '../admin/auth/decorators/admin-roles.decorator';
import { AdminRole, MenuLocation } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin/cms')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
export class AdminCmsController {
  constructor(private readonly cmsService: CmsService) {}

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

// Public CMS Controller
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('pages/:slug')
  findPageBySlug(@Param('slug') slug: string) {
    return this.cmsService.findPageBySlug(slug);
  }

  @Get('menus/:location')
  findMenuByLocation(@Param('location') location: MenuLocation) {
    return this.cmsService.findMenuByLocation(location);
  }
}
