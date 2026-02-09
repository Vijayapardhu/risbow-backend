import { Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { AdminRoles } from '../auth/decorators/admin-roles.decorator';
import { RequirePermissions } from '../auth/decorators/admin-permissions.decorator';
import { Permission } from '../rbac/admin-permissions.service';
import { CmsService } from './cms.service';
import { CreateCmsPageDto, UpdateCmsPageDto, CreateCmsMenuDto, UpdateCmsMenuDto, CreateCmsMenuItemDto, UpdateCmsMenuItemDto } from './dto';

@ApiTags('Admin - CMS')
@Controller('admin/cms')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  // CMS Pages
  @Get('pages')
  @ApiOperation({ summary: 'Get all CMS pages' })
  @ApiResponse({ status: 200, description: 'List of CMS pages' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
  @RequirePermissions(Permission.CMS_READ)
  async getAllPages(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.cmsService.getAllPages(page, limit, search, isActive);
  }

  @Get('pages/:id')
  @ApiOperation({ summary: 'Get CMS page by ID' })
  @ApiResponse({ status: 200, description: 'CMS page details' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
  @RequirePermissions(Permission.CMS_READ)
  async getPageById(@Param('id') id: string) {
    return this.cmsService.getPageById(id);
  }

  @Post('pages')
  @ApiOperation({ summary: 'Create new CMS page' })
  @ApiResponse({ status: 201, description: 'CMS page created' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
  @RequirePermissions(Permission.CMS_CREATE)
  async createPage(@Body() createCmsPageDto: CreateCmsPageDto) {
    return this.cmsService.createPage(createCmsPageDto);
  }

  @Put('pages/:id')
  @ApiOperation({ summary: 'Update CMS page' })
  @ApiResponse({ status: 200, description: 'CMS page updated' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
  @RequirePermissions(Permission.CMS_UPDATE)
  async updatePage(@Param('id') id: string, @Body() updateCmsPageDto: UpdateCmsPageDto) {
    return this.cmsService.updatePage(id, updateCmsPageDto);
  }

  @Delete('pages/:id')
  @ApiOperation({ summary: 'Delete CMS page' })
  @ApiResponse({ status: 200, description: 'CMS page deleted' })
  @AdminRoles('SUPER_ADMIN')
  @RequirePermissions(Permission.CMS_DELETE)
  async deletePage(@Param('id') id: string) {
    return this.cmsService.deletePage(id);
  }

  // CMS Menus
  @Get('menus')
  @ApiOperation({ summary: 'Get all CMS menus' })
  @ApiResponse({ status: 200, description: 'List of CMS menus' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
  @RequirePermissions(Permission.CMS_READ)
  async getAllMenus(
    @Query('location') location?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.cmsService.getAllMenus(location, isActive);
  }

  @Get('menus/:id')
  @ApiOperation({ summary: 'Get CMS menu by ID' })
  @ApiResponse({ status: 200, description: 'CMS menu details' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
  @RequirePermissions(Permission.CMS_READ)
  async getMenuById(@Param('id') id: string) {
    return this.cmsService.getMenuById(id);
  }

  @Post('menus')
  @ApiOperation({ summary: 'Create new CMS menu' })
  @ApiResponse({ status: 201, description: 'CMS menu created' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
  @RequirePermissions(Permission.CMS_CREATE)
  async createMenu(@Body() createCmsMenuDto: CreateCmsMenuDto) {
    return this.cmsService.createMenu(createCmsMenuDto);
  }

  @Put('menus/:id')
  @ApiOperation({ summary: 'Update CMS menu' })
  @ApiResponse({ status: 200, description: 'CMS menu updated' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
  @RequirePermissions(Permission.CMS_UPDATE)
  async updateMenu(@Param('id') id: string, @Body() updateCmsMenuDto: UpdateCmsMenuDto) {
    return this.cmsService.updateMenu(id, updateCmsMenuDto);
  }

  @Delete('menus/:id')
  @ApiOperation({ summary: 'Delete CMS menu' })
  @ApiResponse({ status: 200, description: 'CMS menu deleted' })
  @AdminRoles('SUPER_ADMIN')
  @RequirePermissions(Permission.CMS_DELETE)
  async deleteMenu(@Param('id') id: string) {
    return this.cmsService.deleteMenu(id);
  }

  // CMS Menu Items
  @Get('menu-items')
  @ApiOperation({ summary: 'Get all CMS menu items' })
  @ApiResponse({ status: 200, description: 'List of CMS menu items' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
  @RequirePermissions(Permission.CMS_READ)
  async getAllMenuItems(
    @Query('menuId') menuId?: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.cmsService.getAllMenuItems(menuId, parentId);
  }

  @Get('menu-items/:id')
  @ApiOperation({ summary: 'Get CMS menu item by ID' })
  @ApiResponse({ status: 200, description: 'CMS menu item details' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
  @RequirePermissions(Permission.CMS_READ)
  async getMenuItemById(@Param('id') id: string) {
    return this.cmsService.getMenuItemById(id);
  }

  @Post('menu-items')
  @ApiOperation({ summary: 'Create new CMS menu item' })
  @ApiResponse({ status: 201, description: 'CMS menu item created' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
  @RequirePermissions(Permission.CMS_CREATE)
  async createMenuItem(@Body() createCmsMenuItemDto: CreateCmsMenuItemDto) {
    return this.cmsService.createMenuItem(createCmsMenuItemDto);
  }

  @Put('menu-items/:id')
  @ApiOperation({ summary: 'Update CMS menu item' })
  @ApiResponse({ status: 200, description: 'CMS menu item updated' })
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
  @RequirePermissions(Permission.CMS_UPDATE)
  async updateMenuItem(@Param('id') id: string, @Body() updateCmsMenuItemDto: UpdateCmsMenuItemDto) {
    return this.cmsService.updateMenuItem(id, updateCmsMenuItemDto);
  }

  @Delete('menu-items/:id')
  @ApiOperation({ summary: 'Delete CMS menu item' })
  @ApiResponse({ status: 200, description: 'CMS menu item deleted' })
  @AdminRoles('SUPER_ADMIN')
  @RequirePermissions(Permission.CMS_DELETE)
  async deleteMenuItem(@Param('id') id: string) {
    return this.cmsService.deleteMenuItem(id);
  }
}