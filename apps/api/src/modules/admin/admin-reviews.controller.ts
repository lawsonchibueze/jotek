import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '@core/auth/guards/admin.guard';
import { DatabaseService } from '@core/database/database.service';
import { desc, eq, sql } from 'drizzle-orm';

@ApiTags('admin')
@Controller('admin/reviews')
@UseGuards(AdminGuard)
export class AdminReviewsController {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db; }
  private get s() { return this.database.schema; }

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 30,
  ) {
    const offset = (Number(page) - 1) * Number(limit);

    const where =
      status === 'pending'
        ? eq(this.s.reviews.isApproved, false)
        : status === 'approved'
          ? eq(this.s.reviews.isApproved, true)
          : undefined;

    const [data, [{ count }]] = await Promise.all([
      this.db.query.reviews.findMany({
        where,
        with: {
          user: { columns: { id: true, name: true, email: true } },
          product: { columns: { id: true, name: true, slug: true } },
        },
        orderBy: [desc(this.s.reviews.createdAt)],
        limit: Number(limit),
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(this.s.reviews)
        .where(where),
    ]);

    return { data, total: Number(count) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { isApproved: boolean }) {
    const [updated] = await this.db
      .update(this.s.reviews)
      .set({ isApproved: body.isApproved })
      .where(eq(this.s.reviews.id, id))
      .returning();
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.db.delete(this.s.reviews).where(eq(this.s.reviews.id, id));
    return { success: true };
  }
}
