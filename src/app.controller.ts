import {
  Controller,
  Get,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { createReadStream } from 'fs';
import { join } from 'path';
import { Response } from 'express';
import { Readable } from 'stream';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('status')
  @ApiOperation({ summary: 'Health check', description: 'Returns basic runtime information about the running server.' })
  @ApiOkResponse({
    description: 'Server is up and running.',
    schema: {
      example: {
        ok: true,
        message: 'Server is running',
        appName: process.env.APP_NAME || 'Application',
        version: process.env.npm_package_version || '1.0.0',
        env: process.env.NODE_ENV || 'development',
        uptimeSec: 3600,
      },
    },
  })
  getApiStatus() {
    return {
      ok: true,
      message: 'Server is running',
      appName: process.env.APP_NAME || 'Application',
      version: process.env.npm_package_version || '1.0.0',
      env: process.env.NODE_ENV || 'development',
      uptimeSec: Math.floor(process.uptime()),
    };
  }

  @Get('test-chunk-stream')
  @ApiOperation({ summary: '[Test] Chunked streaming', description: 'Streams 10 text chunks using chunked transfer encoding. For development/testing only.' })
  @ApiProduces('text/plain')
  @ApiOkResponse({ description: 'A series of newline-delimited text chunks streamed to the client.' })
  async chunkStream(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();

    const stream = new Readable({ read() {} });
    stream.pipe(res);

    let counter = 0;
    const interval = setInterval(() => {
      if (counter >= 10) {
        stream.push('Stream complete.\n');
        stream.push(null);
        clearInterval(interval);
      } else {
        stream.push(`Chunk ${counter + 1} at ${new Date().toISOString()}\n`);
        counter++;
      }
    }, 500);
  }

  @Get('test-file-stream')
  @ApiOperation({ summary: '[Test] File download stream', description: 'Streams package.json as a downloadable file. For development/testing only.' })
  @ApiProduces('application/json')
  @ApiOkResponse({ description: 'Returns package.json as a file attachment.' })
  testFileStream(@Res({ passthrough: true }) res: Response) {
    const file = createReadStream(join(process.cwd(), 'package.json'));
    return new StreamableFile(file, {
      type: 'application/json',
      disposition: 'attachment; filename="package.json"',
    });
  }

  @Post('test-file-upload')
  @UseInterceptors(
    FileInterceptor('image', { storage: multer.memoryStorage() as any }),
  )
  @ApiOperation({ summary: '[Test] File upload', description: 'Accepts an image file upload and stores it. For development/testing only.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'File uploaded successfully.',
    schema: {
      example: {
        success: true,
        message: 'Image uploaded successfully',
        data: {},
        url: 'https://cdn.example.com/file.jpg',
      },
    },
  })
  async test(@UploadedFile() image?: Express.Multer.File) {
    if (!image) {
      return { success: false, message: 'No file provided. Send a file using the "image" field.' };
    }
    try {
      return await this.appService.test(image);
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message ?? 'Upload failed',
      };
    }
  }
}
