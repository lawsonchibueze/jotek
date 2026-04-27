import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { JobsWorker } from './jobs.worker';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { SearchModule } from '@modules/search/search.module';

@Global()
@Module({
  imports: [NotificationsModule, SearchModule],
  providers: [QueueService, JobsWorker],
  exports: [QueueService],
})
export class QueueModule {}
