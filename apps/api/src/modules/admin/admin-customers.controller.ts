import { Controller, Get, Param, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '@core/auth/guards/admin.guard';
import { DatabaseService } from '@core/database/database.service';
import { eq, desc, sql, and, or } from 'drizzle-orm';

@ApiTags('admin')
@Controller('admin/customers')
@UseGuards(AdminGuard)
export class AdminCustomersController {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }
  private get s() {
    return this.database.schema;
  }

  @Get()
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 25,
    @Query('q') q?: string,
  ) {
    const offset = (Number(page) - 1) * Number(limit);

    const baseWhere = eq(this.s.user.role, 'user');
    const searchWhere = q
      ? and(
          baseWhere,
          or(
            sql`${this.s.user.email} ILIKE ${'%' + q + '%'}`,
            sql`${this.s.user.name} ILIKE ${'%' + q + '%'}`,
          ),
        )
      : baseWhere;

    const [data, [{ count }]] = await Promise.all([
      this.db.query.user.findMany({
        where: searchWhere,
        orderBy: [desc(this.s.user.createdAt)],
        limit: Number(limit),
        offset,
        columns: { id: true, name: true, email: true, phoneNumber: true, createdAt: true, banned: true },
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(this.s.user)
        .where(searchWhere),
    ]);

    return { data, total: Number(count) };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.db.query.user.findFirst({
      where: eq(this.s.user.id, id),
    });
  }

  @Patch(':id/ban')
  async ban(@Param('id') id: string, @Body() body: { banned: boolean; reason?: string }) {
    await this.db
      .update(this.s.user)
      .set({ banned: body.banned, banReason: body.reason ?? null })
      .where(eq(this.s.user.id, id));
    return { success: true };
  }
}
