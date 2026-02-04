import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto, UpdatePostDto } from './dto/create-post.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
import { PostStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(private prisma: PrismaService) {}

  // Category Methods
  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prisma.blogCategory.findUnique({
      where: { slug: dto.slug }
    });

    if (existing) {
      throw new ConflictException('Category with this slug already exists');
    }

    return this.prisma.blogCategory.create({
      data: {
        id: randomUUID(),
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        image: dto.image,
        parentId: dto.parentId,
        sortOrder: dto.sortOrder || 0
      }
    });
  }

  async findAllCategories(query: { isActive?: boolean; parentId?: string }) {
    const where: Prisma.BlogCategoryWhereInput = {};
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.parentId) where.parentId = query.parentId;

    return this.prisma.blogCategory.findMany({
      where,
      include: {
        _count: { select: { BlogPost: true } },
        other_BlogCategory: true
      },
      orderBy: { sortOrder: 'asc' }
    });
  }

  async findCategoryBySlug(slug: string) {
    const category = await this.prisma.blogCategory.findUnique({
      where: { slug },
      include: {
        BlogPost: {
          where: { status: PostStatus.PUBLISHED },
          select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, publishedAt: true }
        }
      }
    });

    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.blogCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    return this.prisma.blogCategory.update({
      where: { id },
      data: dto
    });
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.blogCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    await this.prisma.blogCategory.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }

  // Post Methods
  async createPost(dto: CreatePostDto, authorId: string) {
    const existing = await this.prisma.blogPost.findUnique({
      where: { slug: dto.slug }
    });

    if (existing) {
      throw new ConflictException('Post with this slug already exists');
    }

    const publishedAt = dto.status === PostStatus.PUBLISHED ? new Date() : null;

    return this.prisma.blogPost.create({
      data: {
        id: randomUUID(),
        slug: dto.slug,
        title: dto.title,
        excerpt: dto.excerpt,
        content: dto.content,
        coverImage: dto.coverImage,
        BlogCategory: dto.categoryId ? { connect: { id: dto.categoryId } } : undefined,
        Admin: { connect: { id: authorId } },
        tags: dto.tags || [],
        status: dto.status || PostStatus.DRAFT,
        isFeatured: dto.isFeatured || false,
        publishedAt,
        seoTitle: dto.seoTitle,
        seoDesc: dto.seoDesc,
        updatedAt: new Date()
      },
      include: {
        BlogCategory: { select: { id: true, name: true, slug: true } },
        Admin: { select: { id: true, name: true, email: true } }
      }
    });
  }

  async findAllPosts(query: {
    page?: number;
    limit?: number;
    status?: PostStatus;
    categoryId?: string;
    isFeatured?: boolean;
    search?: string;
    authorId?: string;
  }) {
    const { page = 1, limit = 10, status, categoryId, isFeatured, search, authorId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostWhereInput = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    if (authorId) where.authorId = authorId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          BlogCategory: { select: { id: true, name: true, slug: true } },
          Admin: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findPublishedPosts(query: {
    page?: number;
    limit?: number;
    categoryId?: string;
    isFeatured?: boolean;
    search?: string;
  }) {
    return this.findAllPosts({ ...query, status: PostStatus.PUBLISHED });
  }

  async findPostBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: {
        BlogCategory: true,
        Admin: { select: { id: true, name: true, email: true } }
      }
    });

    if (!post || post.status !== PostStatus.PUBLISHED) {
      throw new NotFoundException('Post not found');
    }

    // Increment view count
    await this.prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } }
    });

    return post;
  }

  async findPostById(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: {
        BlogCategory: true,
        Admin: { select: { id: true, name: true, email: true } }
      }
    });

    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async updatePost(id: string, dto: UpdatePostDto) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');

    const updateData: Prisma.BlogPostUpdateInput = { ...dto };

    // If publishing for the first time, set publishedAt
    if (dto.status === PostStatus.PUBLISHED && post.status !== PostStatus.PUBLISHED) {
      updateData.publishedAt = new Date();
    }

    return this.prisma.blogPost.update({
      where: { id },
      data: updateData,
      include: {
        BlogCategory: { select: { id: true, name: true, slug: true } },
        Admin: { select: { id: true, name: true, email: true } }
      }
    });
  }

  async deletePost(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');

    await this.prisma.blogPost.delete({ where: { id } });
    return { message: 'Post deleted successfully' };
  }

  async getStats() {
    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      totalCategories,
      totalViews
    ] = await Promise.all([
      this.prisma.blogPost.count(),
      this.prisma.blogPost.count({ where: { status: PostStatus.PUBLISHED } }),
      this.prisma.blogPost.count({ where: { status: PostStatus.DRAFT } }),
      this.prisma.blogCategory.count(),
      this.prisma.blogPost.aggregate({ _sum: { viewCount: true } })
    ]);

    return {
      totalPosts,
      publishedPosts,
      draftPosts,
      totalCategories,
      totalViews: totalViews._sum.viewCount || 0
    };
  }
}
