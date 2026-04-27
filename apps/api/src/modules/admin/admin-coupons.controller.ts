import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '@core/auth/guards/admin.guard';
import { DatabaseService } from '@core/database/database.service';
import { desc, eq } from 'drizzle-orm';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

class CreateCouponDto {
  @IsString() code: string;
  @IsEnum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']) type: string;
  @IsNumber() value: number;
  @IsNumber() @IsOptional() maxDiscountAmount?: number;
  @IsNumber() @IsOptional() usageLimit?: number;
  @IsNumber() @IsOptional() minOrderAmount?: number;
  @IsDateString() @IsOptional() expiresAt?: string;
}

@ApiTags('admin')
@Controller('admin/coupons')
@UseGuards(AdminGuard)
export class AdminCouponsController {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }
  private get s() {
    return this.database.schema;
  }

  @Get()
  async findAll() {
    const data = await this.db.query.coupons.findMany({
      orderBy: [desc(this.s.coupons.createdAt)],
    });
    return {
      data: data.map((c) => ({
        id: c.id,
        code: c.code,
        type: c.type,
        value: parseFloat(c.value),
        maxDiscountAmount: c.maxDiscountAmount ? parseFloat(c.maxDiscountAmount) : null,
        usageCount: c.usedCount,
        usageLimit: c.maxUses ?? null,
        minOrderAmount: c.minOrderAmount ? parseFloat(c.minOrderAmount) : null,
        isActive: c.isActive,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
      })),
    };
  }

  @Post()
  async create(@Body() dto: CreateCouponDto) {
    const [coupon] = await this.db
      .insert(this.s.coupons)
      .values({
        code: dto.code.toUpperCase(),
        type: dto.type as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING',
        value: String(dto.value),
        maxDiscountAmount: dto.maxDiscountAmount ? String(dto.maxDiscountAmount) : null,
        maxUses: dto.usageLimit ?? null,
        minOrderAmount: dto.minOrderAmount ? String(dto.minOrderAmount) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      })
      .returning();
    return coupon;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<CreateCouponDto> & { isActive?: boolean }) {
    const patch: Record<string, unknown> = {};
    if (body.isActive !== undefined) patch.isActive = body.isActive;
    if (body.expiresAt !== undefined) patch.expiresAt = new Date(body.expiresAt);
    if (body.usageLimit !== undefined) patch.maxUses = body.usageLimit;

    const [updated] = await this.db
      .update(this.s.coupons)
      .set(patch)
      .where(eq(this.s.coupons.id, id))
      .returning();
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.db.delete(this.s.coupons).where(eq(this.s.coupons.id, id));
    return { success: true };
  }
}
