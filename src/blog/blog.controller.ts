import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreatePostDto, UpdatePostDto } from './dto/create-post.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin/auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from '../admin/auth/guards/admin-permissions.guard';
import { AdminRoles } from '../admin/auth/decorators/admin-roles.decorator';
import { AdminRole, PostStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Admin Controller
@Controller('admin/blog')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
export class AdminBlogController {
  constructor(private readonly blogService: BlogService) {}

  // Categories
  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.blogService.createCategory(dto);
  }

  @Get('categories')
  findAllCategories(@Query() query: { isActive?: boolean; parentId?: string }) {
    return this.blogService.findAllCategories(query);
  }

  @Get('categories/:id')
  findCategoryById(@Param('id') id: string) {
    return this.blogService.findAllCategories({}).then(cats => {
      const cat = cats.find(c => c.id === id);
      if (!cat) throw new Error('Category not found');
      return cat;
    });
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.blogService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.blogService.deleteCategory(id);
  }

  // Posts
  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  createPost(@Body() dto: CreatePostDto, @CurrentUser('id') authorId: string) {
    return this.blogService.createPost(dto, authorId);
  }

  @Get('posts')
  findAllPosts(@Query() query: {
    page?: number;
    limit?: number;
    status?: PostStatus;
    categoryId?: string;
    search?: string;
  }) {
    return this.blogService.findAllPosts(query);
  }

  @Get('posts/stats')
  getStats() {
    return this.blogService.getStats();
  }

  @Get('posts/:id')
  findPostById(@Param('id') id: string) {
    return this.blogService.findPostById(id);
  }

  @Patch('posts/:id')
  updatePost(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.blogService.updatePost(id, dto);
  }

  @Delete('posts/:id')
  deletePost(@Param('id') id: string) {
    return this.blogService.deletePost(id);
  }
}

// Public Blog Controller
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get('posts')
  findPublishedPosts(@Query() query: {
    page?: number;
    limit?: number;
    categoryId?: string;
    isFeatured?: boolean;
    search?: string;
  }) {
    return this.blogService.findPublishedPosts(query);
  }

  @Get('posts/:slug')
  findPostBySlug(@Param('slug') slug: string) {
    return this.blogService.findPostBySlug(slug);
  }

  @Get('categories')
  findAllCategories() {
    return this.blogService.findAllCategories({ isActive: true });
  }

  @Get('categories/:slug')
  findCategoryBySlug(@Param('slug') slug: string) {
    return this.blogService.findCategoryBySlug(slug);
  }
}
