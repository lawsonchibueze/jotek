import { Injectable } from '@nestjs/common';
import { db, type Db } from './db';
import * as schema from './schema';

export { schema };

@Injectable()
export class DatabaseService {
  readonly db: Db = db;

  get schema() {
    return schema;
  }
}
