import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import {
  CreateVendorProductDto,
  UpdateVendorProductDto,
  UpdateStockDto,
  VendorProductQueryDto,
} from './dto/vendor-product.dto';
import { Prisma, ProductVisibility } from '@prisma/client';

@Injectable()
export class VendorProductsService {
  constructor(private prisma: PrismaService) {}

  async create(vendorId: string, dto: CreateVendorProductDto) {
    // Check SKU limit
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { skuLimit: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const productCount = await this.prisma.product.count({
      where: { vendorId, isActive: true },
    });

    if (productCount >= vendor.skuLimit) {
      throw new BadRequestException(
        `SKU limit reached. Maximum allowed: ${vendor.skuLimit}`,
      );
    }

    // Check SKU uniqueness if provided
    if (dto.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: { sku: dto.sku },
      });
      if (existingSku) {
        throw new BadRequestException('SKU already exists');
      }
    }

    const product = await this.prisma.product.create({
      data: {
        id: randomUUID(),
        vendorId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        offerPrice: dto.offerPrice,
        stock: dto.stock,
        categoryId: dto.categoryId,
        images: dto.images || [],
        sku: dto.sku,
        brandName: dto.brandName,
        isWholesale: dto.isWholesale ?? false,
        wholesalePrice: dto.wholesalePrice,
        moq: dto.moq ?? 1,
        costPrice: dto.costPrice,
        weight: dto.weight,
        weightUnit: dto.weightUnit ?? 'kg',
        length: dto.length,
        width: dto.width,
        height: dto.height,
        dimensionUnit: dto.dimensionUnit ?? 'cm',
        tags: dto.tags || [],
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        metaKeywords: dto.metaKeywords || [],
        visibility: dto.visibility ?? ProductVisibility.DRAFT,
        isReturnable: dto.isReturnable ?? false,
        isCancelable: dto.isCancelable ?? false,
        totalAllowedQuantity: dto.totalAllowedQuantity ?? 10,
        minOrderQuantity: dto.minOrderQuantity ?? 1,
        quantityStepSize: dto.quantityStepSize ?? 1,
        basePreparationTime: dto.basePreparationTime ?? 0,
        attributes: dto.attributes ?? {},
        storageInstructions: dto.storageInstructions,
        allergenInformation: dto.allergenInformation,
        expiryDate: dto.expiryDate,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return product;
  }

  async findAll(vendorId: string, query: VendorProductQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      visibility,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      vendorId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { brandName: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(visibility && { visibility }),
      ...(isActive !== undefined && { isActive }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          Category: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(vendorId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        Category: {
          select: { id: true, name: true },
        },
        ProductVariant: true,
        ProductSpecValue: {
          include: {
            CategorySpec: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenException('Product does not belong to this vendor');
    }

    return product;
  }

  async update(vendorId: string, productId: string, dto: UpdateVendorProductDto) {
    const product = await this.verifyOwnership(vendorId, productId);

    // Check SKU uniqueness if updating
    if (dto.sku && dto.sku !== product.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: { sku: dto.sku },
      });
      if (existingSku) {
        throw new BadRequestException('SKU already exists');
      }
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  async softDelete(vendorId: string, productId: string) {
    await this.verifyOwnership(vendorId, productId);

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        isActive: false,
        visibility: ProductVisibility.DRAFT,
        updatedAt: new Date(),
      },
    });

    return { message: 'Product deactivated successfully', product: updated };
  }

  async updateStock(vendorId: string, productId: string, dto: UpdateStockDto) {
    await this.verifyOwnership(vendorId, productId);

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        stock: dto.stock,
        updatedAt: new Date(),
      },
    });

    return { message: 'Stock updated successfully', stock: updated.stock };
  }

  private async verifyOwnership(vendorId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenException('Product does not belong to this vendor');
    }

    return product;
  }
}
