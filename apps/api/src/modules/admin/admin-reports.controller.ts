import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminReportsService } from './admin-reports.service';
import { AdminGuard } from '@core/auth/guards/admin.guard';
import { Roles } from '@core/auth/decorators/roles.decorator';

@ApiTags('admin')
@Controller('admin/reports')
@UseGuards(AdminGuard)
@Roles('super_admin', 'manager')
export class AdminReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  @Get('stats')
  stats() {
    return this.reportsService.getDashboardStats();
  }

  @Get('sales')
  sales(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    // Accept either explicit startDate/endDate or a period shorthand like "30d"
    let start: Date;
    let end: Date = new Date();

    if (startDate) {
      start = new Date(startDate);
    } else if (period) {
      const days = parseInt(period, 10);
      start = new Date(end.getTime() - days * 86_400_000);
    } else {
      start = new Date(end.getTime() - 30 * 86_400_000);
    }

    if (endDate) end = new Date(endDate);

    return this.reportsService.getSalesReport(start, end, groupBy);
  }

  @Get('top-products')
  topProducts(@Query('limit') limit?: number) {
    return this.reportsService.getTopProducts(limit ?? 10);
  }
}
