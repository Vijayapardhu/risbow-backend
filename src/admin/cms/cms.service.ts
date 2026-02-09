import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCmsPageDto, UpdateCmsPageDto, CreateCmsMenuDto, UpdateCmsMenuDto, CreateCmsMenuItemDto, UpdateCmsMenuItemDto } from './dto';

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService) {}

  // CMS Pages
  async getAllPages(page: number, limit: number, search?: string, isActive?: boolean) {
    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [pages, total] = await Promise.all([
      this.prisma.cMSPage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cMSPage.count({ where }),
    ]);

    return {
      data: pages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPageById(id: string) {
    return this.prisma.cMSPage.findUnique({
      where: { id },
    });
  }

  async createPage(dto: CreateCmsPageDto) {
    return this.prisma.cMSPage.create({
      data: {
        id: randomUUID(),
        ...dto,
        createdBy: dto.createdBy || 'system',
      },
    });
  }

  async updatePage(id: string, dto: UpdateCmsPageDto) {
    return this.prisma.cMSPage.update({
      where: { id },
      data: dto,
    });
  }

  async deletePage(id: string) {
    return this.prisma.cMSPage.delete({
      where: { id },
    });
  }

  // CMS Menus
  async getAllMenus(location?: string, isActive?: boolean) {
    const where: any = {};
    
    if (location) {
      where.location = location;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.cMSMenu.findMany({
      where,
      include: {
        CMSMenuItem: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMenuById(id: string) {
    return this.prisma.cMSMenu.findUnique({
      where: { id },
      include: {
        CMSMenuItem: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async createMenu(dto: CreateCmsMenuDto) {
    return this.prisma.cMSMenu.create({
      data: {
        id: randomUUID(),
        ...dto,
      },
    });
  }

  async updateMenu(id: string, dto: UpdateCmsMenuDto) {
    return this.prisma.cMSMenu.update({
      where: { id },
      data: dto,
    });
  }

  async deleteMenu(id: string) {
    return this.prisma.cMSMenu.delete({
      where: { id },
    });
  }

  // CMS Menu Items
  async getAllMenuItems(menuId?: string, parentId?: string) {
    const where: any = {};
    
    if (menuId) {
      where.menuId = menuId;
    }
    
    if (parentId) {
      where.parentId = parentId;
    }

    return this.prisma.cMSMenuItem.findMany({
      where,
      include: {
        CMSMenu: true,
        other_CMSMenuItem: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getMenuItemById(id: string) {
    return this.prisma.cMSMenuItem.findUnique({
      where: { id },
      include: {
        CMSMenu: true,
        CMSMenuItem: true, // child items
      },
    });
  }

  async createMenuItem(dto: CreateCmsMenuItemDto) {
    return this.prisma.cMSMenuItem.create({
      data: {
        id: randomUUID(),
        ...dto,
      },
    });
  }

  async updateMenuItem(id: string, dto: UpdateCmsMenuItemDto) {
    return this.prisma.cMSMenuItem.update({
      where: { id },
      data: dto,
    });
  }

  async deleteMenuItem(id: string) {
    return this.prisma.cMSMenuItem.delete({
      where: { id },
    });
  }
}