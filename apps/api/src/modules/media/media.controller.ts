import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { AdminGuard } from '@core/auth/guards/admin.guard';

@ApiTags('media')
@Controller('media')
@UseGuards(AdminGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('presign')
  presign(@Body() body: { filename: string; contentType: string }) {
    return this.media.presign(body.filename, body.contentType);
  }
}
