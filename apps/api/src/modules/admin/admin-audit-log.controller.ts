import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '@core/auth/guards/admin.guard';
import { AdminAuditService } from './admin-audit.service';

@ApiTags('admin')
@Controller('admin/audit-log')
@UseGuards(AdminGuard)
export class AdminAuditLogController {
  constructor(private readonly auditService: AdminAuditService) {}

  @Get()
  findAll(@Query('page') page = 1, @Query('limit') limit = 30) {
    return this.auditService.findAll(Number(page), Number(limit));
  }
}
