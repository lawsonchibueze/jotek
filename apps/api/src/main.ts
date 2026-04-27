import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { auth } from './core/auth/auth';
import { toNodeHandler } from 'better-auth/node';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for Paystack webhook HMAC verification
  });

  // ── Security ──────────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: [
      process.env.STOREFRONT_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // ── Better Auth — mount BEFORE NestJS routing ─────────────────────────────
  // Better Auth handles all /api/auth/* routes directly via Express middleware.
  // Express 5 / path-to-regexp 8 requires named splat: `*splat`, not bare `*`.
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.all('/api/auth/*splat', toNodeHandler(auth));

  // ── Validation ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── API Prefix ────────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Swagger (dev + staging only) ─────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Jotek API')
      .setDescription('Jotek e-commerce platform REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth')
      .addTag('products')
      .addTag('categories')
      .addTag('brands')
      .addTag('cart')
      .addTag('orders')
      .addTag('payments')
      .addTag('account')
      .addTag('admin')
      .addTag('webhooks')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Jotek API running on port ${port}`);
  console.log(`Better Auth endpoints: /api/auth/*`);
  console.log(`REST API: /api/v1/*`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger: http://localhost:${port}/docs`);
  }
}

bootstrap();
