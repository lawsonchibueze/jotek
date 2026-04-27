import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './core/database/database.service';
import { RedisService } from './core/redis/redis.service';
import { sql } from 'drizzle-orm';

@Controller('health')
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    const checks = { db: 'ok', redis: 'ok', status: 'ok' };

    try {
      await this.db.db.execute(sql`SELECT 1`);
    } catch {
      checks.db = 'error';
      checks.status = 'degraded';
    }

    try {
      await this.redis.client.ping();
    } catch {
      checks.redis = 'error';
      checks.status = 'degraded';
    }

    return {
      ...checks,
      version: process.env.npm_package_version || '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}
