import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { DatabaseService } from '@core/database/database.service';
import { auth } from '@core/auth/auth';
import { fromNodeHeaders } from 'better-auth/node';
import { desc, sql } from 'drizzle-orm';

@Injectable()
export class AdminAuditService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }
  private get s() {
    return this.database.schema;
  }

  async log(req: Request, action: string, entityType: string, entityId?: string) {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    await this.db.insert(this.s.auditLogs).values({
      adminUserId: session?.user?.id ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      ipAddress: (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  async findAll(page = 1, limit = 30) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.db.query.auditLogs.findMany({
        with: { adminUser: { columns: { id: true, email: true, name: true } } },
        orderBy: [desc(this.s.auditLogs.createdAt)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(this.s.auditLogs)
        .then(([r]) => Number(r.count)),
    ]);
    return {
      data: data.map((e) => ({
        id: e.id,
        action: e.action,
        entity: e.entityType,
        entityId: e.entityId,
        adminEmail: e.adminUser?.email ?? 'system',
        ip: e.ipAddress ?? '—',
        createdAt: e.createdAt,
      })),
      total,
    };
  }
}
