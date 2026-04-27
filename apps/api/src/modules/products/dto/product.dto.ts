import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ProductCondition } from '@jotek/types';

export class CreateVariantDto {
  @IsString() @IsNotEmpty() sku: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() colorHex?: string;
  @IsOptional() @IsString() storage?: string;
  @IsOptional() @IsString() ram?: string;
  @IsNotEmpty() price: string;
  @IsOptional() compareAtPrice?: string;
  @IsOptional() weightKg?: string;
  @IsBoolean() @IsOptional() isDefault?: boolean;
  @IsOptional() @IsInt() @Min(0) stockQuantity?: number;
}

export class CreateImageDto {
  @IsString() @IsNotEmpty() url: string;
  @IsOptional() @IsString() altText?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class CreateProductDto {
  @ApiProperty() @IsString() @IsNotEmpty() @Length(1, 100) sku: string;
  @ApiProperty() @IsString() @IsNotEmpty() @Length(1, 255) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shortDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() brandId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(['NEW', 'REFURBISHED', 'OPEN_BOX']) condition?: ProductCondition;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) warrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 70) metaTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 160) metaDescription?: string;
  @ApiProperty({ type: [CreateVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];

  @ApiPropertyOptional({ type: [CreateImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateImageDto)
  images?: CreateImageDto[];
}

export class UpdateProductDto extends CreateProductDto {}

export class ProductListQueryDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() minPrice?: number;
  @IsOptional() maxPrice?: number;
  @IsOptional() @IsEnum(['NEW', 'REFURBISHED', 'OPEN_BOX']) condition?: ProductCondition;
  @IsOptional() @IsBoolean() inStockOnly?: boolean;
  @IsOptional() @IsString() sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular' | 'rating';
  @IsOptional() @Min(1) page?: number = 1;
  @IsOptional() @Min(1) @Max(100) limit?: number = 24;
  @IsOptional() @IsBoolean() includeInactive?: boolean;
}
