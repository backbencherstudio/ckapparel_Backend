import { NestFactory } from '@nestjs/core';
// Load .env into process.env early so bootstrap config functions (appConfig) see them
import 'dotenv/config';
import { Logger, ValidationPipe, RequestMethod } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';
import appConfig from './config/app.config';
import { CustomExceptionFilter } from './common/exception/custom-exception.filter';
import { SazedStorage } from './common/lib/Disk/SazedStorage';
import { writeFileSync } from 'fs';
import { HttpStatusValidationInterceptor } from './common/interceptor/http-status-validation.interceptor';

const bootstrapLogger = new Logger('Bootstrap');

function getAppProfileFromEnv() {
  const appName = process.env.APP_NAME || 'Application';
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development';
  const appUrl = process.env.APP_URL || null;
  const clientUrl = process.env.CLIENT_APP_URL || null;
  const appVersion = process.env.APP_VERSION || process.env.npm_package_version || null;

  const developerName =
    process.env.APP_DEVELOPER_NAME ||
    process.env.DEVELOPER_NAME ||
    process.env.AUTHOR_NAME ||
    null;
  const developerEmail =
    process.env.APP_DEVELOPER_EMAIL ||
    process.env.DEVELOPER_EMAIL ||
    process.env.AUTHOR_EMAIL ||
    null;
  const companyName = process.env.APP_COMPANY || process.env.COMPANY_NAME || null;

  return {
    appName,
    appEnv,
    appUrl,
    clientUrl,
    appVersion,
    developerName,
    developerEmail,
    companyName,
  };
}

function logProfessionalAppProfile(port: number) {
  const profile = getAppProfileFromEnv();

  const lines = [
    `Application : ${profile.appName}`,
    `Environment : ${profile.appEnv}`,
    `API URL     : ${profile.appUrl || `http://localhost:${port}`}`,
    `Client URL  : ${profile.clientUrl || 'not set'}`,
    `Version     : ${profile.appVersion || 'not set'}`,
    `Company     : ${profile.companyName || 'not set'}`,
    `Developer   : ${profile.developerName || 'not set'}`,
    `Contact     : ${profile.developerEmail || 'not set'}`,
  ];

  bootstrapLogger.log('----------------------------------------');
  lines.forEach((line) => bootstrapLogger.log(line));
  bootstrapLogger.log('----------------------------------------');
}

async function bootstrap() {
  // Auto-detect storage driver: prefer MinIO/AWS S3 when env vars are present.
  const fileSystems: any = appConfig().fileSystems || {};
  const s3Cfg: any = fileSystems.s3 || {};

  const envMinioEndpoint =
    process.env.MINIO_ENDPOINT || process.env.AWS_S3_ENDPOINT || null;
  const envMinioBucket =
    process.env.MINIO_BUCKET || process.env.AWS_S3_BUCKET || null;
  const envMinioAccess =
    process.env.MINIO_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || null;
  const envMinioSecret =
    process.env.MINIO_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || null;

  // Masked log helper
  const mask = (v: string | null | undefined) =>
    v ? (v.length > 6 ? `${v.slice(0, 3)}***${v.slice(-3)}` : '***') : null;
  try {
    console.log('Storage env detection:', {
      AWS_S3_ENDPOINT: mask(process.env.AWS_S3_ENDPOINT),
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || null,
      MINIO_ENDPOINT: mask(process.env.MINIO_ENDPOINT),
    });
  } catch (err) {}

  if (envMinioEndpoint && envMinioBucket && envMinioAccess && envMinioSecret) {
    // use MinIO / S3 from env
    SazedStorage.config({
      driver: 's3',
      connection: {
        rootUrl: appConfig().storageUrl.rootUrl,
        publicUrl: appConfig().storageUrl.rootUrlPublic,
        awsBucket: envMinioBucket,
        awsAccessKeyId: envMinioAccess,
        awsSecretAccessKey: envMinioSecret,
        awsDefaultRegion: process.env.AWS_REGION || s3Cfg.region || 'us-east-1',
        awsEndpoint: envMinioEndpoint,
        minio: true,
      },
    });
  } else if ((process.env.STORAGE_DRIVER || '').toLowerCase() === 's3') {
    // explicit driver selection via STORAGE_DRIVER
    SazedStorage.config({
      driver: 's3',
      connection: {
        rootUrl: appConfig().storageUrl.rootUrl,
        publicUrl: appConfig().storageUrl.rootUrlPublic,
        awsBucket: s3Cfg.bucket,
        awsAccessKeyId: s3Cfg.key,
        awsSecretAccessKey: s3Cfg.secret,
        awsDefaultRegion: s3Cfg.region,
        awsEndpoint: s3Cfg.endpoint,
        minio: !!s3Cfg.forcePathStyle,
      },
    });
  } else {
    // fallback to local
    SazedStorage.config({
      driver: 'local',
      connection: {
        rootUrl: appConfig().storageUrl.rootUrl,
        publicUrl: appConfig().storageUrl.rootUrlPublic,
      },
    });
  }

  // Diagnostic: print effective config (masked) so we can verify at startup
  try {
    const cfg = SazedStorage.getConfig();
    if (cfg) {
      if (cfg.driver === 's3') {
        console.log('SazedStorage effective config:', {
          driver: 's3',
          endpoint: mask((cfg.connection as any).awsEndpoint),
          bucket: (cfg.connection as any).awsBucket,
        });
      } else {
        console.log('SazedStorage effective config:', {
          driver: cfg.driver,
          rootUrl: (cfg.connection as any).rootUrl,
        });
      }
    }
  } catch (err) {}

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Handle raw body for webhooks
  app.use('/payment/stripe/webhook', express.raw({ type: 'application/json' }));

  app.setGlobalPrefix('api', {
    exclude: [
      { path: '/', method: RequestMethod.GET },
      { path: '/subscription/success', method: RequestMethod.GET },
      { path: '/subscription/cancel', method: RequestMethod.GET },
    ],
  });
  app.enableCors();
  app.use(helmet());
  // Enable it, if special charactrers not encoding perfectly
  // app.use((req, res, next) => {
  //   // Only force content-type for specific API routes, not Swagger or assets
  //   if (req.path.startsWith('/api') && !req.path.startsWith('/api/docs')) {
  //     res.setHeader('Content-Type', 'application/json; charset=utf-8');
  //   }
  //   next();
  // });
  app.useStaticAssets(join(__dirname, '..', 'public', 'site'), {
    index: ['index.html'],
    redirect: false,
  });

  app.useStaticAssets(join(__dirname, '..', 'public/storage'), {
    index: false,
    prefix: '/storage',
  });

  app.useStaticAssets(join(__dirname, '..', 'public/storage'), {
    index: false,
    prefix: '/public/storage',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new HttpStatusValidationInterceptor());
  app.useGlobalFilters(new CustomExceptionFilter());

  // swagger
  const profile = getAppProfileFromEnv();
  const swaggerDescriptionParts = [
    `${profile.appName} API documentation`,
    profile.companyName ? `Company: ${profile.companyName}` : null,
    profile.developerName ? `Maintainer: ${profile.developerName}` : null,
    profile.developerEmail ? `Contact: ${profile.developerEmail}` : null,
  ].filter(Boolean);

  const options = new DocumentBuilder()
    .setTitle(`${profile.appName} API`)
    .setDescription(swaggerDescriptionParts.join(' | '))
    .setVersion(profile.appVersion || '1.0')
    .addTag(profile.appName)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);

  writeFileSync('./openapi.json', JSON.stringify(document, null, 2));
 SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  // end swagger

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  logProfessionalAppProfile(port);
}
bootstrap();
