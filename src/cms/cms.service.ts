import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto, UpdatePageDto } from './dto/create-page.dto';
import { CreateMenuDto, UpdateMenuDto, CreateMenuItemDto } from './dto/create-menu.dto';
import { MenuLocation, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class CmsService {
  private readonly logger = new Logger(CmsService.name);

  constructor(private prisma: PrismaService) {}

  // Page Methods
  async createPage(dto: CreatePageDto, createdBy: string) {
    const existing = await this.prisma.cMSPage.findUnique({
      where: { slug: dto.slug }
    });

    if (existing) {
      throw new ConflictException('Page with this slug already exists');
    }

    return this.prisma.cMSPage.create({
      data: {
        id: randomUUID(),
        slug: dto.slug,
        title: dto.title,
        content: dto.content,
        excerpt: dto.excerpt,
        metaTitle: dto.metaTitle,
        metaDesc: dto.metaDesc,
        featuredImage: dto.featuredImage,
        template: dto.template || 'default',
        sortOrder: dto.sortOrder || 0,
        createdBy,
        updatedAt: new Date()
      }
    });
  }

  async findAllPages(query: { page?: number; limit?: number; isActive?: boolean; search?: string }) {
    const { page = 1, limit = 10, isActive, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CMSPageWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.cMSPage.count({ where }),
      this.prisma.cMSPage.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { sortOrder: 'asc' }
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

  async findPageBySlug(slug: string) {
    const page = await this.prisma.cMSPage.findUnique({
      where: { slug }
    });

    if (!page || !page.isActive) {
      throw new NotFoundException('Page not found');
    }

    return page;
  }

  async findPageById(id: string) {
    const page = await this.prisma.cMSPage.findUnique({
      where: { id }
    });

    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async updatePage(id: string, dto: UpdatePageDto) {
    const page = await this.prisma.cMSPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');

    return this.prisma.cMSPage.update({
      where: { id },
      data: dto
    });
  }

  async deletePage(id: string) {
    const page = await this.prisma.cMSPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');

    await this.prisma.cMSPage.delete({ where: { id } });
    return { message: 'Page deleted successfully' };
  }

  // Menu Methods
  async createMenu(dto: CreateMenuDto) {
    const existing = await this.prisma.cMSMenu.findUnique({
      where: { name: dto.name }
    });

    if (existing) {
      throw new ConflictException('Menu with this name already exists');
    }

    return this.prisma.cMSMenu.create({
      data: {
        id: randomUUID(),
        name: dto.name,
        location: dto.location,
        updatedAt: new Date(),
        CMSMenuItem: {
          create: dto.items.map((item, index) => ({
            id: randomUUID(),
            label: item.label,
            url: item.url,
            icon: item.icon,
            target: item.target || '_self',
            sortOrder: item.sortOrder ?? index,
            isActive: true
          }))
        }
      },
      include: { CMSMenuItem: true }
    });
  }

  async findAllMenus(query: { location?: MenuLocation; isActive?: boolean }) {
    const where: Prisma.CMSMenuWhereInput = {};
    if (query.location) where.location = query.location;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return this.prisma.cMSMenu.findMany({
      where,
      include: {
        CMSMenuItem: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findMenuByLocation(location: MenuLocation) {
    const menu = await this.prisma.cMSMenu.findFirst({
      where: { location, isActive: true },
      include: {
        CMSMenuItem: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!menu) throw new NotFoundException('Menu not found for this location');
    return menu;
  }

  async updateMenu(id: string, dto: UpdateMenuDto) {
    const menu = await this.prisma.cMSMenu.findUnique({ where: { id } });
    if (!menu) throw new NotFoundException('Menu not found');

    return this.prisma.cMSMenu.update({
      where: { id },
      data: dto
    });
  }

  async deleteMenu(id: string) {
    const menu = await this.prisma.cMSMenu.findUnique({ where: { id } });
    if (!menu) throw new NotFoundException('Menu not found');

    await this.prisma.cMSMenu.delete({ where: { id } });
    return { message: 'Menu deleted successfully' };
  }

  // Menu Item Methods
  async addMenuItem(menuId: string, dto: CreateMenuItemDto) {
    const menu = await this.prisma.cMSMenu.findUnique({ where: { id: menuId } });
    if (!menu) throw new NotFoundException('Menu not found');

    return this.prisma.cMSMenuItem.create({
      data: {
        id: randomUUID(),
        menuId,
        label: dto.label,
        url: dto.url,
        icon: dto.icon,
        target: dto.target || '_self',
        parentId: dto.parentId,
        sortOrder: dto.sortOrder || 0
      }
    });
  }

  async updateMenuItem(id: string, dto: Partial<CreateMenuItemDto>) {
    const item = await this.prisma.cMSMenuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');

    return this.prisma.cMSMenuItem.update({
      where: { id },
      data: dto
    });
  }

  async deleteMenuItem(id: string) {
    const item = await this.prisma.cMSMenuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');

    await this.prisma.cMSMenuItem.delete({ where: { id } });
    return { message: 'Menu item deleted successfully' };
  }
}
