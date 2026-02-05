import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import {
  CreateProductVariantDto,
  UpdateProductVariantDto,
  BulkCreateVariantsDto,
  ProductVariantQueryDto,
} from './dto/vendor-product-variant.dto';
import { VariationStatus } from '@prisma/client';

@Injectable()
export class VendorProductVariantsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verify product ownership
   */
  private async verifyProductOwnership(
    productId: string,
    vendorId: string,
  ): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { vendorId: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenException('You do not own this product');
    }
  }

  /**
   * Get all variants for a product
   */
  async findAll(
    productId: string,
    vendorId: string,
    query: ProductVariantQueryDto,
  ) {
    await this.verifyProductOwnership(productId, vendorId);

    const { page = 1, limit = 20, isActive, lowStock } = query;
    const skip = (page - 1) * limit;

    const where: any = { productId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (lowStock !== undefined) {
      where.stock = { lt: lowStock };
    }

    const [variants, total] = await Promise.all([
      this.prisma.productVariant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productVariant.count({ where }),
    ]);

    return {
      data: variants,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new variant
   */
  async create(
    productId: string,
    vendorId: string,
    dto: CreateProductVariantDto,
  ) {
    await this.verifyProductOwnership(productId, vendorId);

    // Check SKU uniqueness if provided
    if (dto.sku) {
      const existingSku = await this.prisma.productVariant.findUnique({
        where: { sku: dto.sku },
      });
      if (existingSku) {
        throw new BadRequestException('SKU already exists');
      }
    }

    // Validate offer price
    if (dto.offerPrice && dto.price && dto.offerPrice > dto.price) {
      throw new BadRequestException('Offer price cannot exceed regular price');
    }

    // Ensure at least one image
    if (!dto.images || dto.images.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    const variant = await this.prisma.productVariant.create({
      data: {
        id: randomUUID(),
        productId,
        name: dto.name,
        sku: dto.sku,
        attributes: dto.attributes,
        price: dto.price,
        offerPrice: dto.offerPrice,
        stock: dto.stock,
        images: dto.images,
        isActive: dto.isActive ?? true,
        status: VariationStatus.ACTIVE,
        updatedAt: new Date(),
      },
    });

    // Update product hasVariants flag
    await this.prisma.product.update({
      where: { id: productId },
      data: { hasVariants: true },
    });

    return variant;
  }

  /**
   * Bulk create variants
   */
  async bulkCreate(
    productId: string,
    vendorId: string,
    dto: BulkCreateVariantsDto,
  ) {
    await this.verifyProductOwnership(productId, vendorId);

    // Validate all SKUs are unique
    const skus = dto.variants.filter((v) => v.sku).map((v) => v.sku);
    if (skus.length > 0) {
      const existingSkus = await this.prisma.productVariant.findMany({
        where: { sku: { in: skus } },
        select: { sku: true },
      });

      if (existingSkus.length > 0) {
        throw new BadRequestException(
          `SKUs already exist: ${existingSkus.map((s) => s.sku).join(', ')}`,
        );
      }
    }

    // Validate offer prices
    for (const variant of dto.variants) {
      if (
        variant.offerPrice &&
        variant.price &&
        variant.offerPrice > variant.price
      ) {
        throw new BadRequestException(
          `Offer price cannot exceed regular price for variant: ${JSON.stringify(variant.attributes)}`,
        );
      }

      // Ensure at least one image
      if (!variant.images || variant.images.length === 0) {
        throw new BadRequestException(
          `At least one image is required for variant: ${JSON.stringify(variant.attributes)}`,
        );
      }
    }

    const variants = await Promise.all(
      dto.variants.map((variantDto) =>
        this.prisma.productVariant.create({
          data: {
            id: randomUUID(),
            productId,
            name: variantDto.name,
            sku: variantDto.sku,
            attributes: variantDto.attributes,
            price: variantDto.price,
            offerPrice: variantDto.offerPrice,
            stock: variantDto.stock,
            images: variantDto.images,
            isActive: variantDto.isActive ?? true,
            status: VariationStatus.ACTIVE,
            updatedAt: new Date(),
          },
        }),
      ),
    );

    // Update product hasVariants flag
    await this.prisma.product.update({
      where: { id: productId },
      data: { hasVariants: true },
    });

    return { created: variants.length, variants };
  }

  /**
   * Update a variant
   */
  async update(
    productId: string,
    variantId: string,
    vendorId: string,
    dto: UpdateProductVariantDto,
  ) {
    await this.verifyProductOwnership(productId, vendorId);

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    // Check SKU uniqueness if updating SKU
    if (dto.sku && dto.sku !== variant.sku) {
      const existingSku = await this.prisma.productVariant.findUnique({
        where: { sku: dto.sku },
      });
      if (existingSku) {
        throw new BadRequestException('SKU already exists');
      }
    }

    // Validate offer price
    const finalPrice = dto.price ?? variant.price;
    const finalOfferPrice = dto.offerPrice ?? variant.offerPrice;
    if (finalOfferPrice && finalPrice && finalOfferPrice > finalPrice) {
      throw new BadRequestException('Offer price cannot exceed regular price');
    }

    // Validate images
    const finalImages = dto.images ?? variant.images;
    if (finalImages.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Delete a variant
   */
  async delete(productId: string, variantId: string, vendorId: string) {
    await this.verifyProductOwnership(productId, vendorId);

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    await this.prisma.productVariant.delete({
      where: { id: variantId },
    });

    // Check if product still has variants
    const remainingVariants = await this.prisma.productVariant.count({
      where: { productId },
    });

    if (remainingVariants === 0) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { hasVariants: false },
      });
    }

    return { message: 'Variant deleted successfully' };
  }

  /**
   * Get variant by ID
   */
  async findOne(productId: string, variantId: string, vendorId: string) {
    await this.verifyProductOwnership(productId, vendorId);

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    return variant;
  }
}
