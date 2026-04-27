import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class MediaService {
  private readonly s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  private readonly bucket = process.env.R2_BUCKET_NAME!;
  private readonly publicUrl = process.env.R2_PUBLIC_URL!;

  async presign(filename: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string }> {
    const ext = extname(filename) || '';
    const key = `products/${randomUUID()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    return { uploadUrl, publicUrl: `${this.publicUrl}/${key}` };
  }
}
